import { it, expect, jest, beforeEach } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import {
  addListener,
  type AudioRouteEvent,
  type CallEvent,
  type MediaPlaybackEvent,
  type OtherAudioEvent,
} from 'react-native-audio-observer';
import { useAudioEvents } from '../useAudioEvents';

jest.mock('react-native-audio-observer', () => ({
  __esModule: true,
  addListener: jest.fn(),
}));

type EventName = Parameters<typeof addListener>[0];
// The value each event sends to its listener.
type EventOf = {
  call: CallEvent;
  audioRoute: AudioRouteEvent;
  otherAudio: OtherAudioEvent;
  mediaPlayback: MediaPlaybackEvent;
};

const mockedAddListener = jest.mocked(addListener);
const remove = jest.fn();

// Fires a fake native event to the listener the hook registered for eventName.
const emit = <K extends EventName>(eventName: K, event: EventOf[K]) => {
  const call = mockedAddListener.mock.calls.find(
    ([name]) => name === eventName
  );
  if (!call) {
    throw new Error(`The hook did not listen to '${eventName}'`);
  }
  const [, listener] = call;
  return act(() => listener(event));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedAddListener.mockReturnValue({ remove });
});

it('listens to call, otherAudio (iOS) and audioRoute', async () => {
  expect(Platform.OS).toBe('ios'); // Jest preset default
  await renderHook(() => useAudioEvents());
  const eventNames = mockedAddListener.mock.calls.map(([name]) => name);
  expect(eventNames).toEqual(['call', 'otherAudio', 'audioRoute']);
});

it('starts with empty lists', async () => {
  const { result } = await renderHook(() => useAudioEvents());
  expect(result.current).toEqual({
    callEvents: [],
    audioEvents: [],
    routeEvents: [],
  });
});

it('saves each event in its own list, newest first', async () => {
  const { result } = await renderHook(() => useAudioEvents());

  await emit('call', 'ringing');
  await emit('call', 'connected');
  await emit('otherAudio', 'started');
  await emit('audioRoute', { routes: ['wired'] });
  await emit('audioRoute', { routes: ['bluetooth', 'speaker'] });

  expect(result.current).toEqual({
    callEvents: ['connected', 'ringing'],
    audioEvents: ['started'],
    routeEvents: [['bluetooth', 'speaker'], ['wired']],
  });
});

it('removes every listener on unmount', async () => {
  const { unmount } = await renderHook(() => useAudioEvents());
  expect(remove).not.toHaveBeenCalled();
  await act(() => unmount());
  expect(remove).toHaveBeenCalledTimes(3);
});
