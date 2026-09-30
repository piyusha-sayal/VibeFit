/**
 * Routes the backend sends (passport next actions) are written without the
 * app's route groups — "/scan", "/onboarding". Expo Router resolves those,
 * but every screen in the app, and the route tests, use the group-qualified
 * form, so backend routes are normalised once where they enter the app.
 */
const GROUPED: Record<string, string> = {
  '/scan': '/(tabs)/scan',
  '/passport': '/(tabs)/passport',
  '/progress': '/(tabs)/progress',
  '/profile': '/(tabs)/profile',
  '/create': '/(tabs)/create',
  '/onboarding': '/(auth)/onboarding',
};

export function appRoute(route: string): string {
  const [path, query] = route.split('?');
  const grouped = GROUPED[path] ?? path;
  return query ? `${grouped}?${query}` : grouped;
}
