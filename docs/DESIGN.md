# Design

`react-native-audio-observer` is a TurboModule (iOS + Android) that **only observes** calls and audio changes and reports them to JS as a small set of normalized events.

## Public API

```ts
// Whether an event is supported on this device and OS version.
isAvailableAsync(event): Promise<boolean>

// Native observing starts with the first listener of an event and stops when the last one is removed.
// Call .remove() on the returned subscription to unsubscribe.
addListener('call', (e: CallEvent) => void): EventSubscription
addListener('audioRoute', (e: AudioRouteEvent) => void): EventSubscription
addListener('otherAudio', (e: OtherAudioEvent) => void): EventSubscription       // iOS only
addListener('mediaPlayback', (e: MediaPlaybackEvent) => void): EventSubscription // Android only

// Optional: options.onError receives start/stop failures instead of the default console.warn.
addListener(eventName, listener, options?: { onError?: (error: unknown) => void }): EventSubscription

// Current state, for the moment a screen mounts (listeners never send an initial value).
isInCallAsync(): Promise<boolean>
getAudioRoutesAsync(): Promise<AudioRoute[]>
isOtherAudioPlayingAsync(): Promise<boolean>    // iOS only, rejects ERR_UNSUPPORTED on Android
isMediaPlaybackActiveAsync(): Promise<boolean>  // Android only, rejects ERR_UNSUPPORTED on iOS
```

In a component, call `addListener` in `useEffect` and `remove()` in its cleanup (see README). This is the same pattern as `AppState` and `Keyboard`.

### Native lifecycle

- Native observing runs only while an event has at least one listener.
- When React Native destroys the module (for example on reload), every native observer is removed: `invalidate()` on Android, `deinit` on iOS. Otherwise the old callbacks would stay registered and the new module would add its own on top.
  - **Why iOS has no `invalidate`.** Swift frees an object as soon as nothing holds a strong reference to it, and runs `deinit` right then ([ARC](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/), [Deinitialization](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/deinitialization/)). Our observers never keep the module alive: the `NotificationCenter` blocks use `[weak self]`, the `CXCallObserver` delegate is stored weakly (as the comment on [`setDelegate(_:queue:)`](<https://developer.apple.com/documentation/callkit/cxcallobserver/setdelegate(_:queue:)>) in `CallKit/CXCallObserver.h` says), and the callbacks in `RCTAudioObserver.mm` use `weakSelf`. So when React Native lets go of the module, `deinit` stops everything.
  - **Why Android needs it.** The JVM frees objects whenever its garbage collector runs, and `AudioManager` holds strong references to our callbacks, so the old module would never be freed on its own.
- Native work runs on one background thread, never on the UI thread: a serial queue on iOS (`com.audioobserver.queue`) and a `HandlerThread` on Android (`com.audioobserver`). System callbacks and the work behind JS calls run there one at a time, so the saved state is read and written in one place. JS calls arrive on a React Native thread (`v_native` on Android, the TurboModule queue on iOS); quick checks that only read the OS version, such as `isAvailableAsync`, answer there directly. The Android window focus callback is a system callback, so it runs on the UI thread ([Android docs](https://developer.android.com/guide/components/processes-and-threads#Threads)) and only posts the route check to the module thread.

## Normalized events

| Event           | Payload                                                            | iOS source                                                             | Android source                                                                                                                                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `call`          | `'ringing' \| 'connected' \| 'ended'`                              | `CXCallObserver`                                                       | `AudioManager` mode: `RINGTONE` → ringing, `IN_CALL` / `IN_COMMUNICATION` → connected, back to `NORMAL` → ended                                                                                                                                                                                            |
| `audioRoute`    | `{ routes: ('bluetooth' \| 'wired' \| 'speaker' \| 'unknown')[] }` | `AVAudioSession.routeChangeNotification`                               | `getAudioDevicesForAttributes`, read again by: `AudioDeviceCallback` (device added/removed), mode listener (call/media switch), `OnCommunicationDeviceChangedListener` (in-call output), `WindowFocusChangeListener` (back on screen: rechecks after a media output switch, which Android does not report) |
| `otherAudio`    | `'started' \| 'stopped'`                                           | `AVAudioSession.isOtherAudioPlaying`, read when the app becomes active | not available (ADR-004)                                                                                                                                                                                                                                                                                    |
| `mediaPlayback` | `'started' \| 'stopped'`                                           | not available (ADR-004)                                                | `AudioPlaybackCallback`                                                                                                                                                                                                                                                                                    |

Rules shared by all events:

- An event is sent **only when the normalized value changes**. Native callbacks fire many times for one user action (the spike saw 7 callbacks for one YouTube resume of a 10+ hour video), so the native side keeps the last value and drops repeats.
- Payloads stay minimal. No app names, player ids or device names.

### Android: `call`

- The **audio mode** is the primary source. In the spike it was correct for GSM (`RINGTONE` → `IN_CALL` → `NORMAL`) and for WhatsApp/Discord (`RINGTONE` → `IN_COMMUNICATION` → `NORMAL`).
- Active players ([`getActivePlaybackConfigurations`](<https://developer.android.com/reference/android/media/AudioManager#getActivePlaybackConfigurations()>)) are **not** used for `call`, because they give false signals: the end-of-call tone plays as a short `VOICE_COMMUNICATION` player _after_ hang-up, and a single VoIP call can create several players (WhatsApp: ringtone, voice, short sounds).
- Mode listener (`addOnModeChangedListener`) needs API 31. Below API 31 no `call` events are sent; `isInCallAsync()` rejects with `ERR_UNSUPPORTED`.

### Android: API levels

| API   | `audioRoute` events | `mediaPlayback` events | `call` events | `isMediaPlaybackActiveAsync()` |
| ----- | ------------------- | ---------------------- | ------------- | ------------------------------ |
| 33+   | supported           | supported              | supported     | supported                      |
| 31–32 | unsupported         | supported              | supported     | supported                      |
| 26–30 | unsupported         | supported              | unsupported   | supported                      |
| 24–25 | unsupported         | unsupported            | unsupported   | unsupported                    |

### Android: `mediaPlayback`

`started` when at least one active player matches:

- `contentType` is `MUSIC`, `MOVIE` or `SPEECH`, and `usage` is not `VOICE_COMMUNICATION`; or
- `contentType` is `UNKNOWN` and `usage` is `MEDIA` (Spotify reports this).

Otherwise `stopped`. Notifications and UI sounds (`SONIFICATION`) are ignored. Your app's own players count too: Android [reports every player on the device](<https://developer.android.com/reference/android/media/AudioManager#getActivePlaybackConfigurations()>) and does not say which app owns it.

### iOS: `audioRoute`

`getAudioRoutesAsync()` reads `AVAudioSession.currentRoute.outputs`. `audioRoute` fires only when the reported output types change. [Apple's audio route documentation](https://developer.apple.com/documentation/avfaudio/responding-to-audio-route-changes)

Route changes made while the app is suspended are not lost: in device tests, iOS delivered them when the app came back, the way it does for [queued notifications](https://developer.apple.com/documentation/uikit/processing-queued-notifications).

**Quick test on iPhone**

1. Open the example app. While media is playing, plug in or unplug wired headphones, or connect or disconnect Bluetooth headphones. Use **Control Center → Playback Destination** to check the active output. You can also switch to another available output there. [Apple's playback destination guide](https://support.apple.com/guide/iphone/play-audio-iphone-a-bluetooth-accessory-iph01b6ea9a3/ios)
2. Back in the example app, check the `audioRoute` history and tap **getAudioRoutes**.

`audioRoute` reports the output iOS is actually using, not the last accessory that connected. See [iOS limitations](../LIMITATIONS.md#ios).

### iOS: `otherAudio`

- **Foreground only.** In the background the app is suspended, and the `audio` background mode is only allowed for real playback (App Review 2.5.4).
- There is no notification without an active audio session, so the native side reads `isOtherAudioPlaying` when the app becomes active (`UIApplication.didBecomeActiveNotification`). There is no polling while the app stays on screen; use `isOtherAudioPlayingAsync()` to check at any moment.
- To verify on a device: `isOtherAudioPlaying` is correct without an active session.

## What the module does not do

- Never requests audio focus and never activates the iOS audio session. It cannot pause or duck other apps.
- Never reads phone numbers, contacts or call logs (ADR-002).
- Never records or reads audio content.
- Does not say **which app** is playing or calling. On Android, knowing which app is playing would require notification access, a permission the user must grant (ADR-004). On iOS, `isOtherAudioPlaying` only says whether another app is playing, and an active audio session would not change that. Calls report only their state (ADR-002).
- Does not distinguish GSM from VoIP calls in the public API. Android could tell from the mode (`IN_CALL` vs `IN_COMMUNICATION`), but iOS [`CXCall`](https://developer.apple.com/documentation/callkit/cxcall) does not say which kind a call is, so both platforms report the same `call` events.
- Does not emit any event on iOS while the app is suspended.
- Does not report `otherAudio` on Android or `mediaPlayback` on iOS (ADR-004).
- Collects and sends no data. Whatever the app does with the events is the app's responsibility.
