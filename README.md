# react-native-audio-observer

Observe-only call and audio events for React Native (call state, audio route, other audio on iOS, media playback on Android) on iOS and Android

## Installation


```sh
npm install react-native-audio-observer
```


## Usage


```js
import AudioObserver, {
  addListener,
} from 'react-native-audio-observer';

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
  AudioObserver.getAudioRoutesAsync()
    .then((routes) => {
      if (useInitial) setRoutes(routes);
    })
    .catch(() => {}); // ERR_UNSUPPORTED below Android API 33

  // 3. Remove it on unmount.
  return () => subscription.remove();
}, []);
```

Calling `remove()` more than once is safe.

> **Order matters.** Events are emitted only when the state changes, never for the initial state. To miss nothing, add the listener first and read the initial state after it (for example `isInCallAsync()` or `getAudioRoutesAsync()`). Reading it before `addListener` leaves a gap where a change is lost.

> **Never interrupts playback.** The module only observes: it never requests audio focus on Android and never activates the audio session on iOS, so it never pauses or ducks any app.

See [`LIMITATIONS.md`](LIMITATIONS.md) for platform limits.


## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
