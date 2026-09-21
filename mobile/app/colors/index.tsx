import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, LoadingState, SectionHeader, Swatch, Txt } from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { NotFoundError, useColorReport } from '../../hooks/useBeauty';
import { useTheme } from '../../theme/ThemeProvider';

const TOOLS = [
  { label: 'My colour report', body: 'Season, undertone, confidence and every palette.', route: '/colors/report', accent: 'gold' as const },
  { label: 'Interactive palette', body: 'Hold any two colours side by side.', route: '/colors/palette', accent: 'blush' as const },
  { label: 'Lipstick', body: 'Shade families from your season.', route: '/colors/lipstick', accent: 'blush' as const },
  { label: 'Blush', body: 'Cheek colours in the same family.', route: '/colors/blush', accent: 'peach' as const },
  { label: 'Eye makeup', body: 'Eyeshadow that holds your contrast.', route: '/colors/eyeshadow', accent: 'lavender' as const },
  { label: 'Hair colour', body: 'Directions to take to a salon.', route: '/colors/hair', accent: 'gold' as const },
  { label: 'Jewellery metals', body: 'Gold, silver, rose gold and mixing.', route: '/colors/jewellery', accent: 'gold' as const },
  { label: 'Clothing colours', body: 'Sarees to suits, from one palette.', route: '/colors/clothing', accent: 'sage' as const },
  { label: 'Outfit colour matcher', body: 'Build combinations that hold together.', route: '/colors/outfit', accent: 'sage' as const },
  { label: 'All twelve seasons', body: 'Browse the whole system.', route: '/colors/seasons', accent: 'lavender' as const },
  { label: 'Colour education', body: 'What a season is, and is not.', route: '/academy/understanding-personal-color', accent: 'peach' as const },
];

export default function ColorStudioScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const report = useColorReport();
  const hasReport = !!report.data;
  const needsScan = report.error instanceof NotFoundError;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Colour Studio</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: SPACE.xs, marginBottom: SPACE.xl }}>
        One season, every palette that follows from it.
      </Txt>

      {report.isLoading ? (
        <LoadingState label="Checking your analysis…" />
      ) : hasReport ? (
        <Card variant="tinted" accent="blush" onPress={() => router.push('/colors/report' as never)}>
          <Txt variant="overline" tone="muted">Your season</Txt>
          <Txt variant="title" serif style={{ marginTop: 2 }}>{report.data!.label}</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SPACE.lg }}>
            {report.data!.palettes.best.map((s) => (
              <Swatch key={s.hex} hex={s.hex} size={44} />
            ))}
          </ScrollView>
        </Card>
      ) : needsScan ? (
        <Card variant="tinted" accent="gold">
          <Txt variant="heading" serif>Start with an analysis</Txt>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
            The explorers below all read from your own season, so they stay empty until a scan finds it.
          </Txt>
          <Button label="Run an analysis" style={{ marginTop: SPACE.lg }} onPress={() => router.push('/(tabs)/scan' as never)} />
        </Card>
      ) : null}

      <View style={{ marginTop: SPACE.xxl }}>
        <SectionHeader title="Tools" />
        {TOOLS.map((tool) => (
          <Card
            key={tool.route}
            style={{ marginBottom: SPACE.sm }}
            onPress={() => router.push(tool.route as never)}
            accessibilityLabel={tool.label}
          >
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Txt variant="body" weight="semibold">{tool.label}</Txt>
                <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{tool.body}</Txt>
              </View>
              <Txt variant="body" tone="subtle">›</Txt>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
});
