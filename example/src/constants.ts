import { Platform } from 'react-native';
import type { AudioEventName } from './types';

// iOS reports other apps' audio; Android reports any media, this app's included.
export const AUDIO_EVENT: AudioEventName =
  Platform.OS === 'ios' ? 'otherAudio' : 'mediaPlayback';

// Used by the buttons in App and by the success alert titles in checks.
export const CHECK_TITLE = {
  isAvailable: 'isAvailable',
  isInCall: 'isInCall',
  getAudioRoutes: 'getAudioRoutes',
} as const;

export const LIST_TITLE = {
  call: 'call',
  audioRoute: 'audioRoute',
} as const;
