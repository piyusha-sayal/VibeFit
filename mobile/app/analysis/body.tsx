import { Redirect } from 'expo-router';

/**
 * The old Body screen read shoulder-to-hip ratios derived from a selfie. That
 * analysis is retired: VibeFit does not determine body shape from photographs.
 *
 * The route stays as a redirect so existing links and any deep link in the
 * wild land on the questionnaire instead of a dead end.
 */
export default function RetiredBodyScreen() {
  return <Redirect href={'/style/body' as never} />;
}
