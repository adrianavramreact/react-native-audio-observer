import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Platform,
  Text,
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import SystemInterruptions, {
  addListener,
  type AudioRoute,
  type CallEvent,
  type MediaPlaybackEvent,
} from 'react-native-system-interruptions';

const formatRoutes = (routes: AudioRoute[]) => routes.join(', ') || 'unknown';
// iOS reports other apps' audio; Android reports any media, this app's included.
const audioEvent = Platform.OS === 'ios' ? 'otherAudio' : 'mediaPlayback';

export default function App() {
  const [callEvents, setCallEvents] = useState<CallEvent[]>([]);
  const [mediaEvents, setMediaEvents] = useState<MediaPlaybackEvent[]>([]);
  const [routeEvents, setRouteEvents] = useState<AudioRoute[][]>([]);

  useEffect(() => {
    const callSub = addListener('call', (event) => {
      setCallEvents((prev) => [event, ...prev]);
    });
    const mediaSub = addListener(audioEvent, (event) => {
      setMediaEvents((prev) => [event, ...prev]);
    });
    const routeSub = addListener('audioRoute', ({ routes }) => {
      setRouteEvents((prev) => [routes, ...prev]);
    });

    return () => {
      callSub.remove();
      mediaSub.remove();
      routeSub.remove();
    };
  }, []);

  const checkAvailable = async () => {
    const call = await SystemInterruptions.isAvailableAsync('call');
    const otherAudio = await SystemInterruptions.isAvailableAsync('otherAudio');
    const mediaPlayback =
      await SystemInterruptions.isAvailableAsync('mediaPlayback');
    Alert.alert(
      'isAvailable',
      `call: ${call}, otherAudio: ${otherAudio}, mediaPlayback: ${mediaPlayback}`
    );
  };

  const checkInCall = () => {
    SystemInterruptions.isInCallAsync()
      .then((inCall) => Alert.alert('isInCall', String(inCall)))
      .catch((e) => Alert.alert(e.code, e.message));
  };

  const checkAudio = () => {
    const read =
      Platform.OS === 'ios'
        ? SystemInterruptions.isOtherAudioPlayingAsync
        : SystemInterruptions.isMediaPlaybackActiveAsync;
    read()
      .then((playing) => Alert.alert(audioEvent, String(playing)))
      .catch((e) => Alert.alert(e.code, e.message));
  };

  const checkAudioRoutes = () => {
    SystemInterruptions.getAudioRoutesAsync()
      .then((routes) => Alert.alert('audioRoutes', formatRoutes(routes)))
      .catch((e) => Alert.alert(e.code, e.message));
  };

  return (
    <View style={styles.container}>
      <Button title="isAvailable" onPress={checkAvailable} />
      <Button title="isInCall" onPress={checkInCall} />
      <Button title={audioEvent} onPress={checkAudio} />
      <Button title="getAudioRoutes" onPress={checkAudioRoutes} />
      <Text style={styles.title}>call</Text>
      <ScrollView style={styles.list}>
        {callEvents.map((e, i) => (
          <Text key={i}>{e}</Text>
        ))}
      </ScrollView>

      <Text style={styles.title}>{audioEvent}</Text>
      <ScrollView style={styles.list}>
        {mediaEvents.map((e, i) => (
          <Text key={i}>{e}</Text>
        ))}
      </ScrollView>

      <Text style={styles.title}>audioRoute</Text>
      <ScrollView style={styles.list}>
        {routeEvents.map((routes, i) => (
          <Text key={i}>{formatRoutes(routes)}</Text>
        ))}
      </ScrollView>
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  list: {
    flex: 1,
  },
});
