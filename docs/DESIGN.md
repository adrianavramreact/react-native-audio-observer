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

// Current state, for the moment a screen mounts (listeners never send an initial value).
isInCallAsync(): Promise<boolean>
getAudioRoutesAsync(): Promise<AudioRoute[]>
isOtherAudioPlayingAsync(): Promise<boolean>    // iOS only, rejects ERR_UNSUPPORTED on Android
isMediaPlaybackActiveAsync(): Promise<boolean>  // Android only, rejects ERR_UNSUPPORTED on iOS
```

There is no React hook. In a component, call `addListener` in `useEffect` and `remove()` in its cleanup (see README). This is the same pattern as `AppState` and `Keyboard`, and it also works outside components.

### Native lifecycle

- Native observing runs only while an event has at least one listener.
- When React Native destroys the module (for example on reload), every native observer is removed: `invalidate()` on Android, `deinit` on iOS. Otherwise the old callbacks would stay registered and the new module would add its own on top.

## Normalized events

| Event | Payload | iOS source | Android source |
|---|---|---|---|
| `call` | `'ringing' \| 'connected' \| 'ended'` | `CXCallObserver` | `AudioManager` mode: `RINGTONE` → ringing, `IN_CALL` / `IN_COMMUNICATION` → connected, back to `NORMAL` → ended |
| `audioRoute` | `{ routes: ('bluetooth' \| 'wired' \| 'speaker' \| 'unknown')[] }` | `AVAudioSession.routeChangeNotification` | `getAudioDevicesForAttributes`, read again by: `AudioDeviceCallback` (device added/removed), mode listener (call/media switch), `OnCommunicationDeviceChangedListener` (in-call output), `WindowFocusChangeListener` (back on screen: rechecks after a media output switch, which Android does not report) |
| `otherAudio` | `'started' \| 'stopped'` | `AVAudioSession.isOtherAudioPlaying`, read when the app becomes active | not available (ADR-006) |
| `mediaPlayback` | `'started' \| 'stopped'` | not available (ADR-006) | `AudioPlaybackCallback` |

Rules shared by all events:
- An event is sent **only when the normalized value changes**. Native callbacks fire many times for one user action (the spike saw 7 callbacks for one YouTube resume of a 10+ hour video), so the native side keeps the last value and drops repeats.
- Payloads stay minimal. No app names, player ids or device names.

### Android: `call`

- The **audio mode** is the primary source. In the spike it was correct for GSM (`RINGTONE` → `IN_CALL` → `NORMAL`) and for WhatsApp/Discord (`RINGTONE` → `IN_COMMUNICATION` → `NORMAL`).
- Active players are **not** used for `call`. The end-of-call tone is a short `VOICE_COMMUNICATION` player that appears *after* hang-up. One VoIP call can create several players (WhatsApp: ringtone, voice, short sounds).
- Mode listener (`addOnModeChangedListener`) needs API 31. Below API 31 no `call` events are sent; `isInCallAsync()` rejects with `ERR_UNSUPPORTED`.

### Android: API levels

| API | `audioRoute` events | `mediaPlayback` events | `call` events | `isMediaPlaybackActiveAsync()` |
|---|---|---|---|---|
| 33+ | supported | supported | supported | supported |
| 31–32 | unsupported | supported | supported | supported |
| 26–30 | unsupported | supported | unsupported | supported |
| 24–25 | unsupported | unsupported | unsupported | unsupported |

### Android: `mediaPlayback`

`started` when at least one active player matches:
- `contentType` is `MUSIC`, `MOVIE` or `SPEECH`, and `usage` is not `VOICE_COMMUNICATION`; or
- `contentType` is `UNKNOWN` and `usage` is `MEDIA` (Spotify reports this).

Otherwise `stopped`. Notifications and UI sounds (`SONIFICATION`) are ignored. Your app's own players count too: Android does not say which app owns a player.

### iOS: `audioRoute`

`getAudioRoutesAsync()` reads `AVAudioSession.currentRoute.outputs`. `audioRoute` fires only when the reported output types change. [Apple's audio route documentation](https://developer.apple.com/documentation/avfaudio/responding-to-audio-route-changes)

**Quick test on iPhone**

1. Open the example app. While media is playing, plug in or unplug wired headphones, or connect or disconnect Bluetooth headphones. Use **Control Center → Playback Destination** to check the active output. You can also switch to another available output there. [Apple's playback destination guide](https://support.apple.com/guide/iphone/play-audio-iphone-a-bluetooth-accessory-iph01b6ea9a3/ios)
2. Back in the example app, check the `audioRoute` history and tap **getAudioRoutes**.

**What we saw on an iPhone.** YouTube audio moved from the speaker to Bluetooth, then to wired headphones. Reconnecting Bluetooth left the sound on the wired pair. In that case, expect `wired` and no new `audioRoute` event. The same pair was silent during a phone call. For call audio tests, use a headset with confirmed support, such as AirPods. [iOS limitations](../LIMITATIONS.md#ios)

### iOS: `otherAudio`

- **Foreground only.** In the background the app is suspended, and the `audio` background mode is only allowed for real playback (App Review 2.5.4).
- There is no notification without an active audio session, so the native side reads `isOtherAudioPlaying` when the app becomes active (`UIApplication.didBecomeActiveNotification`). There is no polling while the app stays on screen; use `isOtherAudioPlayingAsync()` to check at any moment.
- To verify on a device: `isOtherAudioPlaying` is correct without an active session.

## What the module does not do

- Never requests audio focus and never activates the iOS audio session. It cannot pause or duck other apps.
- Never reads phone numbers, contacts or call logs (ADR-003).
- Never records or reads audio content.
- Does not say **which app** is playing or calling.
- Does not distinguish GSM from VoIP calls in the public API. Android could tell from the mode (`IN_CALL` vs `IN_COMMUNICATION`), but iOS [`CXCall`](https://developer.apple.com/documentation/callkit/cxcall) does not say which kind a call is, so both platforms report the same `call` events.
- Does not emit `otherAudio` on iOS while in the background.
- Does not report `otherAudio` on Android or `mediaPlayback` on iOS (ADR-006).
- Collects and sends no data. Whatever the app does with the events is the app's responsibility.
