import { Alert, Button, StyleSheet, View } from 'react-native';
import {
  checkAudio,
  checkAudioRoutes,
  checkAvailable,
  checkInCall,
} from './checks';
import { EventList } from './components/EventList';
import { AUDIO_EVENT, CHECK_TITLE, LIST_TITLE } from './constants';
import type { CheckResult } from './types';
import { useAudioEvents } from './useAudioEvents';

const show = (check: () => Promise<CheckResult>) => async () => {
  const { title, message } = await check();
  Alert.alert(title, message);
};

export default function App() {
  const { callEvents, audioEvents, routeEvents } = useAudioEvents();

  return (
    <View style={styles.container}>
      <Button title={CHECK_TITLE.isAvailable} onPress={show(checkAvailable)} />
      <Button title={CHECK_TITLE.isInCall} onPress={show(checkInCall)} />
      <Button title={AUDIO_EVENT} onPress={show(checkAudio)} />
      <Button
        title={CHECK_TITLE.getAudioRoutes}
        onPress={show(checkAudioRoutes)}
      />

      <EventList title={LIST_TITLE.call} items={callEvents} />
      <EventList title={AUDIO_EVENT} items={audioEvents} />
      <EventList
        title={LIST_TITLE.audioRoute}
        items={routeEvents.map((routes) => routes.join(', '))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 64,
    backgroundColor: '#fff',
  },
});
