/**
 * Garment silhouettes, drawn as vectors.
 *
 * Original artwork, bundled with the app: no hotlinked photography, nothing
 * licensed from elsewhere, and nothing that can fail to load. The figure is an
 * abstract croquis — no face, no body detail — because the point is the shape
 * of the garment, and because the app has no business drawing a body for
 * someone it has never seen.
 *
 * Adding a photo library later means swapping the `source` on ReferenceImage;
 * these stay as the fallback.
 */
import React from 'react';
import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg';

import { toneFor } from './palette';
import { useTheme } from '../../theme/ThemeProvider';

const W = 120;
const H = 200;

export type Silhouette =
  | 'a_line' | 'straight' | 'wrap' | 'fit_and_flare' | 'wide_leg' | 'column'
  | 'draped' | 'structured' | 'pleated' | 'cropped' | 'relaxed' | 'fitted'
  | 'flared' | 'fluid' | 'fitted_waist' | 'fitted_bodice' | 'varied'
  | 'flat' | 'heeled' | 'soft';

/** The garment outline for each silhouette, drawn from the shoulder down. */
const SHAPES: Record<string, string> = {
  a_line: 'M40 60 L80 60 L96 168 L24 168 Z',
  straight: 'M40 60 L80 60 L82 168 L38 168 Z',
  wrap: 'M40 60 L80 60 L84 168 L36 168 Z M60 60 L44 116 L60 128 L76 116 Z',
  fit_and_flare: 'M42 60 L78 60 L74 104 L100 172 L20 172 Z',
  wide_leg: 'M40 60 L80 60 L80 104 L96 176 L64 176 L60 116 L56 176 L24 176 L40 104 Z',
  column: 'M42 60 L78 60 L78 176 L42 176 Z',
  draped: 'M40 60 L80 60 Q92 120 84 172 L36 172 Q28 120 40 60 Z',
  structured: 'M36 58 L84 58 L86 120 L80 168 L40 168 L34 120 Z',
  pleated: 'M40 60 L80 60 L80 100 L94 168 L26 168 L40 100 Z',
  cropped: 'M38 58 L82 58 L84 112 L36 112 Z M40 112 L80 112 L80 176 L40 176 Z',
  relaxed: 'M34 58 L86 58 L88 122 L84 172 L36 172 L32 122 Z',
  fitted: 'M42 60 L78 60 L74 112 L76 170 L44 170 L46 112 Z',
  flared: 'M42 60 L78 60 L76 100 L104 176 L16 176 L44 100 Z',
  fluid: 'M40 60 L80 60 Q88 116 82 174 L38 174 Q32 116 40 60 Z',
  soft: 'M38 62 Q60 54 82 62 Q88 120 80 170 L40 170 Q32 120 38 62 Z',
};

// Indian garments had no shapes at all: every saree, lehenga, kurta and
// anarkali fell through to `straight`, which is a Western shift dress. A
// fashion library that draws a saree as a shift is not covering both
// wardrobes, whatever its item list says.
Object.assign(SHAPES, {
  // Pleats at the front, pallu falling from the left shoulder.
  saree: 'M40 60 L80 60 L86 176 L34 176 Z M56 96 L56 176 M62 96 L62 176 '
    + 'M68 96 L68 176 M40 60 Q24 104 30 168 L44 168 Q36 106 48 66 Z',
  // Fitted blouse, bare midriff, heavy flared skirt.
  lehenga: 'M42 58 L78 58 L80 88 L40 88 Z M44 106 L76 106 L104 178 L16 178 Z',
  // Straight tunic to mid-calf over narrow trousers.
  kurta: 'M38 58 L82 58 L84 150 L36 150 Z M44 150 L56 150 L54 186 L44 186 Z '
    + 'M64 150 L76 150 L76 186 L66 186 Z',
  // Fitted to a high waist, then a full circular flare.
  anarkali: 'M42 58 L78 58 L76 92 L44 92 Z M44 92 L76 92 L106 180 L14 180 Z',
  // Wide gathered trousers, each leg full.
  sharara: 'M40 58 L80 58 L80 102 L40 102 Z M40 102 L58 102 L64 180 L18 180 Z '
    + 'M62 102 L80 102 L102 180 L56 180 Z',
  // Draped and wrapped between the legs.
  dhoti: 'M38 60 L82 60 L84 112 L36 112 Z M36 112 L84 112 Q78 148 66 170 '
    + 'L54 170 Q42 148 36 112 Z',
  // Long straight coat over the whole figure.
  sherwani: 'M36 56 L84 56 L88 168 L32 168 Z M60 56 L60 168',
  // A jacket that stops at the hip, worn open.
  blazer: 'M36 58 L56 58 L58 138 L34 138 Z M64 58 L84 58 L86 138 L62 138 Z',
  // Knee-length, tapering slightly.
  skirt: 'M40 96 L80 96 L86 156 L34 156 Z',
  // Bulk and length past the knee.
  outerwear: 'M32 56 L88 56 L92 176 L28 176 Z M60 56 L60 176',
  shirt: 'M40 58 L80 58 L82 118 L38 118 Z M60 58 L60 118',
  trousers: 'M40 96 L80 96 L74 180 L62 180 L60 130 L58 180 L46 180 Z',
  dress: 'M42 58 L78 58 L74 100 L92 168 L28 168 L46 100 Z',
});

SHAPES.fitted_waist = SHAPES.a_line;
SHAPES.fitted_bodice = SHAPES.fit_and_flare;
SHAPES.varied = SHAPES.straight;
SHAPES.flat = SHAPES.straight;
SHAPES.heeled = SHAPES.column;

export interface GarmentFigureProps {
  silhouette: string;
  /** Fill for the garment. Defaults to the theme's gold. */
  colour?: string;
  /** Seed so a list of garments renders a spread of skin tones, not one. */
  seed?: string;
  width?: number;
}

export function GarmentFigure({ silhouette, colour, seed = 'x', width = 120 }: GarmentFigureProps) {
  const { colors } = useTheme();
  const tone = toneFor(seed);
  const shape = SHAPES[silhouette] ?? SHAPES.straight;
  const fill = colour ?? colors.gold;

  return (
    <Svg
      width={width}
      height={(width / W) * H}
      viewBox={`0 0 ${W} ${H}`}
      accessibilityRole="image"
      accessibilityLabel={`${silhouette.replace(/_/g, ' ')} silhouette`}
    >
      {/* Croquis: head, neck and limbs only, with no features. */}
      <G opacity={0.85}>
        <Ellipse cx={60} cy={26} rx={14} ry={17} fill={tone.hex} />
        <Rect x={55} y={42} width={10} height={14} fill={tone.shade} />
        <Rect x={26} y={62} width={8} height={54} rx={4} fill={tone.hex} />
        <Rect x={86} y={62} width={8} height={54} rx={4} fill={tone.hex} />
        <Rect x={50} y={168} width={8} height={26} rx={4} fill={tone.hex} />
        <Rect x={62} y={168} width={8} height={26} rx={4} fill={tone.hex} />
      </G>

      <Path d={shape} fill={fill} opacity={0.9} />
      <Path d={shape} fill="none" stroke={colors.borderStrong} strokeWidth={1} />
    </Svg>
  );
}
