import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Card, Chip, EmptyState, ErrorState, LoadingState, Txt } from '../../components/ds';
import { GarmentFigure, INSPIRATION_NOTE } from '../../components/visual';
import { SPACE } from '../../constants/theme';
import { useSaveLook } from '../../hooks/useBeauty';
import { useGarments, useStyleOptions } from '../../hooks/useStyle';
import { useTheme } from '../../theme/ThemeProvider';

const REGIONS = [
  { key: undefined, label: 'All' },
  { key: 'indian', label: 'Indian' },
  { key: 'global', label: 'Global' },
];

export default function FashionLibraryScreen() {
  const { region: initialRegion } = useLocalSearchParams<{ region?: string }>();
  const { colors } = useTheme();
  const options = useStyleOptions();
  const [region, setRegion] = useState<string | undefined>(initialRegion);
  const [category, setCategory] = useState<string | undefined>();
  const query = useGarments({ region, category });
  const saveLook = useSaveLook();

  const title = region === 'indian'
    ? 'Indian fashion'
    : region === 'global' ? 'Global fashion' : 'Fashion library';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>{title}</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        Everything here is available to everyone. Your preferences order the
        list; they never remove a category.
      </Txt>

      <Txt variant="overline" tone="muted" style={{ marginTop: SPACE.xl }}>Tradition</Txt>
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

      <Txt variant="overline" tone="muted" style={{ marginTop: SPACE.lg }}>Category</Txt>
      <View style={styles.chips}>
        {(options.data?.categories ?? []).map((c) => (
          <Chip
            key={c}
            label={c.replace('_', ' ')}
            accent="sage"
            selected={category === c}
            onPress={() => setCategory(category === c ? undefined : c)}
          />
        ))}
      </View>

      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState message="We could not load the library." onRetry={() => { void query.refetch(); }} />
      ) : (query.data?.garments.length ?? 0) === 0 ? (
        <EmptyState title="Nothing matches" body="Try clearing one of the filters." />
      ) : (
        <View style={{ marginTop: SPACE.xl }}>
          <Txt variant="overline" tone="muted" style={{ marginBottom: SPACE.sm }}>
            {query.data!.count} pieces
          </Txt>
          {query.data!.garments.map((garment) => (
            <Card key={garment.key} style={{ marginBottom: SPACE.md }}>
              <View style={styles.row}>
                <GarmentFigure silhouette={garment.silhouette} seed={garment.key} width={70} />
                <View style={{ flex: 1, marginLeft: SPACE.lg }}>
                  <Txt variant="heading">{garment.name}</Txt>
                  <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>
                    {garment.description}
                  </Txt>
                  <View style={styles.chipsTight}>
                    <Chip label={garment.formality.replace('_', ' ')} accent="gold" />
                    <Chip label={garment.silhouette.replace(/_/g, ' ')} accent="sage" />
                    {garment.region === 'indian' ? <Chip label="Indian" accent="peach" /> : null}
                  </View>
                </View>
              </View>

              <View style={{ marginTop: SPACE.md }}>
                {garment.styling.slice(0, 2).map((line) => (
                  <Txt key={line} variant="bodySm" style={{ marginBottom: 2 }}>• {line}</Txt>
                ))}
              </View>
              {garment.note ? (
                <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.xs }}>
                  {garment.note}
                </Txt>
              ) : null}

              <Txt
                variant="caption"
                tone="accent"
                weight="semibold"
                style={{ marginTop: SPACE.md }}
                onPress={() => saveLook.mutate({
                  name: garment.name,
                  kind: 'outfit',
                  status: 'want_to_try',
                  payload: { garment: garment.key, category: garment.category },
                })}
              >
                Save to my Passport
              </Txt>
            </Card>
          ))}
        </View>
      )}

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.lg }}>
        {INSPIRATION_NOTE}
      </Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.sm },
  chipsTight: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs, marginTop: SPACE.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
});
