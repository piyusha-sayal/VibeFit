import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Chip, EmptyState, ErrorState, LoadingState, SectionHeader, Txt } from '../../components/ds';
import { RADIUS, SPACE } from '../../constants/theme';
import { NotFoundError, useColorReport, useSaveLook } from '../../hooks/useBeauty';
import { useTheme } from '../../theme/ThemeProvider';

/** Metal swatches are fixed physical colours, not season data. */
const METALS = [
  { key: 'Yellow gold', hex: '#d4af37', note: 'Warms everything near it. The default in most Indian jewellery.' },
  { key: 'Antique gold', hex: '#b08d57', note: 'Gold with the shine taken down — sits with traditional and muted palettes.' },
  { key: 'Silver', hex: '#c0c4c9', note: 'Cools and sharpens. Reads modern against tailoring.' },
  { key: 'White gold', hex: '#dfe3e6', note: 'Silver’s brighter cousin; holds up beside diamonds and stones.' },
  { key: 'Rose gold', hex: '#d9a0a0', note: 'Between the two, which is why it suits almost everyone.' },
  { key: 'Copper', hex: '#b87333', note: 'Deeply warm. Strong with rust, olive and terracotta.' },
  { key: 'Oxidised silver', hex: '#8a8d90', note: 'Matte and darkened — the usual partner for chikankari and cottons.' },
  { key: 'Mixed metals', hex: '#b9a68c', note: 'Works when one metal dominates and the other repeats at least twice.' },
];

export default function JewelleryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const report = useColorReport();
  const saveLook = useSaveLook();
  const [picked, setPicked] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  if (report.isLoading) return <LoadingState label="Reading your colour report…" />;

  if (report.error instanceof NotFoundError) {
    return (
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
        <Txt variant="title" serif>Jewellery metals</Txt>
        <EmptyState
          title="No season yet"
          body="Which metal lights you up depends on your undertone, so this needs an analysis first."
          actionLabel="Run an analysis"
          onAction={() => router.push('/(tabs)/scan' as never)}
        />
      </ScrollView>
    );
  }

  if (report.isError || !report.data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ErrorState message="Could not load your report." onRetry={() => report.refetch()} />
      </View>
    );
  }

  const recommended = report.data.metals;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="title" serif>Jewellery metals</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs, marginBottom: SPACE.xl }}>
        A leaning, not a rule. Most people wear both; this is the one that tends to look lit rather than
        placed.
      </Txt>

      <Card variant="tinted" accent="gold">
        <Txt variant="overline" tone="muted">Suggested for {report.data.label}</Txt>
        <Txt variant="heading" serif style={{ marginTop: 2 }}>{recommended.join(' · ')}</Txt>
      </Card>

      <View style={{ marginTop: SPACE.xxl }}>
        <SectionHeader title="Every metal" />
        {METALS.map((metal) => {
          const isRecommended = recommended.some((m) => m.toLowerCase() === metal.key.toLowerCase());
          const selected = picked.includes(metal.key);
          return (
            <Card
              key={metal.key}
              style={{ marginBottom: SPACE.sm }}
              onPress={() => {
                setSaved(false);
                setPicked((c) => (c.includes(metal.key) ? c.filter((k) => k !== metal.key) : [...c, metal.key]));
              }}
            >
              <View style={styles.metalRow}>
                <View style={[styles.metalDot, { backgroundColor: metal.hex, borderColor: selected ? colors.text : colors.borderStrong, borderWidth: selected ? 2.5 : 1 }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.rowBetween}>
                    <Txt variant="body" weight="semibold">{metal.key}</Txt>
                    {isRecommended ? <Chip label="Yours" accent="gold" selected /> : null}
                  </View>
                  <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{metal.note}</Txt>
                </View>
              </View>
            </Card>
          );
        })}
      </View>

      {picked.length ? (
        <Button
          label={saved ? 'Saved to your looks' : `Save ${picked.length} metal${picked.length > 1 ? 's' : ''}`}
          variant="secondary"
          disabled={saved}
          loading={saveLook.isPending}
          style={{ marginTop: SPACE.lg }}
          onPress={async () => {
            await saveLook.mutateAsync({
              name: `Metals: ${picked.join(', ')}`,
              kind: 'colour',
              payload: { metals: picked, season: report.data!.label },
            });
            setSaved(true);
          }}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  center: { flex: 1, justifyContent: 'center' },
  metalRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.lg },
  metalDot: { width: 46, height: 46, borderRadius: RADIUS.pill },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm },
});
