/**
 * The shapes that make one hairstyle look different from another.
 *
 * The audit that produced this file: `FaceFigure` had three hair outlines —
 * short, medium, long — and the backend library has 29 haircuts. Twelve of
 * them are "short", so a pixie, a buzz cut, a fade and a bob were the same
 * drawing. Nine are "medium", so a blunt lob and a butterfly cut were the same
 * drawing. The eight fringe options were not drawn at all, because the front
 * hairline was one fixed path.
 *
 * Texture varied only an edge squiggle, which cannot separate a crew cut from
 * a French bob. So length gains a silhouette, and the fringe becomes its own
 * layer over the forehead.
 *
 * These are schematics. They show where a shape sits around a face; they are
 * not a prediction of what a cut will look like on anyone's head, and the
 * screens that use them say so.
 */

export type HairSilhouette =
  | 'cropped' | 'rounded' | 'blunt' | 'layered' | 'voluminous'
  | 'tapered' | 'braided' | 'flowing';

/** The outer hair mass. Drawn behind the face, from the crown down. */
export const HAIR_SILHOUETTES: Record<HairSilhouette, string> = {
  // Close to the head: buzz, crew, fade, undercut.
  cropped: 'M30 56 Q60 22 90 56 Q90 38 60 32 Q30 38 30 56 Z',
  // Ear-length with weight at the jaw: pixie grown out, French bob.
  rounded: 'M26 74 Q22 28 60 24 Q98 28 94 74 Q84 50 60 46 Q36 50 26 74 Z',
  // A hard horizontal edge: blunt bob, blunt cut, U-cut.
  // Rounded over the crown, hard along the bottom. The first version was
  // square at the top as well, which read as a helmet rather than a cut.
  blunt: 'M26 96 L26 56 Q26 24 60 22 Q94 24 94 56 L94 96 Z',
  // Stepped outline: shag, wolf cut, butterfly, long layers.
  layered: 'M24 104 Q18 30 60 24 Q102 30 96 104 L86 78 L90 96 L76 62 '
    + 'Q60 50 44 62 L30 96 L34 78 Z',
  // Width away from the head: curls, coils, afro shapes.
  voluminous: 'M14 84 Q10 22 60 18 Q110 22 106 84 Q92 54 60 50 Q28 54 14 84 Z',
  // Narrowing to a point: V-cut, face-framing, tapered coils.
  tapered: 'M24 96 Q20 28 60 22 Q100 28 96 96 L74 120 L60 74 L46 120 Z',
  // Sectioned, with visible divisions: braids, twists, locs.
  braided: 'M26 110 Q22 28 60 22 Q98 28 94 110 L82 110 L84 60 L72 108 '
    + 'L70 56 L60 106 L50 56 L48 108 L36 60 L38 110 Z',
  // Long and loose past the shoulder.
  flowing: 'M22 122 Q16 28 60 22 Q104 28 98 122 Q88 64 60 56 Q32 64 22 122 Z',
};

/**
 * Which silhouette each haircut in the backend library is drawn as.
 *
 * Keyed by `hair_library.HAIRSTYLES[].key`. A cut with no entry falls back to
 * its length, which is the old behaviour rather than a blank card.
 */
export const CUT_SILHOUETTES: Record<string, HairSilhouette> = {
  // short
  pixie: 'cropped',
  bob: 'rounded',
  french_bob: 'rounded',
  blunt_bob: 'blunt',
  layered_bob: 'layered',
  textured_crop: 'layered',
  crew_cut: 'cropped',
  fade: 'tapered',
  undercut: 'tapered',
  two_block: 'rounded',
  buzz_cut: 'cropped',
  tapered_coils: 'voluminous',
  // medium
  lob: 'blunt',
  shoulder_layers: 'layered',
  shag: 'layered',
  wolf_cut: 'layered',
  butterfly_cut: 'voluminous',
  hush_cut: 'rounded',
  medium_curls: 'voluminous',
  twists: 'braided',
  box_braids: 'braided',
  // long
  long_layers: 'layered',
  face_framing: 'tapered',
  long_curls: 'voluminous',
  u_cut: 'flowing',
  v_cut: 'tapered',
  straight_cut: 'blunt',
  locs: 'braided',
  medium_flow: 'flowing',
};

/** Length still decides how far down the mass reaches. */
export const LENGTH_SCALE: Record<string, number> = {
  short: 0.72,
  medium: 0.88,
  long: 1,
};

export function silhouetteFor(key: string, length = 'medium'): HairSilhouette {
  const mapped = CUT_SILHOUETTES[key];
  if (mapped) return mapped;
  return length === 'short' ? 'cropped' : length === 'long' ? 'flowing' : 'rounded';
}

// ------------------------------------------------------------------- fringe

export type Fringe =
  | 'none' | 'full' | 'curtain' | 'side_swept' | 'wispy'
  | 'see_through' | 'baby' | 'face_framing';

/**
 * Drawn over the forehead, so a fringe is visible as a fringe rather than as
 * a slightly different hairline. Keys match `hair_library.BANGS`.
 */
export const FRINGES: Record<Fringe, string | null> = {
  none: null,
  // A solid curtain to the brow.
  full: 'M32 44 Q60 26 88 44 L88 56 Q60 50 32 56 Z',
  // Parted in the middle, falling either side.
  curtain: 'M32 44 Q46 26 60 40 Q60 52 44 62 Q34 56 32 44 Z '
    + 'M88 44 Q74 26 60 40 Q60 52 76 62 Q86 56 88 44 Z',
  // Swept across from one side.
  side_swept: 'M30 46 Q50 24 88 42 Q74 56 44 60 Q34 58 30 46 Z',
  // Thin strands, not a solid mass.
  wispy: 'M36 44 L40 60 M46 42 L48 62 M58 41 L58 63 M70 42 L70 61 M82 45 L80 58',
  // A fringe you can see the forehead through.
  see_through: 'M34 44 Q60 28 86 44 L86 52 Q60 46 34 52 Z',
  // Cut well above the brow.
  baby: 'M38 42 Q60 30 82 42 L82 48 Q60 43 38 48 Z',
  // Not a fringe: longer pieces framing the cheekbones.
  face_framing: 'M30 44 Q34 76 42 92 M90 44 Q86 76 78 92',
};

/** Wispy and face-framing are strokes, not filled shapes. */
export const STROKE_FRINGES: Fringe[] = ['wispy', 'face_framing'];

// ------------------------------------------------------------------- makeup

export type BlushPlacement = 'apples' | 'cheekbone' | 'draped' | 'sunburst' | 'none';

/**
 * Where blush sits, which is the whole question a blush screen is answering.
 * One fixed pair of circles made every placement look the same.
 * [cx, cy, rx, ry, rotation] per side, mirrored around x = 60.
 */
export const BLUSH_ZONES: Record<Exclude<BlushPlacement, 'none'>,
  { cx: number; cy: number; rx: number; ry: number; rotate: number }> = {
  // Round, on the front of the cheek, level with the nose.
  apples: { cx: 43, cy: 72, rx: 8, ry: 7, rotate: 0 },
  // Angled up along the bone, starting further out.
  cheekbone: { cx: 40, cy: 66, rx: 11, ry: 5, rotate: -18 },
  // Swept high and wide, from cheek towards the temple.
  draped: { cx: 38, cy: 58, rx: 10, ry: 13, rotate: -28 },
  // Reaching across the nose as well as the cheeks.
  sunburst: { cx: 46, cy: 68, rx: 14, ry: 6, rotate: -6 },
};

export type LinerStyle = 'none' | 'tightline' | 'winged' | 'graphic' | 'smudged';

/** The liner on the left eye; the right is mirrored. Eyes sit at cy 62. */
export const LINERS: Record<Exclude<LinerStyle, 'none'>,
  { d: string; width: number; opacity: number }> = {
  // A thin line on the lash base only.
  tightline: { d: 'M43 60 Q49 57 55 60', width: 1.6, opacity: 0.95 },
  // The same line, extended past the outer corner and lifted.
  winged: { d: 'M43 60 Q49 57 55 59 L60 55', width: 2.2, opacity: 1 },
  // A line above the crease as well as on the lash base.
  graphic: { d: 'M43 60 Q49 57 55 59 L60 55 M44 54 Q50 51 57 53', width: 2, opacity: 1 },
  // Soft and thick, blended rather than drawn.
  smudged: { d: 'M42 60 Q49 56 56 60', width: 4.5, opacity: 0.45 },
};
