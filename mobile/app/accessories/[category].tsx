import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Card, Chip, EmptyState, ErrorState, LoadingState, PageHeader, Screen, Section, Swatch, Txt } from '../../components/ds';
import { FaceFigure, faceShapeFor, frameStyleFor } from '../../components/visual';
import { SPACE } from '../../constants/theme';
import { useAccessories } from '../../hooks/useFace';
import type { AccessoriesBundle, AccessoryItem, MetalItem } from '../../services/faceService';

/** Route segment to the key the bundle uses. */
const BUNDLE_KEY: Record<string, keyof AccessoriesBundle> = {
  glasses: 'glasses',
  earrings: 'earrings',
  necklines: 'necklines',
  hair_accessories: 'hairAccessories',
  metals: 'metals',
};

const TITLE: Record<string, string> = {
  glasses: 'Glasses',
  earrings: 'Earrings',
  necklines: 'Necklines',
  hair_accessories: 'Hair accessories',
  metals: 'Metals',
};

function ItemCard({ item, category, faceShape }: { item: AccessoryItem; category: string; faceShape: string | null }) {
  return (
    <Card
      variant={item.suited || item.universal ? 'tinted' : 'plain'}
      accent="sage"
      style={{ marginBottom: SPACE.md }}
    >
      <View style={styles.itemRow}>
        {category === 'glasses' ? (
          <FaceFigure
            glasses={frameStyleFor(`${item.key} ${item.name}`)}
            faceShape={faceShapeFor(faceShape) ?? 'oval'}
            seed={item.key}
            size={76}
            label={`${item.name} frames, illustration`}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <View style={styles.rowBetween}>
            <Txt variant="heading" style={{ flexShrink: 1 }}>{item.name}</Txt>
            {item.universal ? <Chip label="suits everyone" accent="gold" /> : item.suited ? <Chip label="suits you" accent="sage" /> : null}
          </View>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{item.description}</Txt>
          {item.note ? <Txt variant="bodySm" style={{ marginTop: SPACE.sm }}>{item.note}</Txt> : null}
        </View>
      </View>
    </Card>
  );
}

function MetalCard({ item }: { item: MetalItem }) {
  return (
    <Card
      variant={item.suited ? 'tinted' : 'plain'}
      accent="gold"
      style={{ marginBottom: SPACE.md }}
    >
      <View style={styles.row}>
        <Swatch hex={item.hex} name={item.name} size={48} />
        <View style={{ flex: 1, marginLeft: SPACE.lg }}>
          <View style={styles.rowBetween}>
            <Txt variant="heading">{item.name}</Txt>
            {item.suited ? <Chip label="suits you" accent="gold" /> : null}
          </View>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{item.note}</Txt>
        </View>
      </View>
    </Card>
  );
}

export default function AccessoryCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const query = useAccessories();

  const key = category ? BUNDLE_KEY[category] : undefined;

  if (query.isLoading) return <LoadingState />;
  if (query.error) {
    return <ErrorState message="We could not load the library." onRetry={() => { void query.refetch(); }} />;
  }
  if (!key) {
    return <EmptyState title="Unknown category" body="Open the accessories explorer to browse everything." />;
  }

  const faceShape = query.data!.faceShape;
  const subtitle = faceShape
    ? `Ordered for a ${faceShape.replace('_', ' ')} face shape.`
    : 'Showing the full library.';

  if (key === 'metals') {
    const metals = query.data!.metals;
    return (
      <Screen>
        <PageHeader title={TITLE[category!] ?? 'Accessories'} subtitle={subtitle} />
        {metals.map((metal) => <MetalCard key={metal.key} item={metal} />)}
        <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.lg }}>{query.data!.note}</Txt>
      </Screen>
    );
  }

  const items = query.data![key] as AccessoryItem[];
  // Nothing is hidden — an item that is not a strong match still gets its
  // description and stays reachable, just under its own heading.
  const strongest = items.filter((item) => item.suited || item.universal);
  const alsoWorth = items.filter((item) => !item.suited && !item.universal);

  return (
    <Screen>
      <PageHeader title={TITLE[category!] ?? 'Accessories'} subtitle={subtitle} />

      {strongest.length > 0 && (
        <Section title={faceShape ? 'Your strongest matches' : 'The library'}>
          {strongest.map((item) => (
            <ItemCard key={item.key} item={item} category={category!} faceShape={faceShape} />
          ))}
        </Section>
      )}

      {alsoWorth.length > 0 && (
        <Section title="Also worth exploring">
          {alsoWorth.map((item) => (
            <ItemCard key={item.key} item={item} category={category!} faceShape={faceShape} />
          ))}
        </Section>
      )}

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.lg }}>{query.data!.note}</Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
});
