import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Card, Chip, SectionHeader, Txt } from '../../components/ds';
import { ACADEMY_CATEGORIES, ACADEMY_GUIDES } from '../../constants/academy';
import { SPACE } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';

export default function AcademyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { category: initial } = useLocalSearchParams<{ category?: string }>();
  const [category, setCategory] = useState<string | null>(initial ?? null);

  const shown = category ? ACADEMY_GUIDES.filter((g) => g.category === category) : ACADEMY_GUIDES;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Beauty Academy</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: SPACE.xs, marginBottom: SPACE.lg }}>
        Short, practical guides. Every one here has a full body — there are no placeholder cards.
      </Txt>

      <View style={styles.wrap}>
        <Chip label="All" selected={category === null} onPress={() => setCategory(null)} />
        {ACADEMY_CATEGORIES.map((c) => {
          const count = ACADEMY_GUIDES.filter((g) => g.category === c.key).length;
          if (!count) return null;
          return (
            <Chip
              key={c.key}
              label={c.label.replace(' Academy', '')}
              accent="lavender"
              selected={category === c.key}
              onPress={() => setCategory(c.key)}
            />
          );
        })}
      </View>

      <View style={{ marginTop: SPACE.xl }}>
        <SectionHeader title={`${shown.length} guide${shown.length === 1 ? '' : 's'}`} />
        {shown.map((guide) => (
          <Card
            key={guide.slug}
            style={{ marginBottom: SPACE.sm }}
            onPress={() => router.push(`/academy/${guide.slug}` as never)}
          >
            <Txt variant="body" weight="semibold">{guide.title}</Txt>
            <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{guide.summary}</Txt>
            <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.sm }}>
              {guide.minutes} min · {guide.level}
            </Txt>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
});
