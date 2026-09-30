import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Button, Card, Chip, EmptyState, FeatureCard, ProgressBar, Section, Swatch, Txt,
} from '../../components/ds';
import { QualityCheckCard } from '../../components/analyze/QualityCheckCard';
import { useAnalysisStore } from '../../store/analysisStore';
import { downloadAndShareReport, downloadAndShareCard, downloadAndShareOverlay } from '../../services/reportService';
import { SPACE } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';

function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ResultsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const currentAnalysis = useAnalysisStore((s) => s.currentAnalysis);
  const [busy, setBusy] = useState<null | 'report' | 'card' | 'overlay'>(null);

  const runShare = async (
    kind: 'report' | 'card' | 'overlay',
    fn: () => Promise<{ success: boolean; error?: string }>,
    failTitle: string,
  ) => {
    if (!currentAnalysis || busy) return;
    setBusy(kind);
    const res = await fn();
    setBusy(null);
    if (!res.success) Alert.alert(failTitle, res.error ?? 'Something went wrong.');
  };

  const handleDownloadReport = () =>
    runShare('report', () => downloadAndShareReport(currentAnalysis!.id), 'Report');
  const handleDownloadCard = () =>
    runShare('card', () => downloadAndShareCard(currentAnalysis!.id), 'Summary Card');
  const handleOverlay = () =>
    runShare('overlay', () => downloadAndShareOverlay(currentAnalysis!.imageUrl), 'Overlay');

  if (!currentAnalysis) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <EmptyState
          title="No analysis yet"
          body="Take a selfie or upload a photo to get your personalised style profile."
          actionLabel="Start your consultation"
          onAction={() => router.push('/(tabs)/scan' as never)}
        />
      </View>
    );
  }

  const {
    faceAnalysis, colorAnalysis, recommendations, skinAnalysis, quality,
  } = currentAnalysis;
  const palette = colorAnalysis?.palette?.primary ?? [];
  const aesthetics = recommendations?.filter((r) => r.category === 'aesthetic').slice(0, 4).map((r) => r.title) ?? [];
  const seasonal = colorAnalysis?.seasonal;
  const bestColors = colorAnalysis?.bestColors ?? [];
  const avoidColors = colorAnalysis?.avoidColors ?? [];
  const canOverlay = !!currentAnalysis.imageUrl && /^https?:\/\//.test(currentAnalysis.imageUrl);

  const EXPLORE = [
    { label: 'Colours', body: 'Your palette, season and undertone in depth.', route: '/colors/report' as const },
    { label: 'Face', body: 'Shape, proportions and features.', route: '/face' as const },
    { label: 'Hair', body: 'Cuts, colour and parting for your shape.', route: '/hair' as const },
    { label: 'Makeup', body: 'Lips, eyes and cheeks for your colouring.', route: '/makeup' as const },
    { label: 'Accessories', body: 'Metals, shapes and finishing touches.', route: '/accessories' as const },
    { label: 'Beauty Passport', body: 'Everything saved, in one place.', route: '/(tabs)/passport' as const },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Txt variant="overline" tone="accent" weight="semibold">Your consultation</Txt>
      <Txt variant="display" serif accessibilityRole="header" style={{ marginTop: SPACE.xs }}>
        Your results
      </Txt>

      {quality ? (
        <View style={{ marginTop: SPACE.xl }}>
          <QualityCheckCard quality={quality} onRetake={() => router.push('/(tabs)/scan' as never)} />
        </View>
      ) : null}

      {/* Concise summary: season, undertone, face shape as chips — no scores. */}
      <Card variant="tinted" accent="gold" style={{ marginTop: SPACE.lg }}>
        <Txt variant="overline" tone="muted">Your profile</Txt>
        <Txt variant="h1" serif accessibilityRole="header" style={{ marginTop: SPACE.xs }}>
          {faceAnalysis?.shape ? cap(String(faceAnalysis.shape)) : 'Face scan unavailable'}
        </Txt>
        <View style={styles.chipWrap}>
          {colorAnalysis?.skinUndertone ? <Chip label={`${cap(colorAnalysis.skinUndertone)} undertone`} /> : null}
          {colorAnalysis?.contrastLevel ? <Chip label={`${cap(colorAnalysis.contrastLevel)} contrast`} /> : null}
          {seasonal?.label ? <Chip label={seasonal.label} selected /> : null}
        </View>
        <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.md }}>
          These observations personalise the guidance below — they are never a rating of how you look.
        </Txt>
      </Card>

      {/* Explore deeper, without dumping every detail on this one screen. */}
      <Section title="Explore further">
        <View style={styles.grid}>
          {EXPLORE.map((item) => (
            <FeatureCard
              key={item.label}
              title={item.label}
              subtitle={item.body}
              onPress={() => router.push(item.route as never)}
              style={styles.gridItem}
            />
          ))}
        </View>
      </Section>

      {/* Skin analysis */}
      {skinAnalysis && skinAnalysis.quality?.faceFound ? (
        <Section title="Skin">
          <Card>
            <Txt variant="bodySm" weight="semibold">Evenness</Txt>
            <ProgressBar value={skinAnalysis.evenness / 100} label={`Evenness ${skinAnalysis.evenness} out of 100`} />
            <View style={styles.skinRow}>
              <View style={[styles.skinStat, { backgroundColor: colors.surfaceAlt }]}>
                <Txt variant="caption" tone="muted">Texture</Txt>
                <Txt variant="body" weight="semibold" style={{ marginTop: 2, textTransform: 'capitalize' }}>{skinAnalysis.texture}</Txt>
              </View>
              <View style={[styles.skinStat, { backgroundColor: colors.surfaceAlt }]}>
                <Txt variant="caption" tone="muted">Redness</Txt>
                <Txt variant="body" weight="semibold" style={{ marginTop: 2, textTransform: 'capitalize' }}>{skinAnalysis.redness}</Txt>
              </View>
            </View>
            <View style={styles.skinRow}>
              <View style={[styles.skinStat, { backgroundColor: colors.surfaceAlt }]}>
                <Txt variant="caption" tone="muted">Under-eye</Txt>
                <Txt variant="body" weight="semibold" style={{ marginTop: 2, textTransform: 'capitalize' }}>{skinAnalysis.underEye}</Txt>
              </View>
              <View style={[styles.skinStat, { backgroundColor: colors.surfaceAlt }]}>
                <Txt variant="caption" tone="muted">Oiliness</Txt>
                <Txt variant="body" weight="semibold" style={{ marginTop: 2, textTransform: 'capitalize' }}>{skinAnalysis.oiliness}</Txt>
              </View>
            </View>
            {skinAnalysis.concerns.length > 0 ? (
              <View style={[styles.chipWrap, { marginTop: SPACE.md }]}>
                {skinAnalysis.concerns.map((c) => <Chip key={c} label={c} />)}
              </View>
            ) : null}
          </Card>
        </Section>
      ) : null}

      {/* Colour palette */}
      {palette.length > 0 ? (
        <Section title="Your colour palette">
          <Card>
            <View style={styles.swatchRow}>
              {palette.map((hex, i) => <Swatch key={`${hex}-${i}`} hex={hex} />)}
            </View>
            <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.md }}>
              {colorAnalysis?.skinUndertone === 'warm'
                ? 'Earth tones, warm neutrals and golden accents complement your undertone.'
                : colorAnalysis?.skinUndertone === 'cool'
                ? 'Jewel tones, cool greys and navy complement your undertone.'
                : 'A balanced palette — both warm and cool tones work well for you.'}
            </Txt>
          </Card>
        </Section>
      ) : null}

      {/* Best / approach-with-care colours */}
      {bestColors.length > 0 || avoidColors.length > 0 ? (
        <Section title="Colours to wear">
          <Card>
            {bestColors.length > 0 ? (
              <>
                <Txt variant="bodySm" weight="semibold">Work well for you</Txt>
                <View style={[styles.swatchRow, { marginTop: SPACE.sm }]}>
                  {bestColors.map((c, i) => <Swatch key={`${c.hex}-${i}`} hex={c.hex} name={c.name} size={44} />)}
                </View>
              </>
            ) : null}
            {avoidColors.length > 0 ? (
              <>
                <Txt variant="bodySm" weight="semibold" style={{ marginTop: bestColors.length > 0 ? SPACE.lg : 0 }}>
                  Approach with care
                </Txt>
                <View style={[styles.swatchRow, { marginTop: SPACE.sm }]}>
                  {avoidColors.map((c, i) => <Swatch key={`${c.hex}-${i}`} hex={c.hex} name={c.name} size={44} />)}
                </View>
              </>
            ) : null}
          </Card>
        </Section>
      ) : null}

      {/* Matched aesthetics */}
      {aesthetics.length > 0 ? (
        <Section title="Matched aesthetics">
          <View style={styles.chipWrap}>
            {aesthetics.map((a, i) => <Chip key={a} label={a} selected={i === 0} />)}
          </View>
        </Section>
      ) : null}

      {/* Share / export */}
      <Section title="Save & share">
        <View style={{ gap: SPACE.sm }}>
          <Button
            label="Download face report (PDF)"
            onPress={handleDownloadReport}
            loading={busy === 'report'}
            disabled={!!busy && busy !== 'report'}
          />
          <Button
            label="Share summary card"
            variant="secondary"
            onPress={handleDownloadCard}
            loading={busy === 'card'}
            disabled={!!busy && busy !== 'card'}
          />
          {canOverlay ? (
            <Button
              label="Facial overlay image"
              variant="secondary"
              onPress={handleOverlay}
              loading={busy === 'overlay'}
              disabled={!!busy && busy !== 'overlay'}
            />
          ) : null}
        </View>
        <Txt variant="caption" tone="subtle" style={{ textAlign: 'center', marginTop: SPACE.md }}>
          Export a shareable PDF, social card, or annotated facial-proportion image.
        </Txt>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SPACE.xl, paddingTop: SPACE.xxl, paddingBottom: SPACE.xxxl },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md },
  gridItem: { flexBasis: '47%' },
  skinRow: { flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md },
  skinStat: { flex: 1, borderRadius: 12, padding: SPACE.md },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md },
});
