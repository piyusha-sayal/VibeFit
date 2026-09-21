import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Card, Chip, EmptyState, ErrorState, LoadingState, Txt } from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { useAccessories } from '../../hooks/useFace';
import type { AccessoriesBundle, AccessoryItem } from '../../services/faceService';
import { useTheme } from '../../theme/ThemeProvider';

/** Route segment to the key the bundle uses. */
const BUNDLE_KEY: Record<string, keyof AccessoriesBundle> = {
  glasses: 'glasses',
  earrings: 'earrings',
  necklines: 'necklines',
  hair_accessories: 'hairAccessories',
};

const TITLE: Record<string, string> = {
  glasses: 'Glasses',
  earrings: 'Earrings',
  necklines: 'Necklines',
  hair_accessories: 'Hair accessories',
};

export default function AccessoryCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const { colors } = useTheme();
  const query = useAccessories();

  const key = category ? BUNDLE_KEY[category] : undefined;

  if (query.isLoading) return <LoadingState />;
  if (query.error) {
    return <ErrorState message="We could not load the library." onRetry={() => { void query.refetch(); }} />;
  }
  if (!key) {
    return <EmptyState title="Unknown category" body="Open the accessories explorer to browse everything." />;
  }

  const items = query.data![key] as AccessoryItem[];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>{TITLE[category!] ?? 'Accessories'}</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        {query.data!.faceShape
          ? `Ordered for a ${query.data!.faceShape!.replace('_', ' ')} face shape.`
          : 'Showing the full library.'}
      </Txt>

      <View style={{ marginTop: SPACE.xl }}>
        {items.map((item) => (
          <Card
            key={item.key}
            variant={item.suited ? 'tinted' : 'plain'}
            accent="sage"
            style={{ marginBottom: SPACE.md }}
          >
            <View style={styles.rowBetween}>
              <Txt variant="heading">{item.name}</Txt>
              {item.suited ? <Chip label="often suits you" accent="sage" /> : null}
            </View>
            <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{item.description}</Txt>
            {item.note ? <Txt variant="bodySm" style={{ marginTop: SPACE.sm }}>{item.note}</Txt> : null}
          </Card>
        ))}
      </View>

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.lg }}>{query.data!.note}</Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
});
