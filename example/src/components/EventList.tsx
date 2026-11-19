import { ScrollView, StyleSheet, Text } from 'react-native';

type Props = {
  title: string;
  items: string[];
};

export function EventList({ title, items }: Props) {
  return (
    <>
      <Text style={styles.title}>{title}</Text>
      <ScrollView style={styles.list}>
        {items.map((item, i) => (
          <Text key={i}>{item}</Text>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  list: {
    flex: 1,
  },
});
