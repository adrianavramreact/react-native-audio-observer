import NativeAudioObserver from './NativeAudioObserver';
import type { EventSubscription } from 'react-native';
import type {
  AudioRoute,
  CallEvent,
  AudioRouteEvent,
  OtherAudioEvent,
  MediaPlaybackEvent,
} from './NativeAudioObserver';

export type {
  AudioRoute,
  CallEvent,
  AudioRouteEvent,
  OtherAudioEvent,
  MediaPlaybackEvent,
};
type EventMap = {
  call: CallEvent;
  audioRoute: AudioRouteEvent;
  // iOS only: audio from another app.
  otherAudio: OtherAudioEvent;
  // Android only: any media playing, your app's included.
  mediaPlayback: MediaPlaybackEvent;
};
export type ListenerOptions = {
  /**
   * Called when the listener can't receive events, for example when the event isn't
   * available on this platform or the system refused to start observing it.
   * Also called if stopping fails. Replaces the default console.warn.
   */
  onError?: (error: unknown) => void;
};
// Number of active listeners per event. Native observing runs only while it is > 0.
const counts: Partial<Record<keyof EventMap, number>> = {};
// Whether native observing is running. Reset on failure so the next addListener retries.
const started: Partial<Record<keyof EventMap, boolean>> = {};

/**
 * Events are emitted only when the state changes, never for the initial state.
 * To miss nothing, add the listener first and read the initial state after it
 * (for example `isInCallAsync()` or `getAudioRoutesAsync()`). Reading it before
 * `addListener` leaves a gap where a change is lost.
 */
export function addListener<K extends keyof EventMap>(
  eventName: K,
  listener: (event: EventMap[K]) => void,
  options?: ListenerOptions
): EventSubscription {
  const subscription = subscribe(eventName, listener);
  const count = counts[eventName] ?? 0;
  if (!started[eventName]) {
    started[eventName] = true;
    (async () => {
      try {
        await NativeAudioObserver.startObservingAsync(eventName);
      } catch (e) {
        started[eventName] = false;
        if (options?.onError) {
          options.onError(e);
        } else {
          console.warn(
            `[react-native-audio-observer] startObservingAsync('${eventName}') failed`,
            e
          );
        }
      }
    })();
  }
  counts[eventName] = count + 1;

  let removed = false;
  return {
    remove() {
      if (removed) return;
      removed = true;
      subscription.remove();
      const left = counts[eventName]! - 1;
      counts[eventName] = left;
      if (left === 0 && started[eventName]) {
        started[eventName] = false;
        (async () => {
          try {
            await NativeAudioObserver.stopObservingAsync(eventName);
          } catch (e) {
            if (options?.onError) {
              options.onError(e);
            } else {
              console.warn(
                `[react-native-audio-observer] stopObservingAsync('${eventName}') failed`,
                e
              );
            }
          }
        })();
      }
    },
  };
}

function subscribe<K extends keyof EventMap>(
  eventName: K,
  listener: (event: EventMap[K]) => void
): EventSubscription {
  switch (eventName) {
    case 'call':
      return NativeAudioObserver.onCall(listener as (event: CallEvent) => void);
    case 'audioRoute':
      return NativeAudioObserver.onAudioRoute(
        listener as (event: AudioRouteEvent) => void
      );
    case 'otherAudio':
      return NativeAudioObserver.onOtherAudio(
        listener as (event: OtherAudioEvent) => void
      );
    case 'mediaPlayback':
      return NativeAudioObserver.onMediaPlayback(
        listener as (event: MediaPlaybackEvent) => void
      );
  }
}
export default {
  isAvailableAsync: (event: keyof EventMap) =>
    NativeAudioObserver.isAvailableAsync(event),
  isInCallAsync: NativeAudioObserver.isInCallAsync,
  getAudioRoutesAsync: NativeAudioObserver.getAudioRoutesAsync,
  isOtherAudioPlayingAsync: NativeAudioObserver.isOtherAudioPlayingAsync,
  isMediaPlaybackActiveAsync: NativeAudioObserver.isMediaPlaybackActiveAsync,
  addListener,
};
