/**
 * Light personalisation from what the person told us: the styles they want to
 * see and their age bracket. It only changes the ORDER of suggestions and adds
 * a short "picked for you" hint — nothing is ever hidden because of age or
 * gender, so every option stays one scroll away.
 */

/** Makeup looks that tend to be asked for first in each age bracket. */
const MAKEUP_BY_AGE: Record<string, string[]> = {
  '18-24': ['clean_girl', 'korean_gradient', 'glass_skin', 'soft_glam', 'editorial'],
  '25-34': ['soft_glam', 'clean_girl', 'office', 'glass_skin', 'smokey'],
  '35-44': ['natural', 'office', 'soft_glam', 'monochrome', 'glass_skin'],
  '45-54': ['natural', 'soft_glam', 'office', 'monochrome', 'vintage'],
  '55+': ['natural', 'soft_glam', 'monochrome', 'office', 'vintage'],
};

/** Looks that suit a light-touch, grooming-first routine. */
const MAKEUP_MASCULINE = ['no_makeup', 'natural', 'glass_skin', 'office'];

export function makeupPicks(ageRange: string | null, genderPresentation: string | null): string[] {
  if (genderPresentation === 'masculine') return MAKEUP_MASCULINE;
  return ageRange ? MAKEUP_BY_AGE[ageRange] ?? [] : [];
}

/**
 * Stable reorder: picked keys first (in pick order), everything else after in
 * its original order.
 */
export function orderByPicks<T extends { key: string }>(items: T[], picks: string[]): T[] {
  if (!picks.length) return items;
  const rank = new Map(picks.map((k, i) => [k, i]));
  const picked = items.filter((i) => rank.has(i.key)).sort((a, b) => rank.get(a.key)! - rank.get(b.key)!);
  return [...picked, ...items.filter((i) => !rank.has(i.key))];
}
