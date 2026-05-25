import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../src/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>404</Text>
      <Text style={styles.subtitle}>This screen doesn't exist.</Text>

      <Pressable onPress={() => router.replace('/(tabs)')} style={styles.button}>
        <Text style={styles.buttonText}>Go to Home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  title: {
    fontSize: 64,
    fontFamily: FontFamily.headingBold,
    color: Colors.saffron,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.body,
    color: Colors.gray4,
    marginBottom: Spacing.xxl,
  },
  button: {
    backgroundColor: Colors.navy,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.round,
  },
  buttonText: {
    color: Colors.white,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
  },
});
