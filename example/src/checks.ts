import AudioObserver from 'react-native-audio-observer';
import { AUDIO_EVENT, CHECK_TITLE } from './constants';
import type { CheckResult } from './types';

// React Native rejects with an Error that has a code, for example 'ERR_UNSUPPORTED'.
type NativeError = Error & { code?: string };

const toErrorResult = (e: unknown): CheckResult => {
  if (!(e instanceof Error)) {
    return { title: 'Error', message: String(e) };
  }
  const { code } = e as NativeError;
  return { title: code ?? e.name, message: e.message };
};

export const checkAvailable = async (): Promise<CheckResult> => {
  try {
    const [call, audioRoute, otherAudio, mediaPlayback] = await Promise.all([
      AudioObserver.isAvailableAsync('call'),
      AudioObserver.isAvailableAsync('audioRoute'),
      AudioObserver.isAvailableAsync('otherAudio'),
      AudioObserver.isAvailableAsync('mediaPlayback'),
    ]);
    return {
      title: CHECK_TITLE.isAvailable,
      message: `call: ${call}\naudioRoute: ${audioRoute}\notherAudio: ${otherAudio}\nmediaPlayback: ${mediaPlayback}`,
    };
  } catch (e) {
    return toErrorResult(e);
  }
};

export const checkInCall = async (): Promise<CheckResult> => {
  try {
    const inCall = await AudioObserver.isInCallAsync();
    return { title: CHECK_TITLE.isInCall, message: String(inCall) };
  } catch (e) {
    return toErrorResult(e);
  }
};

export const checkAudio = async (): Promise<CheckResult> => {
  try {
    const playing =
      AUDIO_EVENT === 'otherAudio'
        ? await AudioObserver.isOtherAudioPlayingAsync()
        : await AudioObserver.isMediaPlaybackActiveAsync();
    return { title: AUDIO_EVENT, message: String(playing) };
  } catch (e) {
    return toErrorResult(e);
  }
};

export const checkAudioRoutes = async (): Promise<CheckResult> => {
  try {
    const routes = await AudioObserver.getAudioRoutesAsync();
    return { title: CHECK_TITLE.getAudioRoutes, message: routes.join(', ') };
  } catch (e) {
    return toErrorResult(e);
  }
};
