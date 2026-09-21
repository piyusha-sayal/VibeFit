import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, EmptyState, ErrorState, LoadingState, Swatch, Txt } from './index';
import type { Swatch as SwatchData } from '../../services/beautyService';
import { RADIUS, SPACE } from '../../constants/theme';
import { NotFoundError, useColorReport, useSaveLook } from '../../hooks/useBeauty';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  title: string;
  intro: string;
  /** Which palette from the report this explorer shows. */
  pick: (palettes: {
    best: SwatchData[]; neutrals: SwatchData[]; accents: SwatchData[]; compare: SwatchData[];
    lipstick: SwatchData[]; blush: SwatchData[]; eyeshadow: SwatchData[]; hair: SwatchData[];
  }) => { label: string; swatches: SwatchData[] }[];
  /** Extra note shown under the swatches, e.g. the finish caveat on lipstick. */
  caveat?: string;
  lookKind?: 'colour' | 'makeup' | 'hair' | 'outfit';
}

/**
 * Shared engine behind every colour explorer.
 *
 * Selecting two swatches puts them side by side at full width, which is the
 * only comparison a phone screen can make honestly — a swatch seen alone always
 * looks plausible.
 */
export function PaletteExplorer({ title, intro, pick, caveat, lookKind = 'colour' }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const report = useColorReport();
  const saveLook = useSaveLook();
  const [selected, setSelected] = useState<SwatchData[]>([]);
  const [savedName, setSavedName] = useState<string | null>(null);

  const toggle = (swatch: SwatchData) => {
    setSavedName(null);
    setSelected((current) => {
      const exists = current.find((s) => s.hex === swatch.hex);
      if (exists) return current.filter((s) => s.hex !== swatch.hex);
      // Two at a time: a comparison, not a collection.
      return [...current, swatch].slice(-2);
    });
  };

  if (report.isLoading) return <LoadingState label="Reading your colour report…" />;

  if (report.error instanceof NotFoundError) {
    return (
      <ScrollView contentContainerStyle={styles.scroll} style={{ backgroundColor: colors.bg }}>
        <Txt variant="title" serif>{title}</Txt>
        <EmptyState
          title="No colour analysis yet"
          body="These shades come from your own season, so there is nothing to show until a scan finds your colouring."
          actionLabel="Run an analysis"
          onAction={() => router.push('/(tabs)/scan' as never)}
        />
      </ScrollView>
    );
  }

  if (report.isError || !report.data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ErrorState message="Could not load your colour report." onRetry={() => report.refetch()} />
      </View>
    );
  }

  const groups = pick(report.data.palettes);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="title" serif>{title}</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs, marginBottom: SPACE.lg }}>
        {intro}
      </Txt>
      <Card variant="tinted" accent="gold" style={{ marginBottom: SPACE.xl }}>
        <Txt variant="overline" tone="muted">Your season</Txt>
        <Txt variant="heading" serif style={{ marginTop: 2 }}>{report.data.label}</Txt>
      </Card>

      {groups.map((group) => (
        <View key={group.label} style={{ marginBottom: SPACE.xl }}>
          <Txt variant="overline" tone="muted" style={{ marginBottom: SPACE.md }}>{group.label}</Txt>
          <View style={styles.grid}>
            {group.swatches.map((s) => (
              <Swatch
                key={`${group.label}-${s.hex}`}
                hex={s.hex}
                name={s.name}
                selected={!!selected.find((x) => x.hex === s.hex)}
                onPress={() => toggle(s)}
              />
            ))}
          </View>
        </View>
      ))}

      {caveat ? (
        <Card variant="outlined" style={{ marginBottom: SPACE.xl }}>
          <Txt variant="bodySm" tone="muted">{caveat}</Txt>
        </Card>
      ) : null}

      {selected.length ? (
        <Card style={{ marginBottom: SPACE.xl }}>
          <Txt variant="overline" tone="muted">
            {selected.length === 2 ? 'Side by side' : 'Selected — pick one more to compare'}
          </Txt>
          <View style={styles.compareRow}>
            {selected.map((s) => (
              <View key={s.hex} style={{ flex: 1 }}>
                <View style={[styles.compareBlock, { backgroundColor: s.hex, borderColor: colors.borderStrong }]} />
                <Txt variant="bodySm" weight="semibold" style={{ marginTop: SPACE.sm }}>{s.name}</Txt>
                <Txt variant="caption" tone="subtle">{s.hex}</Txt>
              </View>
            ))}
          </View>
          <Button
            label={savedName ? 'Saved to your looks' : 'Save these to my looks'}
            variant="secondary"
            loading={saveLook.isPending}
            disabled={!!savedName}
            style={{ marginTop: SPACE.lg }}
            onPress={async () => {
              const name = `${title}: ${selected.map((s) => s.name).join(' + ')}`;
              await saveLook.mutateAsync({
                name,
                kind: lookKind,
                payload: { swatches: selected, season: report.data!.label },
              });
              setSavedName(name);
            }}
          />
          {saveLook.isError ? <ErrorState message="Could not save that." /> : null}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  center: { flex: 1, justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  compareRow: { flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md },
  compareBlock: { height: 96, borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth * 2 },
});
