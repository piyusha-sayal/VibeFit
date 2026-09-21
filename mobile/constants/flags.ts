/** Build-time feature flags, read from EAS environment variables. */

/**
 * Guest sign-in skips the credential screen entirely by opening an anonymous
 * Firebase session. It exists for internal test builds, so it is off unless a
 * build explicitly turns it on — a store build never sets this.
 */
export const isGuestLoginEnabled = process.env.EXPO_PUBLIC_ENABLE_GUEST_LOGIN === '1';
