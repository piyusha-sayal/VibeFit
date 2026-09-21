/**
 * Questionnaire options and the wardrobe library for Discover My Style.
 *
 * Every styling suggestion here is keyed to a body type the user chose for
 * themselves. Nothing is derived from a photograph, and "unsure" and
 * "uncategorised" are first-class answers that still produce useful output.
 */

export const BODY_TYPES = [
  { key: 'pear', label: 'Pear', note: 'Hips wider than shoulders.' },
  { key: 'apple', label: 'Apple', note: 'Weight carried through the middle.' },
  { key: 'hourglass', label: 'Hourglass', note: 'Shoulders and hips balanced, waist defined.' },
  { key: 'rectangle', label: 'Rectangle', note: 'Shoulders, waist and hips close in width.' },
  { key: 'inverted_triangle', label: 'Inverted triangle', note: 'Shoulders wider than hips.' },
  { key: 'unsure', label: 'Not sure', note: 'Skip it — we will use your other answers.' },
  { key: 'uncategorised', label: 'Rather not', note: 'No category. Everything else still works.' },
] as const;

export const FIT_PREFERENCES = ['Fitted', 'Semi-fitted', 'Relaxed', 'Oversized', 'Mixed'] as const;
export const NECKLINES = ['V-neck', 'Round', 'Boat', 'Square', 'Collared', 'High neck', 'Sweetheart'] as const;
export const SLEEVES = ['Sleeveless', 'Cap', 'Short', 'Three-quarter', 'Full', 'Puff', 'Bell'] as const;
export const SILHOUETTES = ['A-line', 'Straight', 'Wrap', 'Fit-and-flare', 'Wide-leg', 'Column', 'Layered'] as const;
export const AESTHETICS = [
  'Minimalist', 'Classic', 'Romantic', 'Streetwear', 'Vintage', 'Contemporary',
  'Athleisure', 'Modest', 'Korean-inspired', 'European-inspired', 'Indo-western',
] as const;
export const CULTURAL_PREFERENCES = [
  'Indian traditional', 'Indo-western', 'Western casual', 'Western formal', 'Modest coverage', 'No preference',
] as const;
export const MAKEUP_EXPERIENCE = ['None', 'Beginner', 'Comfortable', 'Advanced'] as const;
export const HAIR_LENGTHS = ['Short', 'Chin', 'Shoulder', 'Mid-back', 'Long'] as const;

interface BodyGuidance {
  summary: string;
  /** Framed as options worth trying, never as rules. */
  explore: string[];
  indian: string[];
  global: string[];
}

export const BODY_GUIDANCE: Record<string, BodyGuidance> = {
  pear: {
    summary: 'Shapes that give the shoulder line as much presence as the hip.',
    explore: ['A-line skirts and dresses', 'Wide-leg and high-waisted trousers', 'Structured or detailed shoulders', 'Boat and square necklines'],
    indian: ['A-line kurtas', 'Anarkalis', 'Lehengas with a fuller flare', 'Sarees draped with a pleated pallu over the shoulder'],
    global: ['Fit-and-flare dresses', 'Wide-leg trousers with a tucked top', 'Structured blazers', 'Statement-shoulder knits'],
  },
  apple: {
    summary: 'Shapes that create a vertical line and keep the midsection comfortable.',
    explore: ['Empire and wrap waists', 'Straight and column cuts', 'V and scoop necklines', 'Open layers worn long'],
    indian: ['Straight-cut kurtas', 'Empire-waist Anarkalis', 'Sarees in soft drapes like georgette', 'Long jackets over kurta sets'],
    global: ['Wrap dresses', 'Column dresses', 'Longline open cardigans', 'Straight-leg trousers with a slightly longer top'],
  },
  hourglass: {
    summary: 'Shapes that follow the line you already have rather than cutting across it.',
    explore: ['Waist-defining belts and seams', 'Wrap and fit-and-flare cuts', 'Straight and pencil skirts', 'Sweetheart and V necklines'],
    indian: ['Fitted kurtas with a defined waist', 'Mermaid or fishtail lehengas', 'Sarees draped to show the waist', 'Corset-style blouses'],
    global: ['Wrap dresses', 'Belted coats', 'High-waisted pencil and flare skirts', 'Tailored jumpsuits'],
  },
  rectangle: {
    summary: 'Shapes that add curve and movement where the line is straight.',
    explore: ['Peplum and ruffle details', 'Layering for depth', 'Belted waists', 'Fuller skirts and sleeves'],
    indian: ['Peplum kurtas', 'Layered lehengas with a gathered skirt', 'Ruffle-drape sarees', 'Jackets with waist ties'],
    global: ['Tiered dresses', 'Belted shirt dresses', 'Cropped jackets over high-waisted bottoms', 'Puff-sleeve tops'],
  },
  inverted_triangle: {
    summary: 'Shapes that give the lower half as much volume as the shoulder.',
    explore: ['Full and pleated skirts', 'Wide-leg and flared trousers', 'V-necklines', 'Simple, unstructured shoulders'],
    indian: ['Lehengas with a full flare', 'Straight kurtas over palazzos', 'Sarees with a heavy border at the hem', 'Simple, unembellished blouses'],
    global: ['Flared midi skirts', 'Bootcut and wide-leg jeans', 'V-neck knits', 'Relaxed shirts, unstructured at the shoulder'],
  },
  unsure: {
    summary: 'No category needed. Your fit, neckline and aesthetic answers do the work.',
    explore: ['Start from the fit you already reach for', 'Try one new neckline at a time', 'Use your colour palette near your face', 'Keep what you re-wear'],
    indian: ['Straight kurtas suit most people', 'A-line is the most forgiving lehenga flare', 'Soft drapes are easier to wear than stiff silks'],
    global: ['A well-fitted straight-leg trouser', 'A wrap dress adapts to most shapes', 'One structured jacket lifts everything'],
  },
};
BODY_GUIDANCE.uncategorised = BODY_GUIDANCE.unsure;

export interface WardrobeItem {
  name: string;
  group: 'Indian' | 'Global';
  occasion: string;
  note: string;
}

export const WARDROBE: WardrobeItem[] = [
  { name: 'Saree', group: 'Indian', occasion: 'Festival, wedding, formal', note: 'Drape style changes the silhouette more than the fabric does.' },
  { name: 'Lehenga', group: 'Indian', occasion: 'Wedding, festival', note: 'Flare volume is the main silhouette decision.' },
  { name: 'Kurta set', group: 'Indian', occasion: 'Everyday, office, festival', note: 'Straight, A-line and peplum cuts behave very differently.' },
  { name: 'Salwar suit', group: 'Indian', occasion: 'Everyday, festival', note: 'Bottom shape — churidar, palazzo, sharara — sets the line.' },
  { name: 'Anarkali', group: 'Indian', occasion: 'Wedding, festival', note: 'Empire seam placement decides where the eye lands.' },
  { name: 'Sherwani', group: 'Indian', occasion: 'Wedding', note: 'Collar height and button placement carry the formality.' },
  { name: 'Indo-western', group: 'Indian', occasion: 'Party, reception', note: 'Mixes tailoring with traditional drape or embroidery.' },
  { name: 'Casual separates', group: 'Global', occasion: 'Everyday, college', note: 'Where your best colours matter most, because you wear them most.' },
  { name: 'Business casual', group: 'Global', occasion: 'Office', note: 'Neutrals below, palette above.' },
  { name: 'Formal tailoring', group: 'Global', occasion: 'Interview, formal event', note: 'Fit at the shoulder is the only part a tailor cannot easily fix.' },
  { name: 'Streetwear', group: 'Global', occasion: 'Everyday, party', note: 'Volume is the point; proportion keeps it deliberate.' },
  { name: 'Modest layering', group: 'Global', occasion: 'Everyday, formal', note: 'Coverage and silhouette are independent choices.' },
  { name: 'Athleisure', group: 'Global', occasion: 'Everyday, travel', note: 'One structured piece stops it reading as loungewear.' },
  { name: 'Evening wear', group: 'Global', occasion: 'Party, date', note: 'Fabric weight carries as much as cut after dark.' },
];
