/**
 * What onboarding asks, and what it does with the answers.
 *
 * Five screens, none of them mandatory except pressing Continue. Everything
 * here is deliberately small: the flagship experiences ask their own questions
 * at the point they matter, which is a better moment than before someone has
 * seen the app at all. The older eight-step questionnaire's detailed hair,
 * skin, routine and budget questions moved there rather than being deleted —
 * they are still saved to the same `onboarding_responses` row when answered.
 *
 * Nothing here infers anything about a person from a photograph, and no answer
 * restricts what they can reach: interests order the home screen, they never
 * hide a category.
 */
import { AESTHETICS } from './wardrobe';

export interface InterestOption {
  /** Stored in `areas_of_interest`. Kept stable — rules read these. */
  value: string;
  label: string;
  blurb: string;
}

/**
 * Six choices, five of which map to a flagship experience. 'everything' is not
 * stored as an interest; it selects the other five, because a stored value of
 * "everything" would have to be special-cased by every reader.
 */
export const INTERESTS: InterestOption[] = [
  { value: 'color', label: 'Personal Colours', blurb: 'The shades that suit your colouring' },
  { value: 'hair', label: 'Hairstyles', blurb: 'Cuts and fringes for your face shape' },
  { value: 'makeup', label: 'Makeup', blurb: 'Shades and looks worth trying' },
  { value: 'fashion', label: 'Fashion', blurb: 'Silhouettes, necklines and outfits' },
  { value: 'looks', label: 'Complete Looks', blurb: 'Everything composed into one look' },
];

export const EVERYTHING = 'everything';

/** Selecting everything means all five, not a sixth stored value. */
export function applyInterest(current: string[], value: string): string[] {
  if (value === EVERYTHING) {
    const all = INTERESTS.map((i) => i.value);
    return current.length === all.length ? [] : all;
  }
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
}

export function isEverythingSelected(current: string[]): boolean {
  return current.length === INTERESTS.length;
}

/**
 * The aesthetics come from the shared library so the identifiers match the
 * ones Discover My Style already stores and reads. No new vocabulary.
 */
export const STYLE_CHOICES: readonly string[] = AESTHETICS;

/** Distinguishable from an unanswered question, and stored deliberately. */
export const UNSURE = 'Not sure yet';

export function applyStyle(current: string[], value: string): string[] {
  // "Not sure yet" is an answer, so it clears the others rather than sitting
  // alongside them; picking a real aesthetic afterwards clears it in turn.
  if (value === UNSURE) return current.includes(UNSURE) ? [] : [UNSURE];
  const without = current.filter((v) => v !== UNSURE);
  return without.includes(value)
    ? without.filter((v) => v !== value)
    : [...without, value];
}

/**
 * Optional, and phrased as an interest rather than an identity. Region orders
 * what is shown first; it never limits what can be reached, in either
 * direction — an Indian user is not pushed towards traditional wear and a user
 * elsewhere is not pushed away from it.
 */
export const REGIONS = [
  { value: 'india', label: 'India' },
  { value: 'south_asia', label: 'South Asia' },
  { value: 'east_asia', label: 'East Asia' },
  { value: 'middle_east', label: 'Middle East' },
  { value: 'africa', label: 'Africa' },
  { value: 'europe', label: 'Europe' },
  { value: 'americas', label: 'Americas' },
  { value: 'oceania', label: 'Oceania' },
] as const;

export const OCCASIONS = [
  { value: 'everyday', label: 'Everyday' },
  { value: 'work', label: 'Work' },
  { value: 'celebration', label: 'Weddings and celebrations' },
  { value: 'evening', label: 'Evenings out' },
  { value: 'travel', label: 'Travel' },
] as const;

// -------------------------------------------------------------- the ending

export interface Recommendation {
  /** A key from constants/experiences.ts — never a new route. */
  experienceKey: string;
  reason: string;
}

const BY_INTEREST: Record<string, Recommendation> = {
  color: { experienceKey: 'colors', reason: 'You chose personal colours' },
  hair: { experienceKey: 'face', reason: 'Hairstyles start with your face shape' },
  makeup: { experienceKey: 'colors', reason: 'Makeup shades follow your colouring' },
  fashion: { experienceKey: 'style', reason: 'You chose fashion' },
  looks: { experienceKey: 'create', reason: 'You chose complete looks' },
};

/**
 * Which experience to put first. Interest order is the person's own tap order,
 * so the first tap wins — it is the closest thing to a stated priority, and it
 * beats any ranking invented here.
 */
export function recommendedStart(interests: string[]): Recommendation | null {
  for (const interest of interests) {
    const match = BY_INTEREST[interest];
    if (match) return match;
  }
  return null;
}

/**
 * Home-screen ordering: chosen interests first, in the order they were picked,
 * then everything else. Nothing is removed — an interest is a preference about
 * order, not a filter on the product.
 */
export function orderExperiences<T extends { key: string }>(
  experiences: T[], interests: string[],
): T[] {
  const wanted = interests
    .map((i) => BY_INTEREST[i]?.experienceKey)
    .filter((key): key is string => !!key);
  const rank = (key: string) => {
    const at = wanted.indexOf(key);
    return at === -1 ? wanted.length + experiences.findIndex((e) => e.key === key) : at;
  };
  return [...experiences].sort((a, b) => rank(a.key) - rank(b.key));
}
