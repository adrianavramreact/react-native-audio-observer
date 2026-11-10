# ADR-006: `otherAudio` on iOS, `mediaPlayback` on Android

- Status: Accepted
- Date: 2026-11-09

## Decision

The two platforms report different audio signals, under different names:

- **iOS: `otherAudio`.** Another app is playing audio. Your app's own sound does not count. It updates when the app comes back on screen.
- **Android: `mediaPlayback`.** Any media is playing, your app's included. It updates live.

Each event exists on one platform only. `isAvailableAsync` returns `false` for the other one, and its getter rejects with `ERR_UNSUPPORTED`.

## Why

- iOS tells whether another app is playing ([`isOtherAudioPlaying`](https://developer.apple.com/documentation/avfaudio/avaudiosession/isotheraudioplaying)).
- Android lists the active players but not which app owns them ([`AudioPlaybackConfiguration`](https://developer.android.com/reference/android/media/AudioPlaybackConfiguration)). Telling apps apart needs notification access ([`MediaSessionManager.getActiveSessions`](https://developer.android.com/reference/android/media/session/MediaSessionManager#getActiveSessions(android.content.ComponentName))), and the module asks for no permissions (ADR-002).
- iOS has live updates too, but only for apps with an active audio session ([`silenceSecondaryAudioHintNotification`](https://developer.apple.com/documentation/avfaudio/avaudiosession/silencesecondaryaudiohintnotification)). The module only observes, so it never activates one. This keeps it safe to add to any app.
- Live updates on iOS are still easy to get: call `isOtherAudioPlayingAsync()` again from time to time while the app is on screen.
- One shared name would be wrong on one platform. Developers trust names more than docs, so each name must be true on its own.

## Revisit when

- A new Android version tells normal apps which app owns a player.
- Users ask for `otherAudio` on Android. Today the only public way to see which app is playing is `MediaSessionManager.getActiveSessions()`. Android allows it only for system apps (`MEDIA_CONTENT_CONTROL`) or for apps the user has given notification access in Settings ([docs](https://developer.android.com/reference/android/media/session/MediaSessionManager#getActiveSessions(android.content.ComponentName))). That is a permission the user must grant, so it would also mean revisiting ADR-002.
