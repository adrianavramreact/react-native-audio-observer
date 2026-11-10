package com.systeminterruptions
import android.annotation.SuppressLint
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build

internal const val EVENT_CALL = "call"
internal const val EVENT_MEDIA_PLAYBACK = "mediaPlayback"
internal const val EVENT_AUDIO_ROUTE = "audioRoute"

// Unknown event names are not supported.
internal fun isEventSupported(event: String, sdkInt: Int): Boolean = when (event) {
  EVENT_CALL -> sdkInt >= Build.VERSION_CODES.S
  EVENT_MEDIA_PLAYBACK -> sdkInt >= Build.VERSION_CODES.O
  EVENT_AUDIO_ROUTE -> sdkInt >= Build.VERSION_CODES.TIRAMISU
  else -> false
}

// TODO: handle screening and redirect modes. For now they are ignored, so NORMAL after them is not reported as "ended".
internal fun callFromMode(mode: Int): String? = when (mode) {
  AudioManager.MODE_RINGTONE -> "ringing"
  AudioManager.MODE_IN_CALL,
  AudioManager.MODE_IN_COMMUNICATION -> "connected"
  AudioManager.MODE_NORMAL -> "none"
  else -> null
}

// Newer TYPE_* constants are plain ints; on older devices they simply never match.
// Bluetooth, wired and speaker are named; any other type is reported as unknown.
@SuppressLint("InlinedApi")
internal fun routeFromDeviceType(type: Int): String = when (type) {
  AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
  AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
  AudioDeviceInfo.TYPE_BLE_HEADSET,
  AudioDeviceInfo.TYPE_BLE_SPEAKER,
  AudioDeviceInfo.TYPE_HEARING_AID -> "bluetooth"
  AudioDeviceInfo.TYPE_WIRED_HEADSET,
  AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
  AudioDeviceInfo.TYPE_USB_HEADSET,
  AudioDeviceInfo.TYPE_USB_DEVICE,
  AudioDeviceInfo.TYPE_USB_ACCESSORY,
  AudioDeviceInfo.TYPE_LINE_ANALOG,
  AudioDeviceInfo.TYPE_LINE_DIGITAL,
  AudioDeviceInfo.TYPE_AUX_LINE -> "wired"
  AudioDeviceInfo.TYPE_BUILTIN_SPEAKER,
  AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> "speaker"
  else -> "unknown"
}

// Sorted so two lists with the same routes are equal when compared.
internal fun routesFromDeviceTypes(types: List<Int>): List<String> =
  types.map { routeFromDeviceType(it) }.distinct().sorted()

internal fun isMediaPlayback(usage: Int, contentType: Int): Boolean {
  if (usage == AudioAttributes.USAGE_VOICE_COMMUNICATION) return false
  return when (contentType) {
    AudioAttributes.CONTENT_TYPE_MUSIC,
    AudioAttributes.CONTENT_TYPE_MOVIE,
    AudioAttributes.CONTENT_TYPE_SPEECH -> true
    AudioAttributes.CONTENT_TYPE_UNKNOWN -> usage == AudioAttributes.USAGE_MEDIA
    else -> false
  }
}
