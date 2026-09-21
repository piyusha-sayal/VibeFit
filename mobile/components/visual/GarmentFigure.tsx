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
