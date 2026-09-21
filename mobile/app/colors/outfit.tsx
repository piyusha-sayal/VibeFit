import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, EmptyState, ErrorState, LoadingState, ProgressBar, SectionHeader, Swatch, Txt } from '../../components/ds';
import { RADIUS, SPACE } from '../../constants/theme';
import { NotFoundError, useColorReport, useSaveLook } from '../../hooks/useBeauty';
import type { Swatch as SwatchData } from '../../services/beautyService';
import { useTheme } from '../../theme/ThemeProvider';
import { describePair } from '../../utils/colorHarmony';

export default function OutfitMatcherScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const report = useColorReport();
  const saveLook = useSaveLook();
  const [pair, setPair] = useState<SwatchData[]>([]);
  const [saved, setSaved] = useState(false);

  const harmony = useMemo(
    () => (pair.length === 2 ? describePair(pair[0].hex, pair[1].hex) : null),
    [pair],
  );

  if (report.isLoading) return <LoadingState label="Reading your palette…" />;

  if (report.error instanceof NotFoundError) {
    return (
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
        <Txt variant="title" serif>Outfit colour matcher</Txt>
        <EmptyState
          title="No palette to match from"
          body="The matcher combines colours from your own season."
          actionLabel="Run an analysis"
          onAction={() => router.push('/(tabs)/scan' as never)}
        />
      </ScrollView>
    );
  }

  if (report.isError || !report.data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ErrorState message="Could not load your palette." onRetry={() => report.refetch()} />
      </View>
    );
  }

  const all = [
    ...report.data.palettes.best,
    ...report.data.palettes.neutrals,
    ...report.data.palettes.accents,
  ];

  const toggle = (swatch: SwatchData) => {
    setSaved(false);
    setPair((current) => {
      if (current.find((s) => s.hex === swatch.hex)) return current.filter((s) => s.hex !== swatch.hex);
      return [...current, swatch].slice(-2);
    });
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="title" serif>Outfit colour matcher</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs, marginBottom: SPACE.xl }}>
        Pick two colours from your palette. The relationship between them is measured, not guessed —
        plain geometry on the colour wheel.
      </Txt>

      <SectionHeader title="Your colours" />
      <View style={styles.grid}>
        {all.map((s) => (
          <Swatch
            key={s.hex}
            hex={s.hex}
            name={s.name}
            selected={!!pair.find((x) => x.hex === s.hex)}
            onPress={() => toggle(s)}
          />
        ))}
      </View>

      {pair.length === 2 && harmony ? (
        <Card style={{ marginTop: SPACE.xxl }}>
          <View style={styles.previewRow}>
            <View style={[styles.previewBlock, { backgroundColor: pair[0].hex, borderColor: colors.borderStrong }]} />
            <View style={[styles.previewBlock, { backgroundColor: pair[1].hex, borderColor: colors.borderStrong }]} />
          </View>
          <Txt variant="heading" serif style={{ marginTop: SPACE.lg }}>{harmony.label}</Txt>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>{harmony.note}</Txt>
          <View style={{ marginTop: SPACE.lg }}>
            <Txt variant="caption" tone="subtle" style={{ marginBottom: SPACE.xs }}>
              How reliably this reads as deliberate
            </Txt>
            <ProgressBar value={harmony.strength} label="Pairing strength" />
          </View>
          <Txt variant="bodySm" style={{ marginTop: SPACE.lg }}>
            {pair[0].name} + {pair[1].name}
          </Txt>
          <Button
            label={saved ? 'Saved to your looks' : 'Save this combination'}
            variant="secondary"
            disabled={saved}
            loading={saveLook.isPending}
            style={{ marginTop: SPACE.md }}
            onPress={async () => {
              await saveLook.mutateAsync({
                name: `${pair[0].name} + ${pair[1].name}`,
                kind: 'outfit',
                payload: { pair, harmony: harmony.label, season: report.data!.label },
              });
              setSaved(true);
            }}
          />
          {saveLook.isError ? <ErrorState message="Could not save that combination." /> : null}
        </Card>
      ) : (
        <Card variant="outlined" style={{ marginTop: SPACE.xxl }}>
          <Txt variant="bodySm" tone="muted">
            {pair.length === 1 ? 'Pick one more colour to see how the two work together.' : 'Pick two colours to start.'}
          </Txt>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  center: { flex: 1, justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  previewRow: { flexDirection: 'row', gap: SPACE.md },
  previewBlock: { flex: 1, height: 110, borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth * 2 },
});
