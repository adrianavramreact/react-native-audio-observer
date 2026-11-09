import { it, expect, jest, beforeEach } from '@jest/globals';
import { addListener } from '../index';
import Native from '../NativeSystemInterruptions';

jest.mock('../NativeSystemInterruptions', () => {
  const sub = () => ({ remove: jest.fn() });
  return {
    __esModule: true,
    default: {
      startObservingAsync: jest.fn(() => Promise.resolve()),
      stopObservingAsync: jest.fn(() => Promise.resolve()),
      onCall: jest.fn(sub),
      onAudioRoute: jest.fn(sub),
      onOtherAudio: jest.fn(sub),
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

it('starts on the first listener and stops on the last remove', () => {
  const a = addListener('call', () => {});
  const b = addListener('call', () => {});
  expect(Native.startObservingAsync).toHaveBeenCalledTimes(1);
  expect(Native.startObservingAsync).toHaveBeenCalledWith('call');

  a.remove();
  expect(Native.stopObservingAsync).not.toHaveBeenCalled();

  b.remove();
  expect(Native.stopObservingAsync).toHaveBeenCalledTimes(1);
  expect(Native.stopObservingAsync).toHaveBeenCalledWith('call');
});

it('calling remove() twice stops only once', () => {
  const a = addListener('otherAudio', () => {});
  a.remove();
  a.remove();
  expect(Native.stopObservingAsync).toHaveBeenCalledTimes(1);
});
