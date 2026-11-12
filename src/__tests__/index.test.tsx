import { it, expect, jest, beforeEach } from '@jest/globals';
import AudioObserver, { addListener } from '../index';
import NativeAudioObserver from '../NativeAudioObserver';

jest.mock('../NativeAudioObserver', () => {
  const sub = () => ({ remove: jest.fn() });
  return {
    __esModule: true,
    default: {
      startObservingAsync: jest.fn(() => Promise.resolve()),
      stopObservingAsync: jest.fn(() => Promise.resolve()),
      isAvailableAsync: jest.fn(() => Promise.resolve(true)),
      onCall: jest.fn(sub),
      onAudioRoute: jest.fn(sub),
      onOtherAudio: jest.fn(sub),
      onMediaPlayback: jest.fn(sub),
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

it('starts on the first listener and stops on the last remove', () => {
  const a = addListener('call', () => {});
  const b = addListener('call', () => {});
  expect(NativeAudioObserver.startObservingAsync).toHaveBeenCalledTimes(1);
  expect(NativeAudioObserver.startObservingAsync).toHaveBeenCalledWith('call');

  a.remove();
  expect(NativeAudioObserver.stopObservingAsync).not.toHaveBeenCalled();

  b.remove();
  expect(NativeAudioObserver.stopObservingAsync).toHaveBeenCalledTimes(1);
  expect(NativeAudioObserver.stopObservingAsync).toHaveBeenCalledWith('call');
});

it('calling remove() twice stops only once', () => {
  const a = addListener('audioRoute', () => {});
  a.remove();
  a.remove();
  expect(NativeAudioObserver.stopObservingAsync).toHaveBeenCalledTimes(1);
});

it.each([
  { event: 'call', emitter: 'onCall' },
  { event: 'audioRoute', emitter: 'onAudioRoute' },
  { event: 'otherAudio', emitter: 'onOtherAudio' },
  { event: 'mediaPlayback', emitter: 'onMediaPlayback' },
] as const)('routes $event to $emitter', ({ event, emitter }) => {
  const listener = jest.fn();
  const subscription = addListener(event, listener);
  expect(NativeAudioObserver[emitter]).toHaveBeenCalledTimes(1);
  expect(NativeAudioObserver[emitter]).toHaveBeenCalledWith(listener);
  expect(NativeAudioObserver.startObservingAsync).toHaveBeenCalledWith(event);
  subscription.remove();
});

it('two listeners on the same event have separate subscriptions', () => {
  const subA = { remove: jest.fn() };
  const subB = { remove: jest.fn() };
  jest
    .mocked(NativeAudioObserver.onCall)
    .mockReturnValueOnce(subA)
    .mockReturnValueOnce(subB);

  const first = jest.fn();
  const second = jest.fn();
  const a = addListener('call', first);
  const b = addListener('call', second);
  expect(NativeAudioObserver.onCall).toHaveBeenNthCalledWith(1, first);
  expect(NativeAudioObserver.onCall).toHaveBeenNthCalledWith(2, second);

  a.remove();
  expect(subA.remove).toHaveBeenCalledTimes(1);
  expect(subB.remove).not.toHaveBeenCalled();

  b.remove();
  expect(subB.remove).toHaveBeenCalledTimes(1);
});

it('isAvailableAsync forwards the event name', async () => {
  await expect(AudioObserver.isAvailableAsync('call')).resolves.toBe(true);
  expect(NativeAudioObserver.isAvailableAsync).toHaveBeenCalledWith('call');
});
