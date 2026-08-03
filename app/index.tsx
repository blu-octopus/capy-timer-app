import { StyleSheet, Text, View } from 'react-native';

// Placeholder — replaced by the full Home/Timer screen in the rebuild.
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>capy-timer rebuild in progress</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 14,
    color: '#823D00',
  },
});
