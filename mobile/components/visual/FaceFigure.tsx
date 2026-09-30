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
import { usePersonaStore } from '../../store/personaStore';
import {
  faceOutline, lensPath, type FaceShape, type FrameStyle, type Presentation,
} from './features';

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
  /** Female or male features. Defaults to the styles the person asked to see. */
  presentation?: Presentation;
  faceShape?: FaceShape;
  glasses?: FrameStyle;
  glassesColour?: string;
  size?: number;
  label?: string;
}

export function FaceFigure({
  hairLength: hairLengthProp,
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
  presentation: presentationProp,
  faceShape = 'oval',
  glasses,
  glassesColour = '#2B2622',
  size = 120,
  label,
}: FaceFigureProps) {
  const { colors } = useTheme();
  const stored = usePersonaStore((st) => st.genderPresentation);
  const presentation: Presentation = presentationProp ?? (stored === 'masculine' ? 'male' : 'female');
  const male = presentation === 'male';
  const hairLength = hairLengthProp ?? (male ? 'short' : 'medium');
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
      {/* Shoulders and neck, so the figure reads as a person, not a mask. */}
      <Path
        d={male ? 'M8 120 C10 104 30 98 60 98 C90 98 110 104 112 120 Z' : 'M16 120 C18 106 34 100 60 100 C86 100 102 106 104 120 Z'}
        fill={male ? '#8E9FAE' : '#D8C3B0'}
      />
      <Rect x={52} y={84} width={16} height={18} rx={6} fill={skin.shade} />

      {/* Hair behind the face. Scaled from the crown so the same silhouette
          reads as short, medium or long without needing three copies. */}
      <G transform={`translate(0 ${24 - 24 * reach}) scale(1 ${reach})`}>
        <Path d={outline} fill={hair} />
      </G>

      {/* Ears, then the face in the chosen shape. */}
      <Ellipse cx={33} cy={64} rx={4} ry={6.5} fill={skin.shade} />
      <Ellipse cx={87} cy={64} rx={4} ry={6.5} fill={skin.shade} />
      <Path d={faceOutline(faceShape, presentation)} fill={skin.hex} />
      {male ? (
        // A light shadow along the jaw reads as a masculine face at icon size.
        <Path d="M40 78 Q60 100 80 78 Q72 90 60 91 Q48 90 40 78 Z" fill={skin.shade} opacity={0.35} />
      ) : null}

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

      {/* Brows: arched and finer for female, straighter and heavier for male. */}
      <G opacity={shows('brows') ? 1 : 0.85}>
        <Path
          d={male ? 'M42 54 Q49 51.5 56 53.5' : 'M42 54 Q49 49.5 56 53'}
          stroke={shows('brows') ? accent : hair}
          strokeWidth={male ? 3 : shows('brows') ? 3 : 2}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={male ? 'M64 53.5 Q71 51.5 78 54' : 'M64 53 Q71 49.5 78 54'}
          stroke={shows('brows') ? accent : hair}
          strokeWidth={male ? 3 : shows('brows') ? 3 : 2}
          fill="none"
          strokeLinecap="round"
        />
      </G>

      {/* Eyeshadow sits on the lid, above the eye it frames. */}
      {shows('eyes') ? (
        <G opacity={0.75}>
          <Ellipse cx={49} cy={59} rx={7} ry={3.2} fill={accent} />
          <Ellipse cx={71} cy={59} rx={7} ry={3.2} fill={accent} />
        </G>
      ) : null}

      {/* Eyes: white, iris, pupil, and a lash line. */}
      {[49, 71].map((cx) => (
        <G key={cx}>
          <Ellipse cx={cx} cy={62} rx={5.4} ry={3.3} fill="#FFFFFF" />
          <Circle cx={cx} cy={62} r={2.5} fill="#5A3E2B" />
          <Circle cx={cx} cy={62} r={1.1} fill="#1E1612" />
          <Circle cx={cx + 0.9} cy={61.1} r={0.6} fill="#FFFFFF" />
          <Path
            d={`M${cx - 5.6} ${62} Q${cx} ${57.6} ${cx + 5.6} ${62}`}
            stroke="#2B2622"
            strokeWidth={male ? 1 : 1.5}
            fill="none"
            strokeLinecap="round"
          />
        </G>
      ))}

      {/* Nose. */}
      <Path d="M60 64 Q57.5 72 59 74 Q61 75 63 73.5" stroke={skin.shade} strokeWidth={1.6}
            fill="none" strokeLinecap="round" />

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

      {/* Lips: fuller with a cupid's bow for female, a quieter line for male. */}
      {male && !shows('lips') ? (
        <Path d="M53 82 Q60 84.5 67 82" stroke={skin.shade} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      ) : (
        <Path
          d="M51 81.5 Q55 78.5 60 80.5 Q65 78.5 69 81.5 Q60 89 51 81.5 Z"
          fill={shows('lips') ? accent : '#C47A72'}
          opacity={shows('lips') ? 0.95 : 0.8}
        />
      )}

      {/* Glasses over everything else on the face. */}
      {glasses ? (
        <G>
          <Path d={lensPath(glasses, 49, -1)} stroke={glassesColour} strokeWidth={2.4}
                fill="rgba(255,255,255,0.22)" strokeLinejoin="round" />
          <Path d={lensPath(glasses, 71, 1)} stroke={glassesColour} strokeWidth={2.4}
                fill="rgba(255,255,255,0.22)" strokeLinejoin="round" />
          <Path d="M57.5 61 Q60 58.5 62.5 61" stroke={glassesColour} strokeWidth={2} fill="none" />
          <Path d="M38.5 60 L34 59 M81.5 60 L86 59" stroke={glassesColour} strokeWidth={2} strokeLinecap="round" />
          {glasses === 'browline' ? (
            <Path d="M39 57 H59 M61 57 H81" stroke={glassesColour} strokeWidth={4.5} strokeLinecap="round" />
          ) : null}
        </G>
      ) : null}
    </Svg>
  );
}
