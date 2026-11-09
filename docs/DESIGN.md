# Design

`react-native-system-interruptions` is a TurboModule (iOS + Android) that **only observes** system interruptions and reports them to JS as a small set of normalized events.

## Public API

```ts
// Whether an event is supported on this device and OS version.
isAvailableAsync(event): Promise<boolean>

// Native observing starts with the first listener of an event and stops when the last one is removed.
// Call .remove() on the returned subscription to unsubscribe.
addListener('call', (e: CallEvent) => void): EventSubscription
addListener('audioRoute', (e: AudioRouteEvent) => void): EventSubscription
addListener('otherAudio', (e: OtherAudioEvent) => void): EventSubscription

// Current state, for the moment a screen mounts (listeners never send an initial value).
isInCallAsync(): Promise<boolean>
getAudioRoutesAsync(): Promise<AudioRoute[]>
isOtherAudioPlayingAsync(): Promise<boolean>

// React hook built on the above; cleans up on unmount.
useSystemInterruptions(): {
  call: CallState
  audioRoute: AudioRoute
  otherAudio: OtherAudioState
}
```

## Normalized events

| Event | Payload | iOS source | Android source |
|---|---|---|---|
| `call` | `'ringing' \| 'connected' \| 'ended'` | `CXCallObserver` | `AudioManager` mode: `RINGTONE` → ringing, `IN_CALL` / `IN_COMMUNICATION` → connected, back to `NORMAL` → ended |
| `audioRoute` | `{ routes: ('bluetooth' \| 'wired' \| 'speaker' \| 'unknown')[] }` | `AVAudioSession.routeChangeNotification` | `AudioDeviceCallback`, mode listener, `getAudioDevicesForAttributes` |
| `otherAudio` | `'started' \| 'stopped'` | `AVAudioSession.isOtherAudioPlaying`, foreground only | `AudioPlaybackCallback` |

Rules shared by all events:
- An event is sent **only when the normalized value changes**. Native callbacks fire many times for one user action (the spike saw 7 callbacks for one YouTube resume of a 10+ hour video), so the native side keeps the last value and drops repeats.
- Payloads stay minimal. No app names, player ids or device names.

### Android: `call`

- The **audio mode** is the primary source. In the spike it was correct for GSM (`RINGTONE` → `IN_CALL` → `NORMAL`) and for WhatsApp/Discord (`RINGTONE` → `IN_COMMUNICATION` → `NORMAL`).
- Active players are **not** used for `call`. The end-of-call tone is a short `VOICE_COMMUNICATION` player that appears *after* hang-up. One VoIP call can create several players (WhatsApp: ringtone, voice, short sounds).
- Mode listener (`addOnModeChangedListener`) needs API 31. Below API 31 no `call` events are sent; `isInCallAsync()` rejects with `ERR_UNSUPPORTED`.

### Android: API levels

| API | `audioRoute` events | `otherAudio` events | `call` events | `isOtherAudioPlayingAsync()` |
|---|---|---|---|---|
| 33+ | supported | supported | supported | supported |
| 31–32 | unsupported | supported | supported | supported |
| 26–30 | unsupported | supported | unsupported | supported |
| 24–25 | unsupported | unsupported | unsupported | unsupported |

### Android: `otherAudio`

`started` when at least one active player matches:
- `contentType` is `MUSIC`, `MOVIE` or `SPEECH`, and `usage` is not `VOICE_COMMUNICATION`; or
- `contentType` is `UNKNOWN` and `usage` is `MEDIA` (Spotify reports this).

Otherwise `stopped`. Notifications and UI sounds (`SONIFICATION`) are ignored.

### iOS: `otherAudio`

- **Foreground only.** In the background the app is suspended, and the `audio` background mode is only allowed for real playback (App Review 2.5.4).
- There is no notification without an active audio session, so the native side reads `isOtherAudioPlaying` when the app becomes active (`UIApplication.didBecomeActiveNotification`). Polling while in the foreground (e.g. music started from Control Center) is still undecided.
- To verify on a device: `isOtherAudioPlaying` is correct without an active session.

## What the module does not do

- Never requests audio focus and never activates the iOS audio session. It cannot pause or duck other apps.
- Never reads phone numbers, contacts or call logs (ADR-003).
- Never records or reads audio content.
- Does not say **which app** is playing or calling.
- Does not distinguish GSM from VoIP calls in the public API.
- Does not emit `otherAudio` on iOS while in the background.
- Collects and sends no data. Whatever the app does with the events is the app's responsibility.

## Open questions

- Should `call` expose `kind: 'cellular' | 'voip'`? Android can tell from the mode (`IN_CALL` vs `IN_COMMUNICATION`); iOS `CXCall` cannot.