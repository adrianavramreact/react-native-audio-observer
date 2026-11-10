import {
  TurboModuleRegistry,
  type CodegenTypes,
  type TurboModule,
} from 'react-native';

export type AudioRoute = 'bluetooth' | 'wired' | 'speaker' | 'unknown';

export type CallEvent = 'ringing' | 'connected' | 'ended';
export type AudioRouteEvent = { routes: AudioRoute[] };
export type OtherAudioEvent = 'started' | 'stopped';
export type MediaPlaybackEvent = 'started' | 'stopped';

export interface Spec extends TurboModule {
  startObservingAsync(event: string): Promise<void>;
  stopObservingAsync(event: string): Promise<void>;

  isAvailableAsync(event: string): Promise<boolean>;
  isInCallAsync(): Promise<boolean>;
  getAudioRoutesAsync(): Promise<AudioRoute[]>;
  isOtherAudioPlayingAsync(): Promise<boolean>;
  isMediaPlaybackActiveAsync(): Promise<boolean>;

  readonly onCall: CodegenTypes.EventEmitter<CallEvent>;
  readonly onAudioRoute: CodegenTypes.EventEmitter<AudioRouteEvent>;
  readonly onOtherAudio: CodegenTypes.EventEmitter<OtherAudioEvent>;
  readonly onMediaPlayback: CodegenTypes.EventEmitter<MediaPlaybackEvent>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('AudioObserver');
