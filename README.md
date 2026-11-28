# react-native-audio-observer

Observe-only call and audio events for React Native (call state, audio route, other audio on iOS, media playback on Android) on iOS and Android

## Use cases

- **Anti-fraud**: detect an active call during a bank transfer.
- **Online exams**: detect a call or headphones during an exam.
- **Media**: react when the headphones change or other audio starts. Each platform has many limits here, so read [`LIMITATIONS.md`](LIMITATIONS.md) first.

## Alternatives

| Library                                                                                            | Main job                                         | Changes the audio session | Extra setup      |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------- | ---------------- |
| **react-native-audio-observer**                                                                    | Observe calls, audio route and other apps' audio | No                        | None             |
| [react-native-audio-api](https://www.npmjs.com/package/react-native-audio-api)                     | Play and process audio (Web Audio API)           | Yes                       | Might be needed  |
| [react-native-incall-manager](https://www.npmjs.com/package/react-native-incall-manager)           | Audio during your app's own calls (WebRTC, VoIP) | Yes                       | Might be needed  |
| [react-native-nitro-call-detector](https://www.npmjs.com/package/react-native-nitro-call-detector) | Detect phone calls, VoIP opt-in                  | No                        | Nitro Modules    |

- We recommend this library when you only need to know what is happening (a call, headphones, other audio) without changing anything.
- We recommend react-native-audio-api when your app plays or processes audio itself.
- We recommend react-native-incall-manager if your app has its own WebRTC calls and you need to control the sound: speaker, headphones, ringtone.
- We recommend react-native-nitro-call-detector when you already use Nitro and only need call detection.

Based on some research on other audio libraries, November 2026.

## Requirements

- React Native with the New Architecture (the module is a TurboModule).
- Android: `minSdkVersion` 24. Some events need a newer API level (see [Events](#events)).
- No permissions and no `Info.plist` keys.

## Installation

```sh
npm install react-native-audio-observer
cd ios && pod install
```

## Events

| Event           | Values                                                              | iOS | Android |
| --------------- | ------------------------------------------------------------------- | --- | ------- |
| `call`          | `ringing`, `connected`, `ended`                                     | ✓   | API 31+ |
| `audioRoute`    | `{ routes }`, each one `bluetooth`, `wired`, `speaker` or `unknown` | ✓   | API 33+ |
| `otherAudio`    | `started`, `stopped` (audio from another app)                       | ✓   | –       |
| `mediaPlayback` | `started`, `stopped` (any media, your app's included)               | –   | API 26+ |

## Usage

```js
import AudioObserver, { addListener } from 'react-native-audio-observer';

// 1. Add the listener first.
const subscription = addListener('audioRoute', ({ routes }) => {
  console.log('audioRoute changed', routes);
});

// 2. Then read the initial state.
const routes = await AudioObserver.getAudioRoutesAsync();

// Later
subscription.remove();
```

In a component, subscribe in `useEffect` and remove the subscription on unmount:

```tsx
useEffect(() => {
  let useInitial = true;

  // 1. Add the listener first.
  const subscription = addListener('audioRoute', ({ routes }) => {
    useInitial = false; // an event is newer than the initial read
    setRoutes(routes);
  });

  // 2. Then read the initial state.
  const readInitialRoutes = async () => {
    try {
      const routes = await AudioObserver.getAudioRoutesAsync();
      if (useInitial) setRoutes(routes);
    } catch {
      // ERR_UNSUPPORTED below Android API 33
    }
  };
  readInitialRoutes();

  // 3. Remove it on unmount.
  return () => subscription.remove();
}, []);
```

Calling `remove()` more than once is safe.

Not every event exists on every platform and API level (see [`LIMITATIONS.md`](LIMITATIONS.md)), so check `isAvailableAsync()` before `addListener`. If the listener can't receive events (the event isn't available, or the system refused to start observing it), the module logs a warning. To handle the error yourself instead, for example to send it to Sentry, pass `onError`: `addListener('call', onCall, { onError: (e) => Sentry.captureException(e) })`.

> **Order matters.** Events are emitted only when the state changes, never for the initial state. To miss nothing, add the listener first and read the initial state after it (for example `isInCallAsync()` or `getAudioRoutesAsync()`). Reading it before `addListener` leaves a gap where a change is lost.

> **Never interrupts playback.** The module only observes: it never requests audio focus on Android and never activates the audio session on iOS, so it never pauses or ducks any app.

See [`LIMITATIONS.md`](LIMITATIONS.md) for platform limits.

## API

| Function                                 | Returns                 | Platform |
| ---------------------------------------- | ----------------------- | -------- |
| `addListener(event, listener, options?)` | `{ remove() }`          | both     |
| `isAvailableAsync(event)`                | `Promise<boolean>`      | both     |
| `isInCallAsync()`                        | `Promise<boolean>`      | both     |
| `getAudioRoutesAsync()`                  | `Promise<AudioRoute[]>` | both     |
| `isOtherAudioPlayingAsync()`             | `Promise<boolean>`      | iOS      |
| `isMediaPlaybackActiveAsync()`           | `Promise<boolean>`      | Android  |

The read functions return the current state once, with or without a listener. They reject with code `ERR_UNSUPPORTED` when the event isn't available on the platform or Android API level.

The event types are exported too: `CallEvent`, `AudioRouteEvent`, `AudioRoute`, `OtherAudioEvent`, `MediaPlaybackEvent`.

## Privacy

The package collects no data. Everything is detected on the device, and nothing is sent anywhere. It never reads phone numbers or audio content, so it needs no privacy manifest of its own.

If your app sends these events to a server, that is data your app collects. Declare it in your app's [privacy manifest](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files) and in the [Google Play Data safety form](https://support.google.com/googleplay/android-developer/answer/10787469).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
