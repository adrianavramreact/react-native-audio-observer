# ADR-002: Never read phone numbers, contacts or call logs

- Status: Accepted
- Date: 2026-10-09

## Context

The `call` event only needs to know that a call is ringing, connected or ended. Use cases (media pause/resume, anti-fraud, online exams) do not need to know who is calling.

- iOS: `CXCallObserver` exposes call state, not phone numbers.
- Android: `call` comes from the audio mode (`AudioManager.getMode()` / `OnModeChangedListener`), which needs no permission. Reading the number would need `READ_CALL_LOG`.

## Decision

The module never reads phone numbers, contacts or call logs, and never requests `READ_CALL_LOG` or `READ_CONTACTS`.

## Consequences

- Payloads stay minimal and contain no personal data.
- No sensitive permission is added by default, so store review and privacy disclosures stay simple for the app.
- The module cannot say who is calling or which app is calling.
