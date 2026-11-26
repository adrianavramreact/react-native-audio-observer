import { it, expect, jest, beforeEach } from '@jest/globals';
import { Platform } from 'react-native';
import AudioObserver from 'react-native-audio-observer';
import {
  checkAudio,
  checkAudioRoutes,
  checkAvailable,
  checkInCall,
} from '../checks';

jest.mock('react-native-audio-observer', () => ({
  __esModule: true,
  default: {
    isAvailableAsync: jest.fn(),
    isInCallAsync: jest.fn(),
    getAudioRoutesAsync: jest.fn(),
    isOtherAudioPlayingAsync: jest.fn(),
    isMediaPlaybackActiveAsync: jest.fn(),
  },
}));

const native = jest.mocked(AudioObserver);
// React Native rejects with an Error that also has a `code`.
const nativeError = Object.assign(new Error('not supported'), {
  code: 'ERR_UNSUPPORTED',
});

beforeEach(() => {
  jest.clearAllMocks();
});

it('checkAvailable lists every event', async () => {
  native.isAvailableAsync.mockImplementation((event) =>
    Promise.resolve(event !== 'mediaPlayback')
  );
  await expect(checkAvailable()).resolves.toEqual({
    title: 'isAvailable',
    message:
      'call: true\naudioRoute: true\notherAudio: true\nmediaPlayback: false',
  });
});

it('checkInCall shows the call state', async () => {
  native.isInCallAsync.mockResolvedValue(true);
  await expect(checkInCall()).resolves.toEqual({
    title: 'isInCall',
    message: 'true',
  });
});

it('checkAudioRoutes formats the routes', async () => {
  native.getAudioRoutesAsync.mockResolvedValue(['wired', 'speaker']);
  await expect(checkAudioRoutes()).resolves.toEqual({
    title: 'getAudioRoutes',
    message: 'wired, speaker',
  });
});

it('checkAudio reads otherAudio on iOS', async () => {
  expect(Platform.OS).toBe('ios'); // Jest preset default
  native.isOtherAudioPlayingAsync.mockResolvedValue(false);
  await expect(checkAudio()).resolves.toEqual({
    title: 'otherAudio',
    message: 'false',
  });
  expect(native.isMediaPlaybackActiveAsync).not.toHaveBeenCalled();
});

it.each([
  { name: 'checkAvailable', check: checkAvailable, read: 'isAvailableAsync' },
  { name: 'checkInCall', check: checkInCall, read: 'isInCallAsync' },
  { name: 'checkAudio', check: checkAudio, read: 'isOtherAudioPlayingAsync' },
  {
    name: 'checkAudioRoutes',
    check: checkAudioRoutes,
    read: 'getAudioRoutesAsync',
  },
] as const)('$name shows the native error', async ({ check, read }) => {
  native[read].mockRejectedValue(nativeError);
  await expect(check()).resolves.toEqual({
    title: nativeError.code,
    message: nativeError.message,
  });
});

it('uses the error name when there is no code', async () => {
  native.isInCallAsync.mockRejectedValue(new Error('bad value'));
  await expect(checkInCall()).resolves.toEqual({
    title: 'Error',
    message: 'bad value',
  });
});
