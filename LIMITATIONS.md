# Limitations

Known platform limits of `react-native-system-interruptions`. See `docs/DESIGN.md` for how each event is detected.

## iOS

- **`otherAudio` updates only when the app comes back on screen.** The module never activates the audio session, so iOS sends no notice when another app starts or stops. The value is read with [`isOtherAudioPlaying`](https://developer.apple.com/documentation/avfaudio/avaudiosession/isotheraudioplaying) each time the app becomes active. To check at any moment, use `isOtherAudioPlayingAsync()`.
- **`call` in the background is not reliable.** iOS freezes the app soon after it leaves the screen, and while it is frozen events may not arrive. To know if there is a call right now, use `isInCallAsync()`.

## Android

- **Below API 31: no `call` events.** The mode listener ([`addOnModeChangedListener`](https://developer.android.com/reference/android/media/AudioManager#addOnModeChangedListener(java.util.concurrent.Executor,%20android.media.AudioManager.OnModeChangedListener))) needs API 31. `isInCallAsync()` rejects with code `ERR_UNSUPPORTED`.
- **Below API 26: no `mediaPlayback` events.** [`AudioPlaybackCallback`](https://developer.android.com/reference/android/media/AudioManager.AudioPlaybackCallback) and [`getActivePlaybackConfigurations`](https://developer.android.com/reference/android/media/AudioManager#getActivePlaybackConfigurations()) need API 26. `isMediaPlaybackActiveAsync()` rejects with code `ERR_UNSUPPORTED`.
- **Below API 33: no `audioRoute` events.** [`getAudioDevicesForAttributes`](https://developer.android.com/reference/android/media/AudioManager#getAudioDevicesForAttributes(android.media.AudioAttributes)) needs API 33. `getAudioRoutesAsync()` rejects with code `ERR_UNSUPPORTED`.
- **During a phone or video call, `audioRoute` reports the call route.** Otherwise it reports the media route.
- **`call` covers ringing, cellular and VoIP calls.** Call screening (`MODE_CALL_SCREENING`) and calls moved to another device (`MODE_CALL_REDIRECT`, `MODE_COMMUNICATION_REDIRECT`) are not reported yet. They can be added in a future release, or earlier on request.

## Both platforms

- The module does not say **which app** is playing or calling, and does not distinguish GSM from VoIP calls.
- **`audioRoute` names only `bluetooth`, `wired` and `speaker`.** Any other output, such as AirPlay or HDMI, is reported as `unknown`.
- **`audioRoute` reports device types, not single devices.** Switching between two Bluetooth devices keeps the same route, so no new event is sent.
