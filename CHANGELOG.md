# Changelog

## 0.1.0 (2026-11-28)

Initial release.

### Features

- `call` on iOS and Android (API 31+): `ringing`, `connected`, `ended`.
- `audioRoute` on iOS and Android (API 33+): `bluetooth`, `wired`, `speaker`, `unknown`.
- `otherAudio` on iOS: another app starts or stops playing.
- `mediaPlayback` on Android (API 26+): media playback starts or stops.
- Read the current state once: `isInCallAsync()`, `getAudioRoutesAsync()`,
  `isOtherAudioPlayingAsync()` and `isMediaPlaybackActiveAsync()`.
- `isAvailableAsync(event)`, and an `onError` option on `addListener`.
- Observe only: no permissions, never takes audio focus or activates
  the iOS audio session.

See [LIMITATIONS.md](LIMITATIONS.md) for platform limits.
