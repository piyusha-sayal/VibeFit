import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, Chip, EmptyState, ErrorState, LoadingState, SectionHeader, Swatch, Txt } from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { NotFoundError, useColorReport } from '../../hooks/useBeauty';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * One colour engine, many wardrobes.
 *
 * Each garment says where the colour sits relative to the face, because that is
 * what decides how strictly the palette applies — a saree body is forgiving, a
 * blouse is not.
 */
const GARMENTS = [
  { key: 'saree', label: 'Saree', group: 'Indian', note: 'Palette matters most in the pallu and blouse; the drape body can travel further.' },
  { key: 'lehenga', label: 'Lehenga', group: 'Indian', note: 'The choli and dupatta sit near your face. The skirt is free.' },
  { key: 'kurta', label: 'Kurta', group: 'Indian', note: 'A full-palette piece — it meets your neck and shoulders directly.' },
  { key: 'anarkali', label: 'Anarkali', group: 'Indian', note: 'Yoke and neckline carry the colour; the flare carries the shape.' },
  { key: 'sherwani', label: 'Sherwani', group: 'Indian', note: 'Collar and buttons are the near-face elements. Zari finish sets the warmth.' },
  { key: 'dress', label: 'Dress', group: 'Global', note: 'A neckline piece. Deep necklines move the colour away from your face.' },
  { key: 'shirt', label: 'Shirt', group: 'Global', note: 'The strictest garment in the wardrobe: it frames your jaw all day.' },
  { key: 'suit', label: 'Suit', group: 'Global', note: 'The lapel and shirt do the work. Trousers are unconstrained.' },
  { key: 'casual', label: 'Casualwear', group: 'Global', note: 'Tees and knits sit at the collarbone — keep the best colours here.' },
  { key: 'formal', label: 'Formalwear', group: 'Global', note: 'Where your neutrals earn their keep, with one accent near the face.' },
];

export default function ClothingColoursScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const report = useColorReport();
  const [garment, setGarment] = useState('saree');

  if (report.isLoading) return <LoadingState label="Reading your palette…" />;

  if (report.error instanceof NotFoundError) {
    return (
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
        <Txt variant="title" serif>Clothing colours</Txt>
        <EmptyState
          title="No palette yet"
          body="Garment advice is only useful once we know which colours are yours."
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

  const selected = GARMENTS.find((g) => g.key === garment)!;
  const ideas = selected.group === 'Indian' ? report.data.garments.indian : report.data.garments.global;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="title" serif>Clothing colours</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs, marginBottom: SPACE.lg }}>
        The same season, applied to what you actually wear. Every wardrobe here draws on one palette —
        there is no separate set of seasons by region.
      </Txt>

      {(['Indian', 'Global'] as const).map((group) => (
        <View key={group} style={{ marginBottom: SPACE.lg }}>
          <Txt variant="overline" tone="muted" style={{ marginBottom: SPACE.sm }}>{group} wardrobe</Txt>
          <View style={styles.wrap}>
            {GARMENTS.filter((g) => g.group === group).map((g) => (
              <Chip
                key={g.key}
                label={g.label}
                accent={group === 'Indian' ? 'peach' : 'sage'}
                selected={garment === g.key}
                onPress={() => setGarment(g.key)}
              />
            ))}
          </View>
        </View>
      ))}

      <Card variant="tinted" accent={selected.group === 'Indian' ? 'peach' : 'sage'} style={{ marginTop: SPACE.md }}>
        <Txt variant="heading" serif>{selected.label}</Txt>
        <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>{selected.note}</Txt>
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Nearest your face" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {report.data.palettes.best.map((s) => (
            <Swatch key={s.hex} hex={s.hex} name={s.name} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Away from your face" />
        <Txt variant="bodySm" tone="muted" style={{ marginBottom: SPACE.md }}>
          Skirts, trousers and drape bodies. Your neutrals hold everything together here.
        </Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {report.data.palettes.neutrals.map((s) => (
            <Swatch key={s.hex} hex={s.hex} name={s.name} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeader title={`${selected.group} ideas for ${report.data.label}`} />
        {ideas.map((idea) => (
          <Card key={idea} style={{ marginBottom: SPACE.sm }}>
            <Txt variant="bodySm">{idea}</Txt>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  center: { flex: 1, justifyContent: 'center' },
  section: { marginTop: SPACE.xxl },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
});
