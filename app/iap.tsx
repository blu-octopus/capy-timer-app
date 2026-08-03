import { StyleSheet, Text, View } from 'react-native';

// Placeholder — replaced by the coin shop (IAP) modal in the rebuild.
export default function IapScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.text}>Coin shop</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  card: {
    width: 343,
    maxWidth: '90%',
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    color: '#823D00',
  },
});
