import * as Haptics from 'expo-haptics';

/**
 * Small, fire-and-forget taps. A device without a vibration motor, or a
 * platform without the module, simply gets no feedback — never an error.
 */
export function tap(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export function success(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function warn(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
}
