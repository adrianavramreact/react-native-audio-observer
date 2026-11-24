package com.audioobserver
import android.annotation.SuppressLint
import android.media.AudioAttributes
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.AudioPlaybackConfiguration
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WindowFocusChangeListener
import java.util.concurrent.Executor
class AudioObserverModule(reactContext: ReactApplicationContext) :
  NativeAudioObserverSpec(reactContext) {
  private val audioManager by lazy {
    reactApplicationContext.getSystemService(AudioManager::class.java)
  }

  // One background thread: calls from JS and system callbacks run here one at a time,
  // so the UI thread stays free and the saved state is only read and written on this thread.
  private val thread = HandlerThread("com.audioobserver").apply { start() }
  private val handler = Handler(thread.looper)
  private val executor = Executor { handler.post(it) }
  // Set first in invalidate(). Callbacks already queued still run after it, so they check it before emitting.
  @Volatile private var invalidated = false

  private var lastMediaPlayback = false
  // Lazy because AudioPlaybackCallback needs API 26 and minSdk is 24: creating it
  // with the module would crash on API 24-25. DeviceCallback needs only API 23.
  @delegate:RequiresApi(Build.VERSION_CODES.O)
  private val playbackCallback by lazy {
    PlaybackCallback()
  }

  private var lastCall = "none"
  private var modeListener: AudioManager.OnModeChangedListener? = null

  private var lastRoutes = listOf<String>()
  private var routeModeListener: AudioManager.OnModeChangedListener? = null
  private var communicationDeviceListener: AudioManager.OnCommunicationDeviceChangedListener? = null
  private var focusListener: WindowFocusChangeListener? = null
  private val mediaAttributes = AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_MEDIA)
    .build()
  private val callAttributes = AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
    .build()
  private val deviceCallback = DeviceCallback()

  @RequiresApi(Build.VERSION_CODES.O)
  inner class PlaybackCallback : AudioManager.AudioPlaybackCallback() {
    override fun onPlaybackConfigChanged(configs: List<AudioPlaybackConfiguration>) {
      onPlayersChanged(configs)
    }
  }

  @RequiresApi(Build.VERSION_CODES.O)
  private fun isMediaPlaybackActive(configs: List<AudioPlaybackConfiguration>): Boolean =
    configs.any { isMediaPlayback(it.audioAttributes.usage, it.audioAttributes.contentType) }

  @RequiresApi(Build.VERSION_CODES.O)
  private fun onPlayersChanged(configs: List<AudioPlaybackConfiguration>) {
    if (invalidated) return
    val mediaPlayback = isMediaPlaybackActive(configs)
    if (mediaPlayback != lastMediaPlayback) {
      lastMediaPlayback = mediaPlayback
      emitOnMediaPlayback(if (mediaPlayback) "started" else "stopped")
    }
  }

  @RequiresApi(Build.VERSION_CODES.O)
  private fun startMediaPlayback() {
    audioManager.registerAudioPlaybackCallback(playbackCallback, handler)
    lastMediaPlayback = isMediaPlaybackActive(audioManager.activePlaybackConfigurations)
  }

  @RequiresApi(Build.VERSION_CODES.O)
  private fun stopMediaPlayback() {
    audioManager.unregisterAudioPlaybackCallback(playbackCallback)
  }

  private fun onModeChanged(mode: Int) {
    if (invalidated) return
    val call = callFromMode(mode) ?: return
    if (call == lastCall) return
    lastCall = call
    emitOnCall(if (call == "none") "ended" else call)
  }

  @RequiresApi(Build.VERSION_CODES.S)
  private fun startCall() {
    if (modeListener != null) return
    val listener = AudioManager.OnModeChangedListener { mode ->
      onModeChanged(mode)
    }
    audioManager.addOnModeChangedListener(executor, listener)
    modeListener = listener
    lastCall = callFromMode(audioManager.mode) ?: "none"
  }

  @RequiresApi(Build.VERSION_CODES.S)
  private fun stopCall() {
    modeListener?.let { audioManager.removeOnModeChangedListener(it) }
    modeListener = null
  }

  // Added and removed only report the difference, so both read the full list again.
  inner class DeviceCallback : AudioDeviceCallback() {
    override fun onAudioDevicesAdded(addedDevices: Array<AudioDeviceInfo>) {
      onRoutesChanged()
    }

    override fun onAudioDevicesRemoved(removedDevices: Array<AudioDeviceInfo>) {
      onRoutesChanged()
    }
  }

  // Devices sound would play on now, not every connected output: the call route during
  // a phone or video call, the media route otherwise.
  // API level is checked by isEventSupported before each call.
  @SuppressLint("NewApi")
  private fun currentRoutes(): List<String> {
    val inCall = callFromMode(audioManager.mode) == "connected"
    val attributes = if (inCall) callAttributes else mediaAttributes
    return routesFromDeviceTypes(audioManager.getAudioDevicesForAttributes(attributes).map { it.type })
  }

  private fun onRoutesChanged() {
    if (invalidated) return
    val routes = currentRoutes()
    if (routes == lastRoutes) return
    lastRoutes = routes
    val event = Arguments.createMap()
    event.putArray("routes", Arguments.fromList(routes))
    emitOnAudioRoute(event)
  }

  // Save the current list before registering: a change in between still arrives,
  // because registering calls onAudioDevicesAdded with the connected devices.
  // Each listener reads the route again:
  // - AudioDeviceCallback: a device connects or disconnects.
  // - OnModeChangedListener: call/media route switch.
  // - OnCommunicationDeviceChangedListener: the output changes during a call (for example speaker).
  // - WindowFocusChangeListener: the app is back on screen, like didBecomeActive on iOS.
  //   Android has no public listener for a media output switch, so it is caught here.
  @RequiresApi(Build.VERSION_CODES.TIRAMISU)
  private fun startAudioRoute() {
    if (routeModeListener != null) return
    lastRoutes = currentRoutes()
    audioManager.registerAudioDeviceCallback(deviceCallback, handler)
    val listener = AudioManager.OnModeChangedListener { onRoutesChanged() }
    audioManager.addOnModeChangedListener(executor, listener)
    routeModeListener = listener
    val deviceListener = AudioManager.OnCommunicationDeviceChangedListener { onRoutesChanged() }
    audioManager.addOnCommunicationDeviceChangedListener(executor, deviceListener)
    communicationDeviceListener = deviceListener
    val focus = object : WindowFocusChangeListener {
      override fun onWindowFocusChange(hasFocus: Boolean) {
        if (hasFocus) handler.post { onRoutesChanged() }
      }
    }
    reactApplicationContext.addWindowFocusChangeListener(focus)
    focusListener = focus
  }

  @RequiresApi(Build.VERSION_CODES.TIRAMISU)
  private fun stopAudioRoute() {
    audioManager.unregisterAudioDeviceCallback(deviceCallback)
    routeModeListener?.let { audioManager.removeOnModeChangedListener(it) }
    routeModeListener = null
    communicationDeviceListener?.let { audioManager.removeOnCommunicationDeviceChangedListener(it) }
    communicationDeviceListener = null
    focusListener?.let { reactApplicationContext.removeWindowFocusChangeListener(it) }
    focusListener = null
  }

  // Stops every observer when React Native tears the module down (for example on reload).
  // https://github.com/react/react-native/blob/main/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/interfaces/TurboModule.kt#L15
  override fun invalidate() {
    invalidated = true
    handler.post {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) stopMediaPlayback()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) stopCall()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) stopAudioRoute()
    }
    thread.quitSafely()
    super.invalidate()
  }

  // API levels are checked by isEventSupported before each call.
  @SuppressLint("NewApi")
  override fun startObservingAsync(event: String, promise: Promise) {
    if (!isEventSupported(event, Build.VERSION.SDK_INT)) {
      promise.reject("ERR_UNSUPPORTED", "$event is not supported on this device")
      return
    }
    handler.post {
      try {
        when (event) {
          EVENT_MEDIA_PLAYBACK -> startMediaPlayback()
          EVENT_CALL -> startCall()
          EVENT_AUDIO_ROUTE -> startAudioRoute()
        }
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("ERR_START_OBSERVING", "Could not start observing $event", e)
      }
    }
  }

  @SuppressLint("NewApi")
  override fun stopObservingAsync(event: String, promise: Promise) {
    if (!isEventSupported(event, Build.VERSION.SDK_INT)) {
      promise.resolve(null)
      return
    }
    handler.post {
      try {
        when (event) {
          EVENT_MEDIA_PLAYBACK -> stopMediaPlayback()
          EVENT_CALL -> stopCall()
          EVENT_AUDIO_ROUTE -> stopAudioRoute()
        }
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("ERR_STOP_OBSERVING", "Could not stop observing $event", e)
      }
    }
  }

  override fun isAvailableAsync(event: String, promise: Promise) {
    promise.resolve(isEventSupported(event, Build.VERSION.SDK_INT))
  }

  override fun isInCallAsync(promise: Promise) {
    if (!isEventSupported(EVENT_CALL, Build.VERSION.SDK_INT)) {
      promise.reject("ERR_UNSUPPORTED", "isInCallAsync requires Android API 31+")
      return
    }
    handler.post {
      try {
        promise.resolve(callFromMode(audioManager.mode) == "connected")
      } catch (e: Exception) {
        promise.reject("ERR_IS_IN_CALL", "Could not read the call state", e)
      }
    }
  }

  // Only reads; it does not change lastRoutes, so it never affects events.
  override fun getAudioRoutesAsync(promise: Promise) {
    if (!isEventSupported(EVENT_AUDIO_ROUTE, Build.VERSION.SDK_INT)) {
      promise.reject("ERR_UNSUPPORTED", "getAudioRoutesAsync requires Android API 33+")
      return
    }
    handler.post {
      try {
        promise.resolve(Arguments.fromList(currentRoutes()))
      } catch (e: Exception) {
        promise.reject("ERR_GET_AUDIO_ROUTES", "Could not read the audio routes", e)
      }
    }
  }

  @SuppressLint("NewApi")
  override fun isMediaPlaybackActiveAsync(promise: Promise) {
    if (!isEventSupported(EVENT_MEDIA_PLAYBACK, Build.VERSION.SDK_INT)) {
      promise.reject("ERR_UNSUPPORTED", "isMediaPlaybackActiveAsync requires Android API 26+")
      return
    }
    handler.post {
      try {
        promise.resolve(isMediaPlaybackActive(audioManager.activePlaybackConfigurations))
      } catch (e: Exception) {
        promise.reject("ERR_IS_MEDIA_PLAYBACK_ACTIVE", "Could not read the media playback state", e)
      }
    }
  }

  // In the current setup (no permissions), Android cannot tell which app is playing, so "other app" audio is iOS only.
  override fun isOtherAudioPlayingAsync(promise: Promise) {
    promise.reject("ERR_UNSUPPORTED", "otherAudio is iOS only. Use mediaPlayback on Android.")
  }
  companion object {
    const val NAME = NativeAudioObserverSpec.NAME
  }
}
