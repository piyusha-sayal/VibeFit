import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Card, Txt } from '../../components/ds';
import { RADIUS, SPACE } from '../../constants/theme';
import { usePassport } from '../../hooks/useBeauty';
import { useTheme } from '../../theme/ThemeProvider';

/** Three doors, each to one experience. Nothing here duplicates a route. */
const SECTIONS = [
  {
    key: 'colors',
    title: 'Discover My Colors',
    body: 'Your season and every palette that follows from it.',
    accent: 'blush' as const,
    route: '/colors',
    items: [
      { label: 'My colour report', route: '/colors/report' },
      { label: 'Interactive palette', route: '/colors/palette' },
      { label: 'Lipstick', route: '/colors/lipstick' },
      { label: 'Blush', route: '/colors/blush' },
      { label: 'Eyeshadow', route: '/colors/eyeshadow' },
      { label: 'Hair colour', route: '/colors/hair' },
      { label: 'Jewellery metals', route: '/colors/jewellery' },
      { label: 'Clothing colours', route: '/colors/clothing' },
      { label: 'Outfit colour matcher', route: '/colors/outfit' },
      { label: 'All twelve seasons', route: '/colors/seasons' },
    ],
  },
  {
    key: 'face',
    title: 'Discover My Face',
    body: 'Face shape and features, with Hair Studio and Makeup Studio inside.',
    accent: 'lavender' as const,
    route: '/analysis/facial-canon',
    items: [
      { label: 'Face shape and proportions', route: '/analysis/facial-canon' },
      { label: 'Hair Studio', route: '/analysis/hair' },
      { label: 'Makeup Studio', route: '/analysis/makeup' },
      { label: 'Glasses and accessories', route: '/analysis/accessories' },
      { label: 'Run a new scan', route: '/(tabs)/scan' },
    ],
  },
  {
    key: 'style',
    title: 'Discover My Style',
    body: 'Silhouettes and a global wardrobe, built from your answers.',
    accent: 'sage' as const,
    route: '/style',
    items: [
      { label: 'Styling questionnaire', route: '/style' },
      { label: 'Body type and silhouettes', route: '/style/body' },
      { label: 'Wardrobe library', route: '/style/wardrobe' },
    ],
  },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const passport = usePassport();

  const ordered = section
    ? [...SECTIONS].sort((a, b) => (a.key === section ? -1 : b.key === section ? 1 : 0))
    : SECTIONS;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Txt variant="display" serif style={{ marginBottom: SPACE.xs }}>Discover</Txt>
      <Txt variant="body" tone="muted" style={{ marginBottom: SPACE.xxl }}>
        Three ways to learn what suits you. Each one feeds the same passport.
      </Txt>

      {ordered.map((s) => (
        <View key={s.key} style={{ marginBottom: SPACE.xxl }}>
          <Card variant="tinted" accent={s.accent} onPress={() => router.push(s.route as never)}>
            <Txt variant="title" serif>{s.title}</Txt>
            <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>{s.body}</Txt>
          </Card>
          <View style={[styles.list, { borderColor: colors.border }]}>
            {s.items.map((item) => (
              <Card
                key={item.route + item.label}
                variant="outlined"
                onPress={() => router.push(item.route as never)}
                style={styles.listRow}
              >
                <Txt variant="body">{item.label}</Txt>
                <Txt variant="body" tone="subtle">›</Txt>
              </Card>
            ))}
          </View>
        </View>
      ))}

      {passport.data && passport.data.completed === 0 ? (
        <Card variant="tinted" accent="gold">
          <Txt variant="bodySm">
            Nothing is filled in yet. A scan takes under a minute and unlocks the colour report,
            the face tools and the recommendations on your home screen.
          </Txt>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  list: { marginTop: SPACE.sm, borderRadius: RADIUS.md, overflow: 'hidden' },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.sm,
    borderRadius: 0,
  },
});
