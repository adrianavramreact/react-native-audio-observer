# ADR-004: No `shouldResume` in `audioInterruption`

- Status: Accepted
- Date: 2026-11-08

## Decision

`audioInterruption` reports only `began` and `ended`. It does not report whether the app should resume.

## Why

- From iOS 27, the resume hint moves to a new notification and the old one is deprecated. Supporting it means two code paths, one for iOS 26 and older and one for iOS 27 and later.
- Testing needs a real iPhone. Once the test device moves to iOS 27, it cannot go back to iOS 26, so a bug on iOS 26 could no longer be checked.

## Revisit when

Users ask for it in issues, or the minimum supported iOS version is 27.
