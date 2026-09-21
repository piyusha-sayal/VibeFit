import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, EmptyState, ErrorState, LoadingState, SectionHeader, Swatch, Txt } from '../../components/ds';
import { RADIUS, SPACE } from '../../constants/theme';
import { NotFoundError, useColorReport } from '../../hooks/useBeauty';
import { useTheme } from '../../theme/ThemeProvider';

/** Deliberately coarse: a selfie cannot support "83.4%". */
function confidenceWords(confidence: number): { label: string; note: string } {
  if (confidence >= 0.7) {
    return {
      label: 'Reasonably confident',
      note: 'Your undertone read clearly and the photo supported the call.',
    };
  }
  if (confidence >= 0.5) {
    return {
      label: 'A working estimate',
      note: 'Good enough to explore with, worth checking against the runner-up season.',
    };
  }
  return {
    label: 'A loose estimate',
    note: 'Something about this photo limited the reading. Compare both seasons in daylight.',
  };
}

const MEASUREMENTS: { key: 'undertone' | 'depth' | 'chroma' | 'contrast'; label: string; help: string }[] = [
  { key: 'undertone', label: 'Undertone', help: 'Whether your skin leans warm, cool, neutral or olive.' },
  { key: 'depth', label: 'Depth', help: 'How light or deep your overall colouring is.' },
  { key: 'chroma', label: 'Clarity', help: 'Whether clear, saturated colours or softened ones suit you.' },
  { key: 'contrast', label: 'Contrast', help: 'The distance between your skin, hair and eyes.' },
];

export default function ColorReportScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const report = useColorReport();

  if (report.isLoading) return <LoadingState label="Building your colour report…" />;

  if (report.error instanceof NotFoundError) {
    return (
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
        <Txt variant="display" serif>My colour report</Txt>
        <EmptyState
          title="No analysis to report on"
          body="Either you have not scanned yet, or the last scan did not find a face clearly enough to read colour from. Both are fixable in a minute."
          actionLabel="Run an analysis"
          onAction={() => router.push('/(tabs)/scan' as never)}
        />
        <Card variant="outlined" style={{ marginTop: SPACE.lg }}>
          <Txt variant="bodySm" tone="muted">
            For the best reading: daylight, no filter, hair back, no makeup on the cheeks, camera at eye level.
          </Txt>
        </Card>
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

  const data = report.data;
  const confidence = confidenceWords(data.confidence);
  // The backend adds this note when depth and clarity had to be estimated from
  // a stored skin hex, which happens for analyses older than the season engine.
  const wasEstimated = data.limitations.some((l) => l.toLowerCase().includes('predates'));

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="overline" tone="muted">Personal colour</Txt>
      <Txt variant="display" serif style={{ marginTop: SPACE.xs }}>{data.label}</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: SPACE.sm }}>{data.summary}</Txt>

      <Card variant="tinted" accent="gold" style={{ marginTop: SPACE.xl }}>
        <Txt variant="bodySm" weight="semibold">{confidence.label}</Txt>
        <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>{confidence.note}</Txt>
      </Card>

      {wasEstimated ? (
        <Card variant="outlined" style={{ marginTop: SPACE.md }}>
          <Txt variant="bodySm" tone="muted">
            Depth and clarity for this report were estimated from the skin tone stored with an older
            scan, rather than measured. A new scan gives a sharper answer.
          </Txt>
        </Card>
      ) : null}

      {/* ---------------------------------------------------- measurements */}
      <View style={styles.section}>
        <SectionHeader title="What was read" />
        {MEASUREMENTS.map((m) => (
          <View key={m.key} style={[styles.measureRow, { borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Txt variant="bodySm" weight="semibold">{m.label}</Txt>
              <Txt variant="caption" tone="subtle" style={{ marginTop: 2 }}>{m.help}</Txt>
            </View>
            <Txt variant="body" tone="accent" weight="semibold">{data[m.key]}</Txt>
          </View>
        ))}
        {data.skinColor ? (
          <View style={[styles.measureRow, { borderColor: colors.border }]}>
            <Txt variant="bodySm" weight="semibold">Sampled skin tone</Txt>
            <View style={[styles.skinDot, { backgroundColor: data.skinColor, borderColor: colors.borderStrong }]} />
          </View>
        ) : null}
      </View>

      {/* ------------------------------------------------------- alternate */}
      <View style={styles.section}>
        <SectionHeader title="Worth comparing" />
        <Card>
          <Txt variant="heading" serif>{data.alternate.label}</Txt>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>{data.alternate.summary}</Txt>
          <Button
            label={`See the ${data.alternate.label} palette`}
            variant="secondary"
            style={{ marginTop: SPACE.lg }}
            onPress={() => router.push(`/colors/seasons?season=${data.alternate.season}` as never)}
          />
        </Card>
      </View>

      {/* -------------------------------------------------------- palettes */}
      {([
        ['Your best colours', data.palettes.best],
        ['Your neutrals', data.palettes.neutrals],
        ['Accents', data.palettes.accents],
        ['Compare against these', data.palettes.compare],
        ['Lipstick', data.palettes.lipstick],
        ['Blush', data.palettes.blush],
        ['Eyeshadow', data.palettes.eyeshadow],
        ['Hair colours', data.palettes.hair],
      ] as const).map(([label, swatches]) => (
        <View key={label} style={styles.section}>
          <SectionHeader title={label} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {swatches.map((s) => (
              <Swatch key={`${label}-${s.hex}`} hex={s.hex} name={s.name} />
            ))}
          </ScrollView>
        </View>
      ))}

      {/* ---------------------------------------------------------- metals */}
      <View style={styles.section}>
        <SectionHeader title="Jewellery metals" action="Explore" onAction={() => router.push('/colors/jewellery' as never)} />
        <Card>
          <Txt variant="body">{data.metals.join(' · ')}</Txt>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
            A leaning, not a rule. Most people can wear both; this is the one that tends to look lit.
          </Txt>
        </Card>
      </View>

      {/* -------------------------------------------------------- garments */}
      <View style={styles.section}>
        <SectionHeader title="Wearing it" action="More" onAction={() => router.push('/colors/clothing' as never)} />
        <Card variant="tinted" accent="peach" style={{ marginBottom: SPACE.sm }}>
          <Txt variant="overline" tone="muted">Indian wardrobe</Txt>
          {data.garments.indian.map((g) => (
            <Txt key={g} variant="bodySm" style={{ marginTop: SPACE.xs }}>· {g}</Txt>
          ))}
        </Card>
        <Card variant="tinted" accent="sage">
          <Txt variant="overline" tone="muted">Global wardrobe</Txt>
          {data.garments.global.map((g) => (
            <Txt key={g} variant="bodySm" style={{ marginTop: SPACE.xs }}>· {g}</Txt>
          ))}
        </Card>
      </View>

      {/* ----------------------------------------------------- limitations */}
      <View style={styles.section}>
        <SectionHeader title="What this cannot tell you" />
        {data.limitations.map((limit) => (
          <Card key={limit} variant="outlined" style={{ marginBottom: SPACE.sm }}>
            <Txt variant="bodySm" tone="muted">{limit}</Txt>
          </Card>
        ))}
        <Button
          label="Re-run the analysis"
          variant="secondary"
          style={{ marginTop: SPACE.md }}
          onPress={() => router.push('/(tabs)/scan' as never)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  center: { flex: 1, justifyContent: 'center' },
  section: { marginTop: SPACE.xxl },
  measureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.md,
    paddingVertical: SPACE.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  skinDot: { width: 34, height: 34, borderRadius: RADIUS.sm, borderWidth: StyleSheet.hairlineWidth * 2 },
});
