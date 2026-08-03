import { StyleSheet, Text, View } from 'react-native';

// Placeholder — replaced by the Session Setup sheet in the rebuild.
export default function SessionSetupScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Session setup</Text>
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
