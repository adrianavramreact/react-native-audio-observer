# Limitations

Known platform limits of `react-native-audio-observer`. See `docs/DESIGN.md` for how each event is detected.

## iOS

- **No `mediaPlayback` on iOS.** iOS can't see your own app's audio, so this event is Android only. Use `otherAudio` ([ADR-004](docs/adr/004-other-audio-vs-media-playback.md)).
- **iOS can keep the current audio output after another accessory connects.** In a device test, wired headphones remained active after Bluetooth headphones reconnected. `audioRoute` reflects the outputs active in the audio session. While media is playing, use **Control Center → Playback Destination** to check or change the active output. [Apple's playback destination guide](https://support.apple.com/guide/iphone/play-audio-iphone-a-bluetooth-accessory-iph01b6ea9a3/ios)
- **Call audio support depends on the headphones and adapter.** In device tests, some third-party accessories supported media playback only. Apple AirPods support iPhone calls. [AirPods calls](https://support.apple.com/guide/airpods/devac96438de/web)
- **`otherAudio` updates only when the app comes back on screen.** The module never activates the audio session, so iOS sends no notice when another app starts or stops. The value is read with [`isOtherAudioPlaying`](https://developer.apple.com/documentation/avfaudio/avaudiosession/isotheraudioplaying) each time the app becomes active. To check at any moment, use `isOtherAudioPlayingAsync()`.
- **`call` changes made while the app is suspended are sent when it runs again.** This works like Apple's [queued notifications](https://developer.apple.com/documentation/uikit/processing-queued-notifications): delivery waits while the app is suspended, then `call` reports only the latest state, if it changed.

## Android

- **No `otherAudio` on Android.** Android can't tell which app is playing, so this event is iOS only. Use `mediaPlayback` ([ADR-004](docs/adr/004-other-audio-vs-media-playback.md)).
- **Below API 31: no `call` events.** The mode listener ([`addOnModeChangedListener`](https://developer.android.com/reference/android/media/AudioManager#addOnModeChangedListener(java.util.concurrent.Executor,%20android.media.AudioManager.OnModeChangedListener))) needs API 31. `isInCallAsync()` rejects with code `ERR_UNSUPPORTED`.
- **Below API 26: no `mediaPlayback` events.** [`AudioPlaybackCallback`](https://developer.android.com/reference/android/media/AudioManager.AudioPlaybackCallback) and [`getActivePlaybackConfigurations`](https://developer.android.com/reference/android/media/AudioManager#getActivePlaybackConfigurations()) need API 26. `isMediaPlaybackActiveAsync()` rejects with code `ERR_UNSUPPORTED`.
- **Below API 33: no `audioRoute` events.** [`getAudioDevicesForAttributes`](https://developer.android.com/reference/android/media/AudioManager#getAudioDevicesForAttributes(android.media.AudioAttributes)) needs API 33. `getAudioRoutesAsync()` rejects with code `ERR_UNSUPPORTED`.
- **During a phone or video call, `audioRoute` reports the call route.** Otherwise it reports the media route. Both come from `getAudioDevicesForAttributes`, with `USAGE_VOICE_COMMUNICATION` during a call and `USAGE_MEDIA` otherwise.
- **`call` covers ringing, cellular and VoIP calls.** Call screening (`MODE_CALL_SCREENING`) and calls moved to another device (`MODE_CALL_REDIRECT`, `MODE_COMMUNICATION_REDIRECT`) are not reported yet. They can be added in a future release, or earlier on request.

## Both platforms

- The module does not say **which app** is playing or calling, and does not distinguish GSM from VoIP calls.
- **`audioRoute` names only `bluetooth`, `wired` and `speaker`.** Any other output, such as AirPlay or HDMI, is reported as `unknown`.
- **`audioRoute` reports device types, not single devices.** Switching between two Bluetooth devices keeps the same route, so no new event is sent.
