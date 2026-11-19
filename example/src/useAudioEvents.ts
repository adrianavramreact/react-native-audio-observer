import { useEffect, useState } from 'react';
import {
  addListener,
  type AudioRoute,
  type CallEvent,
  type MediaPlaybackEvent,
  type OtherAudioEvent,
} from 'react-native-audio-observer';
import { AUDIO_EVENT } from './constants';

/**
 * Listens to call, audio (otherAudio on iOS, mediaPlayback on Android) and
 * audioRoute events while the component is mounted. Newest event first.
 */
export function useAudioEvents() {
  const [callEvents, setCallEvents] = useState<CallEvent[]>([]);
  const [audioEvents, setAudioEvents] = useState<
    (OtherAudioEvent | MediaPlaybackEvent)[]
  >([]);
  const [routeEvents, setRouteEvents] = useState<AudioRoute[][]>([]);

  useEffect(() => {
    const subscriptions = [
      addListener('call', (event) => {
        setCallEvents((prev) => [event, ...prev]);
      }),
      addListener(AUDIO_EVENT, (event) => {
        setAudioEvents((prev) => [event, ...prev]);
      }),
      addListener('audioRoute', ({ routes }) => {
        setRouteEvents((prev) => [routes, ...prev]);
      }),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);

  return { callEvents, audioEvents, routeEvents };
}
