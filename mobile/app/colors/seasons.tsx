import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Card, Chip, ErrorState, LoadingState, SectionHeader, Swatch, Txt } from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { useColorReport, useSeasons } from '../../hooks/useBeauty';
import { useTheme } from '../../theme/ThemeProvider';

const FAMILIES = ['spring', 'summer', 'autumn', 'winter'] as const;
const FAMILY_ACCENT = { spring: 'peach', summer: 'lavender', autumn: 'gold', winter: 'blush' } as const;

export default function SeasonsScreen() {
  const { colors } = useTheme();
  const { season: highlight } = useLocalSearchParams<{ season?: string }>();
  const seasons = useSeasons();
  const report = useColorReport();
  const [family, setFamily] = useState<string | null>(null);

  if (seasons.isLoading) return <LoadingState label="Loading the twelve seasons…" />;
  if (seasons.isError || !seasons.data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ErrorState message="Could not load the season reference." onRetry={() => seasons.refetch()} />
      </View>
    );
  }

  const shown = family ? seasons.data.filter((s) => s.family === family) : seasons.data;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="title" serif>The twelve seasons</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs, marginBottom: SPACE.lg }}>
        Four families, three variations each. Yours is one of them; the rest are here to compare against.
      </Txt>

      <View style={styles.wrap}>
        <Chip label="All" selected={family === null} onPress={() => setFamily(null)} />
        {FAMILIES.map((f) => (
          <Chip
            key={f}
            label={f[0].toUpperCase() + f.slice(1)}
            accent={FAMILY_ACCENT[f]}
            selected={family === f}
            onPress={() => setFamily(f)}
          />
        ))}
      </View>

      <View style={{ marginTop: SPACE.xl }}>
        {shown.map((season) => {
          const isMine = report.data?.season === season.season;
          const isHighlighted = highlight === season.season;
          return (
            <Card
              key={season.season}
              accent={FAMILY_ACCENT[season.family as keyof typeof FAMILY_ACCENT]}
              variant={isMine || isHighlighted ? 'tinted' : 'plain'}
              style={{ marginBottom: SPACE.md }}
            >
              <View style={styles.rowBetween}>
                <Txt variant="heading" serif>{season.label}</Txt>
                {isMine ? <Chip label="Yours" accent="gold" selected /> : null}
                {!isMine && isHighlighted ? <Chip label="Runner-up" accent="lavender" selected /> : null}
              </View>
              <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>{season.summary}</Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SPACE.md }}>
                {[...season.palettes.best, ...season.palettes.neutrals].map((s) => (
                  <Swatch key={`${season.season}-${s.hex}`} hex={s.hex} size={40} />
                ))}
              </ScrollView>
            </Card>
          );
        })}
      </View>

      <SectionHeader title="Reading this" />
      <Card variant="outlined">
        <Txt variant="bodySm" tone="muted">
          Seasons in the same family share an undertone. What separates them is depth and clarity — which
          is why your runner-up is almost always the neighbour that shares two of your three traits.
        </Txt>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  center: { flex: 1, justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm },
});
