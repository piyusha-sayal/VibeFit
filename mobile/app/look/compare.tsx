/**
 * Compare two or three saved looks side by side.
 *
 * Read-only. Comparing never alters the looks being compared, and a variant
 * you prefer is created by duplicating rather than by overwriting.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  Card, Chip, EmptyState, ErrorState, LoadingState, SectionHeader, Txt,
} from '../../components/ds';
import { LookSwatches } from '../../components/look';
import { RADIUS, SPACE } from '../../constants/theme';
import { useCompareLooks, useSavedLooks } from '../../hooks/useLook';
import { useTheme } from '../../theme/ThemeProvider';

const MAX_COMPARED = 3;

export default function CompareLooksScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { preselect } = useLocalSearchParams<{ preselect?: string }>();

  const saved = useSavedLooks();
  const [selected, setSelected] = useState<string[]>(preselect ? [preselect] : []);
  const comparison = useCompareLooks(selected);

  const toggle = (id: string) => setSelected((current) => {
    if (current.includes(id)) return current.filter((value) => value !== id);
    if (current.length >= MAX_COMPARED) return [...current.slice(1), id];
    return [...current, id];
  });

  if (saved.isLoading) return <LoadingState label="Finding your looks…" />;
  if (saved.error) {
    return <ErrorState message="We could not load your looks."
                       onRetry={() => { void saved.refetch(); }} />;
  }

  const looks = saved.data?.looks ?? [];

  if (looks.length < 2) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <EmptyState
          title="Save two looks first"
          body="Comparison needs at least two saved looks to put side by side."
          actionLabel="Create a look"
          onAction={() => router.push('/look/new' as never)}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Txt variant="display" serif>Compare looks</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        Pick two or three. Nothing you compare is changed.
      </Txt>

      <View style={styles.wrap}>
        {looks.map((look) => (
          <Chip
            key={look.id}
            label={look.name}
            accent="gold"
            selected={selected.includes(look.id)}
            onPress={() => toggle(look.id)}
          />
        ))}
      </View>

      {selected.length < 2 ? (
        <Txt variant="bodySm" tone="subtle" style={{ marginTop: SPACE.xl }}>
          Choose one more to compare.
        </Txt>
      ) : comparison.isLoading ? (
        <LoadingState label="Lining them up…" />
      ) : comparison.error ? (
        <ErrorState message="We could not compare those."
                    onRetry={() => { void comparison.refetch(); }} />
      ) : comparison.data ? (
        <View style={{ marginTop: SPACE.xl }}>
          <SectionHeader title="Side by side" />

          {/* Horizontal because three looks do not fit across a phone. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {comparison.data.looks.map((entry) => (
              <Card
                key={entry.id}
                style={[styles.column, { borderColor: colors.border }]}
                onPress={() => router.push(`/look/${entry.id}` as never)}
                accessibilityLabel={`${entry.name}, ${entry.status}`}
              >
                <Txt variant="heading" serif numberOfLines={2}>{entry.name}</Txt>
                <LookSwatches swatches={entry.swatches} size={22} />
                {comparison.data!.rows.map((row) => (
                  <View key={row.key} style={styles.cell}>
                    <Txt variant="overline" tone="subtle">{row.label}</Txt>
                    <Txt variant="bodySm" numberOfLines={3}>{entry.values[row.key]}</Txt>
                  </View>
                ))}
                <Txt variant="bodySm" tone="accent" weight="semibold"
                     style={{ marginTop: SPACE.sm }}>
                  Open →
                </Txt>
              </Card>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxl, paddingBottom: SPACE.xxxl * 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.lg },
  column: { width: 230, marginRight: SPACE.sm, borderRadius: RADIUS.md },
  cell: { marginTop: SPACE.sm },
});
