import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, Chip, ErrorState, LoadingState, SectionHeader, Swatch, Txt } from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { useAccessories } from '../../hooks/useFace';
import type { AccessoryItem } from '../../services/faceService';
import { useTheme } from '../../theme/ThemeProvider';

const CATEGORIES = [
  { key: 'glasses', label: 'Glasses' },
  { key: 'earrings', label: 'Earrings' },
  { key: 'necklines', label: 'Necklines' },
  { key: 'hairAccessories', label: 'Hair' },
  { key: 'metals', label: 'Metals' },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]['key'];

function ItemCard({ item }: { item: AccessoryItem }) {
  return (
    <Card
      variant={item.suited ? 'tinted' : 'plain'}
      accent="sage"
      style={{ marginBottom: SPACE.md }}
    >
      <View style={styles.rowBetween}>
        <Txt variant="heading">{item.name}</Txt>
        {item.suited ? <Chip label="often suits you" accent="sage" /> : null}
        {item.universal ? <Chip label="suits everyone" accent="gold" /> : null}
      </View>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{item.description}</Txt>
      {item.note ? (
        <Txt variant="bodySm" style={{ marginTop: SPACE.sm }}>{item.note}</Txt>
      ) : null}
    </Card>
  );
}

export default function AccessoriesScreen() {
  const { colors } = useTheme();
  const [active, setActive] = useState<CategoryKey>('glasses');
  const query = useAccessories();

  const bundle = query.data;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Accessories</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        {bundle?.faceShape
          ? `Ordered for a ${bundle.faceShape.replace('_', ' ')} face shape.`
          : 'Add a face shape and these reorder for you.'}
      </Txt>

      <View style={styles.chips}>
        {CATEGORIES.map((category) => (
          <Chip
            key={category.key}
            label={category.label}
            selected={active === category.key}
            onPress={() => setActive(category.key)}
          />
        ))}
      </View>

      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState message="We could not load the accessories library." onRetry={() => { void query.refetch(); }} />
      ) : active === 'metals' ? (
        <View style={{ marginTop: SPACE.xl }}>
          <SectionHeader title="Metals" />
          {bundle!.metals.map((metal) => (
            <Card
              key={metal.key}
              variant={metal.suited ? 'tinted' : 'plain'}
              accent="gold"
              style={{ marginBottom: SPACE.md }}
            >
              <View style={styles.row}>
                <Swatch hex={metal.hex} name={metal.name} size={48} />
                <View style={{ flex: 1, marginLeft: SPACE.lg }}>
                  <Txt variant="heading">{metal.name}</Txt>
                  <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{metal.note}</Txt>
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <View style={{ marginTop: SPACE.xl }}>
          {(bundle![active] as AccessoryItem[]).map((item) => (
            <ItemCard key={item.key} item={item} />
          ))}
        </View>
      )}

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.lg }}>
        {bundle?.note}
      </Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.xl },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
});
