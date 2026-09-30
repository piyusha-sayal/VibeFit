import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  Card, ListGroup, ListRow, PageHeader, Screen, StatusBanner, Txt,
} from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { usePassport } from '../../hooks/useBeauty';

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
    route: '/face',
    items: [
      { label: 'Face shape report', route: '/face/shape' },
      { label: 'Feature explorer', route: '/face/features' },
      { label: 'Hair Studio', route: '/hair' },
      { label: 'Makeup Studio', route: '/makeup' },
      { label: 'Accessories', route: '/accessories' },
      { label: 'Facial proportions', route: '/analysis/facial-canon' },
      { label: 'Run a new scan', route: '/(tabs)/scan' },
    ],
  },
  {
    key: 'style',
    title: 'Discover My Style',
    body: 'Silhouettes, outfits and a global wardrobe, built from your answers.',
    accent: 'sage' as const,
    route: '/style',
    items: [
      { label: 'Style profile', route: '/style/questionnaire' },
      { label: 'Clothing silhouettes', route: '/style/silhouettes' },
      { label: 'Fashion aesthetics', route: '/style/aesthetics' },
      { label: 'Outfit recommendations', route: '/style/outfits' },
      { label: 'Outfit colour explorer', route: '/style/colours' },
      { label: 'Indian fashion', route: '/style/library' },
      { label: 'Wardrobe library', route: '/style/wardrobe' },
    ],
  },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const passport = usePassport();

  const ordered = section
    ? [...SECTIONS].sort((a, b) => (a.key === section ? -1 : b.key === section ? 1 : 0))
    : SECTIONS;

  return (
    <Screen>
      <PageHeader
        title="Discover"
        subtitle="Three ways to learn what suits you. Each one feeds the same passport."
        back={false}
      />

      {passport.data && passport.data.completed === 0 ? (
        <StatusBanner
          tone="info"
          title="Nothing is filled in yet"
          body="A scan takes under a minute and unlocks the colour report, the face tools and the recommendations on your home screen."
        />
      ) : null}

      {ordered.map((s) => (
        <View key={s.key} style={{ marginTop: SPACE.xxl }}>
          <Card variant="tinted" accent={s.accent} onPress={() => router.push(s.route as never)}>
            <Txt variant="title" serif>{s.title}</Txt>
            <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>{s.body}</Txt>
          </Card>
          <View style={{ marginTop: SPACE.sm }}>
            <ListGroup>
              {s.items.map((item, index) => (
                <ListRow
                  key={item.route + item.label}
                  title={item.label}
                  onPress={() => router.push(item.route as never)}
                  last={index === s.items.length - 1}
                />
              ))}
            </ListGroup>
          </View>
        </View>
      ))}
    </Screen>
  );
}
