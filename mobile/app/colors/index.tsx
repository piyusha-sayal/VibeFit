import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Card, Hero, LoadingState, PageHeader, Screen, Section, Swatch, Txt,
} from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { NotFoundError, useColorReport } from '../../hooks/useBeauty';
import type { ColorReport, Swatch as SwatchData } from '../../services/beautyService';
import { useTheme } from '../../theme/ThemeProvider';

/** A small stack of overlapping colour dots — a preview, not a selectable swatch. */
function PreviewDots({ swatches }: { swatches: SwatchData[] }) {
  const { colors } = useTheme();
  if (!swatches.length) return null;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.previewRow}
    >
      {swatches.slice(0, 4).map((s, i) => (
        <View
          key={s.hex}
          style={[
            styles.previewDot,
            { backgroundColor: s.hex, borderColor: colors.borderStrong, marginLeft: i === 0 ? 0 : -12 },
          ]}
        />
      ))}
    </View>
  );
}

/** Fixed metal colours, so the jewellery card can preview even before a report exists. */
const METAL_PREVIEW: SwatchData[] = [
  { name: 'Yellow gold', hex: '#d4af37' },
  { name: 'Rose gold', hex: '#d9a0a0' },
  { name: 'Silver', hex: '#c0c4c9' },
];

function previewsFor(report: ColorReport | undefined): Record<string, SwatchData[]> {
  const p = report?.palettes;
  return {
    report: p?.best ?? [],
    palette: p?.best ?? [],
    lipstick: p?.lipstick ?? [],
    blush: p?.blush ?? [],
    eyeshadow: p?.eyeshadow ?? [],
    hair: p?.hair ?? [],
    jewellery: METAL_PREVIEW,
    clothing: [...(p?.best ?? []), ...(p?.neutrals ?? [])],
    outfit: p?.accents ?? [],
    seasons: p?.best ?? [],
  };
}

const TOOLS = [
  { key: 'report', label: 'My colour report', body: 'Season, undertone, confidence and every palette.', route: '/colors/report' },
  { key: 'palette', label: 'Interactive palette', body: 'Hold any two colours side by side.', route: '/colors/palette' },
  { key: 'lipstick', label: 'Lipstick', body: 'Shade families from your season.', route: '/colors/lipstick' },
  { key: 'blush', label: 'Blush', body: 'Cheek colours in the same family.', route: '/colors/blush' },
  { key: 'eyeshadow', label: 'Eye makeup', body: 'Eyeshadow that holds your contrast.', route: '/colors/eyeshadow' },
  { key: 'hair', label: 'Hair colour', body: 'Directions to take to a salon.', route: '/colors/hair' },
  { key: 'jewellery', label: 'Jewellery metals', body: 'Gold, silver, rose gold and mixing.', route: '/colors/jewellery' },
  { key: 'clothing', label: 'Clothing colours', body: 'Sarees to suits, from one palette.', route: '/colors/clothing' },
  { key: 'outfit', label: 'Outfit colour matcher', body: 'Build combinations that hold together.', route: '/colors/outfit' },
  { key: 'seasons', label: 'All twelve seasons', body: 'Browse the whole system.', route: '/colors/seasons' },
  { key: 'academy', label: 'Colour education', body: 'What a season is, and is not.', route: '/academy/understanding-personal-color' },
];

export default function ColorStudioScreen() {
  const router = useRouter();
  const report = useColorReport();
  const hasReport = !!report.data;
  const needsScan = report.error instanceof NotFoundError;
  const previews = previewsFor(report.data);

  return (
    <Screen>
      <PageHeader title="Colour Studio" subtitle="One season, every palette that follows from it." />

      {report.isLoading ? (
        <LoadingState label="Checking your analysis…" />
      ) : hasReport ? (
        <Hero
          eyebrow="Your season"
          title={report.data!.label}
          body={report.data!.summary}
          actionLabel="Open your full report"
          onAction={() => router.push('/colors/report' as never)}
          art={<PreviewDots swatches={report.data!.palettes.best} />}
        />
      ) : needsScan ? (
        <Hero
          eyebrow="Your season"
          title="Start with an analysis"
          body="The explorers below all read from your own season, so they stay empty until a scan finds it."
          actionLabel="Run an analysis"
          onAction={() => router.push('/(tabs)/scan' as never)}
        />
      ) : null}

      {hasReport ? (
        <>
          <Section title="Your best colours">
            <View style={styles.grid}>
              {report.data!.palettes.best.map((s) => (
                <Swatch key={s.hex} hex={s.hex} name={s.name} />
              ))}
            </View>
          </Section>
          <Section title="Your neutrals">
            <View style={styles.grid}>
              {report.data!.palettes.neutrals.map((s) => (
                <Swatch key={s.hex} hex={s.hex} name={s.name} />
              ))}
            </View>
          </Section>
        </>
      ) : null}

      <Section title="Explore">
        <View style={styles.wrap}>
          {TOOLS.map((tool) => (
            <Card
              key={tool.route}
              style={{ flexBasis: '47%', flexGrow: 0 }}
              onPress={() => router.push(tool.route as never)}
              accessibilityLabel={`${tool.label}. ${tool.body}`}
            >
              <PreviewDots swatches={previews[tool.key] ?? []} />
              <Txt
                variant="body"
                weight="semibold"
                style={{ marginTop: previews[tool.key]?.length ? SPACE.md : 0 }}
              >
                {tool.label}
              </Txt>
              <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>{tool.body}</Txt>
            </Card>
          ))}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, justifyContent: 'space-between' },
  previewRow: { flexDirection: 'row', alignItems: 'center' },
  previewDot: { width: 26, height: 26, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth * 2 },
});
