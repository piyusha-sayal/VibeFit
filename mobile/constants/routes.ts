/**
 * Where every successful sign-in lands. The launch router (app/index.tsx) owns
 * the order that follows: biometric lock, 18+ confirmation, onboarding, home.
 * Sending a sign-in anywhere else skips those checks.
 */
export const POST_SIGN_IN_ROUTE = '/' as const;
