import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import { Platform } from 'react-native';

/**
 * The iOS App Tracking Transparency ask (spec §7).
 *
 * iOS only — Android has no ATT. Asks at most once: if the OS has already
 * recorded a decision (granted/denied/restricted) we never re-prompt. A denial
 * is fine — GA4 still works with reduced, non-IDFA attribution and no feature
 * breaks. Deliberately dependency-light so the "ask once" rule is testable
 * without a device.
 */
export async function requestTrackingPermission(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const { status } = await getTrackingPermissionsAsync();
  if (status !== 'undetermined') return;

  await requestTrackingPermissionsAsync();
}
