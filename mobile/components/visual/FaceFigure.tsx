/**
 * A face for the hairstyle, makeup and accessory references.
 *
 * Original vectors, bundled. Skin tone and hair texture are explicit inputs so
 * a list shows a range rather than one appearance repeated — a hairstyle
 * library that draws every cut on straight hair is not a library, and a makeup
 * library rendered only on fair skin is worse.
 *
 * It is deliberately abstract. This is a diagram of where a style sits, not a
 * prediction of what anyone will look like.
 */
import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { HAIR_COLOURS, HairTexture, SkinTone, toneFor } from './palette';
import {
  BLUSH_ZONES, FRINGES, HAIR_SILHOUETTES, LENGTH_SCALE, LINERS, STROKE_FRINGES,
  type BlushPlacement, type Fringe, type HairSilhouette, type LinerStyle,
} from './shapes';
import { useTheme } from '../../theme/ThemeProvider';

const SIZE = 120;

/** Outer hair mass, by length. */
const HAIR_SHAPES: Record<string, string> = {
  short: 'M28 54 Q60 16 92 54 Q92 34 60 26 Q28 34 28 54 Z',
  medium: 'M24 92 Q20 30 60 24 Q100 30 96 92 Q86 58 60 52 Q34 58 24 92 Z',
  long: 'M22 118 Q16 28 60 22 Q104 28 98 118 Q88 62 60 54 Q32 62 22 118 Z',
};

/** Texture is drawn as the edge treatment on the hair mass. */
function textureEdge(texture: HairTexture, length: string): string | null {
  const y = length === 'short' ? 58 : length === 'medium' ? 92 : 116;
  switch (texture) {
    case 'wavy':
      return `M22 ${y} q10 -10 20 0 t20 0 t20 0 t18 0`;
    case 'curly':
      return `M22 ${y} q8 -12 16 0 t16 0 t16 0 t16 0 t14 0`;
    case 'coily':
      return `M20 ${y - 4} q6 -14 12 0 t12 0 t12 0 t12 0 t12 0 t12 0`;
    default:
      return null;
  }
}

export interface FaceFigureProps {
  hairLength?: 'short' | 'medium' | 'long';
  /**
   * The shape of the cut. Length alone put twelve short styles — a buzz cut
   * and a French bob among them — on the same drawing.
   */
  hairSilhouette?: HairSilhouette;
  /** Drawn over the forehead. Previously the hairline was one fixed path. */
  fringe?: Fringe;
  hairTexture?: HairTexture;
  hairColour?: keyof typeof HAIR_COLOURS | string;
  /** Deterministic skin tone. Pass the item key so a list shows a spread. */
  seed?: string;
  tone?: SkinTone;
  /** Highlight zones for makeup references. */
  emphasis?: ('eyes' | 'lips' | 'cheeks' | 'brows')[];
  emphasisColour?: string;
  /** Where blush sits — the question a blush screen exists to answer. */
  blush?: BlushPlacement;
  /** The liner shape. A swatch cannot show the difference between these. */
  liner?: LinerStyle;
  size?: number;
  label?: string;
}

export function FaceFigure({
  hairLength = 'medium',
  hairSilhouette,
  fringe = 'none',
  hairTexture = 'straight',
  hairColour = 'darkBrown',
  seed = 'face',
  tone,
  emphasis = [],
  emphasisColour,
  blush = 'none',
  liner = 'none',
  size = 120,
  label,
}: FaceFigureProps) {
  const { colors } = useTheme();
  const skin = tone ?? toneFor(seed);
  const hair = HAIR_COLOURS[hairColour as string] ?? (hairColour as string);
  const accent = emphasisColour ?? colors.gold;
  const edge = textureEdge(hairTexture, hairLength);
  // A named silhouette wins; without one, length behaves as it always did.
  const outline = hairSilhouette
    ? HAIR_SILHOUETTES[hairSilhouette]
    : HAIR_SHAPES[hairLength];
  const reach = LENGTH_SCALE[hairLength] ?? 1;
  const fringePath = FRINGES[fringe];
  const fringeIsStroke = STROKE_FRINGES.includes(fringe);
  const blushZone = blush === 'none' ? null : BLUSH_ZONES[blush];
  const linerShape = liner === 'none' ? null : LINERS[liner];

  const shows = (zone: string) => emphasis.includes(zone as never);

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      accessibilityRole="image"
      accessibilityLabel={label ?? `${hairTexture} ${hairLength} hair`}
    >
      {/* Hair behind the face. Scaled from the crown so the same silhouette
          reads as short, medium or long without needing three copies. */}
      <G transform={`translate(0 ${24 - 24 * reach}) scale(1 ${reach})`}>
        <Path d={outline} fill={hair} />
      </G>

      {/* Face. */}
      <Ellipse cx={60} cy={62} rx={26} ry={32} fill={skin.hex} />
      <Path d="M60 30 a26 32 0 0 0 0 64 z" fill={skin.shade} opacity={0.25} />

      {/* Hair front. Without a fringe this is the plain hairline; with one it
          is the fringe itself, which is what makes the eight options look
          like eight options. */}
      {fringePath === null ? (
        <Path d="M34 46 Q60 24 86 46 Q60 36 34 46 Z" fill={hair} />
      ) : fringeIsStroke ? (
        <>
          <Path d="M34 46 Q60 24 86 46 Q60 36 34 46 Z" fill={hair} />
          <Path d={fringePath} stroke={hair} strokeWidth={2.5} fill="none"
                strokeLinecap="round" />
        </>
      ) : (
        <Path d={fringePath} fill={hair} />
      )}
      {edge ? <Path d={edge} stroke={hair} strokeWidth={5} fill="none" strokeLinecap="round" /> : null}

      {/* Brows. */}
      <G opacity={shows('brows') ? 1 : 0.5}>
        <Rect x={42} y={52} width={14} height={shows('brows') ? 3.5 : 2} rx={1.5}
              fill={shows('brows') ? accent : hair} />
        <Rect x={64} y={52} width={14} height={shows('brows') ? 3.5 : 2} rx={1.5}
              fill={shows('brows') ? accent : hair} />
      </G>

      {/* Eyes. */}
      <G>
        <Ellipse cx={49} cy={62} rx={6} ry={shows('eyes') ? 4.5 : 3.5}
                 fill={shows('eyes') ? accent : colors.textSubtle} opacity={shows('eyes') ? 0.9 : 0.6} />
        <Ellipse cx={71} cy={62} rx={6} ry={shows('eyes') ? 4.5 : 3.5}
                 fill={shows('eyes') ? accent : colors.textSubtle} opacity={shows('eyes') ? 0.9 : 0.6} />
      </G>

      {/* Cheeks. A named placement moves and reshapes the zone; the plain
          emphasis keeps the original pair of circles. */}
      {blushZone ? (
        <G opacity={0.4}>
          <Ellipse cx={blushZone.cx} cy={blushZone.cy} rx={blushZone.rx}
                   ry={blushZone.ry} fill={accent}
                   transform={`rotate(${blushZone.rotate} ${blushZone.cx} ${blushZone.cy})`} />
          <Ellipse cx={120 - blushZone.cx} cy={blushZone.cy} rx={blushZone.rx}
                   ry={blushZone.ry} fill={accent}
                   transform={`rotate(${-blushZone.rotate} ${120 - blushZone.cx} ${blushZone.cy})`} />
        </G>
      ) : shows('cheeks') ? (
        <G opacity={0.45}>
          <Circle cx={42} cy={72} r={7} fill={accent} />
          <Circle cx={78} cy={72} r={7} fill={accent} />
        </G>
      ) : null}

      {/* Liner, drawn on the lash line and mirrored. */}
      {linerShape ? (
        <G opacity={linerShape.opacity}>
          <Path d={linerShape.d} stroke={accent} strokeWidth={linerShape.width}
                fill="none" strokeLinecap="round" />
          <G transform="translate(120 0) scale(-1 1)">
            <Path d={linerShape.d} stroke={accent} strokeWidth={linerShape.width}
                  fill="none" strokeLinecap="round" />
          </G>
        </G>
      ) : null}

      {/* Lips. */}
      <Path
        d="M52 82 q8 -4 16 0 q-8 7 -16 0 z"
        fill={shows('lips') ? accent : skin.shade}
        opacity={shows('lips') ? 0.95 : 0.7}
      />
    </Svg>
  );
}
