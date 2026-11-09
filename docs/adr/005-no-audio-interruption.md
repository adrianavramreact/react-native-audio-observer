# ADR-005: No `audioInterruption` event

- Status: Accepted
- Date: 2026-11-09
- Supersedes: ADR-004

## Decision

The module does not report audio interruptions. The `audioInterruption` event is removed.

## Why

- ADR-004 removed only `shouldResume`, but the same problem applies to the whole event. From iOS 27, Apple replaces the interruption notification, its `began` / `ended` types and `shouldResume` with new notifications ([Handling audio interruptions](https://developer.apple.com/documentation/avfaudio/handling-audio-interruptions)). Supporting it means two code paths, one for iOS 26 and older and one for iOS 27 and later.
- Testing needs a real iPhone. Once the test device moves to iOS 27, it cannot go back to iOS 26, so a bug on iOS 26 could no longer be checked.
- The event was iOS only. Android reports interruptions only through audio focus, and the module never requests it.

## Revisit when

Users ask for it in issues, or the minimum supported iOS version is 27.
