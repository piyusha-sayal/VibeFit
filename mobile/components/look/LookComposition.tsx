/**
 * The visual composition of a complete look.
 *
 * Read-only on purpose: this draws the look, and the builder owns the editing.
 * Splitting them keeps one enormous component from appearing, and lets the
 * same composition render on a concept card, in the builder and on a saved
 * look without three copies of the layout.
 *
 * Everything drawn here is original vector illustration. It is not a
 * photograph, it is not a prediction of how anything will look on the person,
 * and nothing on this screen implies otherwise.
 */
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Txt } from '../ds';
import { FaceFigure, GarmentFigure } from '../visual';
import { silhouetteFor } from '../visual/shapes';
import { RADIUS, SPACE } from '../../constants/theme';
import type { LookComposition as Composition, LookPiece } from '../../services/lookService';
import { useTheme } from '../../theme/ThemeProvider';

/** Which zones a makeup aesthetic actually emphasises, for the illustration. */
export const MAKEUP_EMPHASIS: Record<string, ('eyes' | 'lips' | 'cheeks' | 'brows')[]> = {
  natural: ['cheeks'],
  no_makeup: ['brows'],
  clean_girl: ['cheeks', 'brows'],
  glass_skin: ['cheeks'],
  korean_gradient: ['lips', 'cheeks'],
  soft_glam: ['eyes', 'lips'],
  full_glam: ['eyes', 'lips', 'cheeks'],
  indian_bridal: ['eyes', 'lips', 'brows'],
  festive_indian: ['eyes', 'lips'],
  smokey: ['eyes'],
  monochrome: ['lips', 'cheeks'],
  editorial: ['eyes', 'brows'],
  vintage: ['eyes', 'lips'],
  office: ['brows', 'lips'],
};

const HAIR_LENGTH: Record<string, 'short' | 'medium' | 'long'> = {
  short: 'short', medium: 'medium', long: 'long',
};

function leadPiece(pieces: LookPiece[]): LookPiece | undefined {
  return pieces.find((p) => p.role === 'main') ?? pieces[0];
}

function supportingPieces(pieces: LookPiece[]): LookPiece[] {
  const lead = leadPiece(pieces);
  return pieces.filter((p) => p !== lead && p.role !== 'bag');
}

interface Props {
  composition: Composition;
  /** Compact drops the supporting figures — for cards and comparison rows. */
  compact?: boolean;
}

export function LookComposition({ composition, compact = false }: Props) {
  const { colors } = useTheme();
  const pieces = composition.outfit.pieces;
  const lead = leadPiece(pieces);
  const swatches = pieces.map((p) => p.colour).filter(Boolean);

  return (
    <View style={styles.wrap}>
      {/* ------------------------------------------------------ the outfit */}
      <View style={[styles.stage, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <View style={styles.figures}>
          {lead ? (
            <GarmentFigure
              silhouette={lead.silhouette}
              colour={lead.colour?.hex}
              seed={lead.key}
              width={compact ? 96 : 130}
            />
          ) : null}
          {!compact && supportingPieces(pieces).slice(0, 3).map((piece) => (
            <GarmentFigure
              key={piece.slot}
              silhouette={piece.silhouette}
              colour={piece.colour?.hex}
              seed={piece.key}
              width={64}
            />
          ))}
        </View>
        <Txt variant="caption" tone="subtle" style={styles.centred}>
          Styling illustration — not a photograph or a try-on.
        </Txt>
      </View>

      {/* ----------------------------------------------------- the palette */}
      {swatches.length ? (
        <View style={styles.palette}>
          {swatches.map((colour, index) => (
            <View key={`${colour!.hex}-${index}`} style={styles.swatchCell}>
              <View style={[styles.swatch, { backgroundColor: colour!.hex, borderColor: colors.border }]} />
              <Txt variant="caption" tone="subtle" numberOfLines={1}>{colour!.name}</Txt>
            </View>
          ))}
        </View>
      ) : (
        <Txt variant="caption" tone="subtle" style={styles.centred}>
          {composition.colours.note ?? 'No colours chosen yet.'}
        </Txt>
      )}

      {composition.colours.harmony && !compact ? (
        <Txt variant="caption" tone="muted" style={styles.centred}>
          {composition.colours.harmony.label} · {composition.colours.harmony.why}
        </Txt>
      ) : null}

      {/* --------------------------------------- hair, makeup and jewellery */}
      {!compact ? (
        <View style={styles.trio}>
          <Tile label="Hair" value={composition.hair.styleName}>
            <FaceFigure
              seed={composition.hair.style ?? 'hair'}
              size={62}
              hairLength={HAIR_LENGTH[composition.hair.length ?? 'medium'] ?? 'medium'}
              // The composed look was drawing the generic outline for its own
              // chosen cut, so two different looks could show the same hair.
              hairSilhouette={silhouetteFor(
                composition.hair.style ?? '',
                HAIR_LENGTH[composition.hair.length ?? 'medium'] ?? 'medium',
              )}
              hairColour={composition.hairColour.hex ?? undefined}
              label={`${composition.hair.styleName ?? 'Hair'}, schematic illustration`}
            />
          </Tile>

          <Tile label="Makeup" value={composition.makeup.aestheticName}>
            <FaceFigure
              seed={composition.makeup.aesthetic ?? 'makeup'}
              size={62}
              emphasis={MAKEUP_EMPHASIS[composition.makeup.aesthetic ?? ''] ?? ['lips']}
              emphasisColour={composition.lipstick.hex ?? undefined}
              label={`${composition.makeup.aestheticName ?? 'Makeup'}, schematic illustration`}
            />
          </Tile>

          <Tile label="Jewellery" value={composition.jewellery.metalName}>
            <View
              accessibilityRole="image"
              accessibilityLabel={`${composition.jewellery.metalName ?? 'Metal'} swatch`}
              style={[
                styles.metal,
                {
                  backgroundColor: composition.jewellery.metalHex ?? colors.gold,
                  borderColor: colors.border,
                },
              ]}
            />
          </Tile>
        </View>
      ) : null}
    </View>
  );
}

function Tile({ label, value, children }: {
  label: string; value: string | null; children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {children}
      <Txt variant="overline" tone="subtle" style={{ marginTop: SPACE.xs }}>{label}</Txt>
      <Txt variant="caption" numberOfLines={1}>{value ?? 'Not set'}</Txt>
    </View>
  );
}

/** The colour row on its own, for places that only need the palette. */
export function LookSwatches({ swatches, size = 26 }: {
  swatches: { hex: string; name: string }[]; size?: number;
}) {
  const { colors } = useTheme();
  if (!swatches.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.swatchRow}>
      {swatches.map((colour, index) => (
        <View
          key={`${colour.hex}-${index}`}
          accessibilityLabel={colour.name}
          style={[
            styles.dot,
            { width: size, height: size, borderRadius: size / 2,
              backgroundColor: colour.hex, borderColor: colors.border },
          ]}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACE.md },
  stage: {
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: SPACE.lg,
    paddingHorizontal: SPACE.md,
    gap: SPACE.sm,
  },
  figures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: SPACE.sm,
  },
  centred: { textAlign: 'center' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, justifyContent: 'center' },
  swatchCell: { alignItems: 'center', gap: 4, maxWidth: 86 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth },
  trio: { flexDirection: 'row', gap: SPACE.sm },
  tile: {
    flex: 1,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.xs,
  },
  metal: { width: 46, height: 46, borderRadius: 23, borderWidth: StyleSheet.hairlineWidth },
  swatchRow: { flexGrow: 0 },
  dot: { borderWidth: StyleSheet.hairlineWidth, marginRight: 6 },
});
