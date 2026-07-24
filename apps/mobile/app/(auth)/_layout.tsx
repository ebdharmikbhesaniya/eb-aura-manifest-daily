import { Stack } from 'expo-router';

/**
 * The sign-in gate. Every screen owns its own chrome (06 §1), so no header —
 * and `gestureEnabled: false` because there is nowhere behind this to swipe
 * back to: it is the first thing in the app.
 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />;
}
