import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, Chip, EmptyState, LoadingState, SectionHeader, Swatch, Txt } from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { useOutfitColours } from '../../hooks/useStyle';
import { useTheme } from '../../theme/ThemeProvider';

const REGIONS = [
  { key: undefined, label: 'All' },
  { key: 'indian', label: 'Indian' },
  { key: 'global', label: 'Global' },
] as const;

export default function OutfitColourExplorerScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [region, setRegion] = useState<string | undefined>();
  const query = useOutfitColours(region);

  if (query.isLoading) return <LoadingState label="Loading your palette…" />;

  const data = query.data;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Outfit colours</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        {data?.seasonLabel
          ? `Pairings drawn from your ${data.seasonLabel} palette.`
          : 'Run a colour analysis and these fill with your own palette.'}
      </Txt>

      <View style={styles.chips}>
        {REGIONS.map((r) => (
          <Chip
            key={r.label}
            label={r.label}
            selected={region === r.key}
            onPress={() => setRegion(r.key)}
          />
        ))}
      </View>

      {!data?.seasonLabel ? (
        <EmptyState
          title="No season yet"
          body="These pairings use your own colours rather than generic ones, so they stay empty until an analysis finds your season."
          actionLabel="Run an analysis"
          onAction={() => router.push('/(tabs)/scan' as never)}
        />
      ) : (
        <View style={{ marginTop: SPACE.xl }}>
          {data.pairings.filter(Boolean).map((pairing) => (
            <Card key={pairing.key} style={{ marginBottom: SPACE.lg }}>
              <View style={styles.rowBetween}>
                <Txt variant="heading">{pairing.name}</Txt>
                <Txt variant="caption" tone="muted">{pairing.region}</Txt>
              </View>
              <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{pairing.note}</Txt>

              {pairing.suggestions.map((suggestion, index) => (
                <View key={`${pairing.key}-${index}`} style={styles.suggestion}>
                  <View style={styles.row}>
                    {suggestion.colours.map((colour, i) => (
                      <View key={colour.hex} style={{ alignItems: 'center', marginRight: SPACE.md }}>
                        <Swatch hex={colour.hex} name={colour.name} size={52} />
                        <Txt variant="caption" tone="subtle">{pairing.roles[i]}</Txt>
                      </View>
                    ))}
                    <View style={{ flex: 1 }}>
                      <Txt variant="body" weight="semibold">{suggestion.label}</Txt>
                      <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>
                        {suggestion.why}
                      </Txt>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          ))}

          <SectionHeader title="How this works" style={{ marginTop: SPACE.lg }} />
          <Card>
            <Txt variant="bodySm">
              These relationships are measured from the colours themselves —
              hue distance and how much colour each one actually carries. The
              same maths decides a saree and blouse as a shirt and trousers.
            </Txt>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.lg },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
  suggestion: { marginTop: SPACE.lg },
});
