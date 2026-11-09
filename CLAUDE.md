# react-native-system-interruptions

TurboModule (iOS + Android) that **only observes** system interruptions. It never requests audio focus, never activates the iOS audio session, and never reads phone numbers or audio content.

- Events: `call` (ringing / connected / ended), `audioRoute` (bluetooth / wired / speaker), `otherAudio` (started / stopped).
- Use cases: media apps (pause/resume, debugging breadcrumbs), anti-fraud (active call during a transfer), online exams (call or headphones during the exam).

## Decisions already made
- MVP first: TurboModule, not Nitro or Expo Modules (ADR-001). Nitro may come later as a comparison branch/article.
- No Expo config plugin in the first release; the module needs no permissions (ADR-002).
- iOS `otherAudio` is foreground only (`isOtherAudioPlaying`); background is out of scope, document it in `LIMITATIONS.md`.
- The package collects no data. Privacy responsibility belongs to the app that sends events to a server (README "Privacy" section links Apple privacy manifest docs).

## Docs
- Repo docs: `docs/DESIGN.md`, `docs/adr/`, `LIMITATIONS.md`, `CHANGELOG.md`.
