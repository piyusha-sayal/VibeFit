import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, Chip, LoadingState, Txt } from '../../components/ds';
import { GarmentFigure, INSPIRATION_NOTE } from '../../components/visual';
import { SPACE } from '../../constants/theme';
import { useGarments, useStyleProfile, useUpdateStyleProfile } from '../../hooks/useStyle';
import { useTheme } from '../../theme/ThemeProvider';

/** What each shape does, in plain terms. No shape is better than another. */
const SILHOUETTE_NOTES: Record<string, string> = {
  a_line: 'Narrow at the top, widening to the hem. Skims the hip rather than following it.',
  straight: 'The same width top to bottom. The most neutral shape here.',
  wrap: 'Crosses and ties, so you set the waist and the neckline yourself.',
  fit_and_flare: 'Close through the body, then full. The flare point is where the eye lands.',
  wide_leg: 'Volume below the waist, which balances width above it.',
  column: 'One unbroken vertical line.',
  draped: 'Fabric falling in folds rather than cut to a shape. Adjusts to you.',
  structured: 'Holds its own shape instead of following yours.',
  pleated: 'Folds that read as vertical lines while still moving.',
  cropped: 'Ends above the waist, which marks where the waist is.',
  relaxed: 'Loose without being shapeless.',
  fitted: 'Follows the line you already have.',
  flared: 'Widens sharply from a fixed point.',
  fluid: 'Falls rather than stands. Very little structure.',
};

function normalise(value: string): string {
  return value.toLowerCase().replace(/[- ]/g, '_');
}

export default function SilhouetteExplorerScreen() {
  const { colors } = useTheme();
  const garments = useGarments();
  const profile = useStyleProfile();
  const update = useUpdateStyleProfile();
  const [active, setActive] = useState<string | null>(null);

  if (garments.isLoading) return <LoadingState />;

  const shapes = Array.from(
    new Set((garments.data?.garments ?? []).map((g) => g.silhouette)),
  ).filter((s) => SILHOUETTE_NOTES[s]);

  const chosen = profile.data?.silhouettePreferences ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Silhouettes</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        The shape a garment makes, and what each one does. Keep the ones you
        like in your profile.
      </Txt>

      <View style={{ marginTop: SPACE.xl }}>
        {shapes.map((shape) => {
          const examples = (garments.data?.garments ?? [])
            .filter((g) => g.silhouette === shape)
            .slice(0, 4);
          const selected = chosen.some((s) => normalise(s) === shape);

          return (
            <Card
              key={shape}
              variant={selected ? 'tinted' : 'plain'}
              accent="gold"
              style={{ marginBottom: SPACE.md }}
              onPress={() => setActive(active === shape ? null : shape)}
            >
              <View style={styles.row}>
                <GarmentFigure silhouette={shape} seed={shape} width={70} />
                <View style={{ flex: 1, marginLeft: SPACE.lg }}>
                  <Txt variant="heading" style={{ textTransform: 'capitalize' }}>
                    {shape.replace(/_/g, ' ')}
                  </Txt>
                  <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>
                    {SILHOUETTE_NOTES[shape]}
                  </Txt>
                  <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xs }}>
                    {examples.length} pieces in this shape
                  </Txt>
                </View>
              </View>

              {active === shape ? (
                <View style={styles.chips}>
                  {examples.map((g) => <Chip key={g.key} label={g.name} accent="sage" />)}
                </View>
              ) : null}

              <Txt
                variant="caption"
                tone="accent"
                weight="semibold"
                style={{ marginTop: SPACE.sm }}
                onPress={() => update.mutate({
                  silhouettePreferences: selected
                    ? chosen.filter((s) => normalise(s) !== shape)
                    : [...chosen, shape],
                })}
              >
                {selected ? 'In your profile — tap to remove' : 'Add to my profile'}
              </Txt>
            </Card>
          );
        })}
      </View>

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.lg }}>
        {INSPIRATION_NOTE}
      </Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.md },
});
