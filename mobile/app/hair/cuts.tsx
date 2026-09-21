import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, Chip, EmptyState, ErrorState, LoadingState, Txt } from '../../components/ds';
import { FaceFigure, INSPIRATION_NOTE } from '../../components/visual';
import { SPACE } from '../../constants/theme';
import { useHairstyles } from '../../hooks/useFace';
import type { HairFilters } from '../../services/faceService';
import { useTheme } from '../../theme/ThemeProvider';

const TEXTURES = ['straight', 'wavy', 'curly', 'coily'] as const;
const LENGTHS = ['short', 'medium', 'long'] as const;
const UPKEEP = ['low', 'medium', 'high'] as const;

/** Toggling a filter off passes undefined, which the API reads as "no filter". */
function toggle<T>(current: T | undefined, next: T): T | undefined {
  return current === next ? undefined : next;
}

export default function HaircutFinderScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [filters, setFilters] = useState<HairFilters>({});
  const query = useHairstyles(filters);

  const set = (patch: Partial<HairFilters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Haircut finder</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        {query.data?.faceShape
          ? `Ordered for a ${query.data.faceShape.replace('_', ' ')} face shape. Nothing here is off limits.`
          : 'Showing the full library. Add a face shape to order it for you.'}
      </Txt>

      <View style={{ marginTop: SPACE.xl }}>
        <Txt variant="overline" tone="muted">Texture</Txt>
        <View style={styles.chips}>
          {TEXTURES.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={filters.texture === t}
              onPress={() => set({ texture: toggle(filters.texture, t) })}
            />
          ))}
        </View>

        <Txt variant="overline" tone="muted" style={{ marginTop: SPACE.lg }}>Length</Txt>
        <View style={styles.chips}>
          {LENGTHS.map((l) => (
            <Chip
              key={l}
              label={l}
              accent="peach"
              selected={filters.length === l}
              onPress={() => set({ length: toggle(filters.length, l) })}
            />
          ))}
        </View>

        <Txt variant="overline" tone="muted" style={{ marginTop: SPACE.lg }}>Upkeep at most</Txt>
        <View style={styles.chips}>
          {UPKEEP.map((m) => (
            <Chip
              key={m}
              label={m}
              accent="sage"
              selected={filters.maintenance === m}
              onPress={() => set({ maintenance: toggle(filters.maintenance, m) })}
            />
          ))}
          <Chip
            label="protective only"
            accent="lavender"
            selected={Boolean(filters.protectiveOnly)}
            onPress={() => set({ protectiveOnly: !filters.protectiveOnly })}
          />
        </View>
      </View>

      {query.isLoading ? (
        <LoadingState label="Finding cuts…" />
      ) : query.error ? (
        <ErrorState message="We could not load the hairstyle library." onRetry={() => { void query.refetch(); }} />
      ) : (query.data?.styles.length ?? 0) === 0 ? (
        <EmptyState
          title="Nothing matches all of those"
          body="Try loosening one filter — usually upkeep or length."
          actionLabel="Clear filters"
          onAction={() => setFilters({})}
        />
      ) : (
        <View style={{ marginTop: SPACE.xl }}>
          <Txt variant="overline" tone="muted" style={{ marginBottom: SPACE.sm }}>
            {query.data!.count} cuts
          </Txt>
          {query.data!.styles.map((style) => (
            <Card
              key={style.key}
              style={{ marginBottom: SPACE.md }}
              onPress={() => router.push(`/hair/salon/${style.key}` as never)}
              accessibilityLabel={`${style.name}, ${style.maintenance} maintenance`}
            >
              <View style={styles.row}>
                <FaceFigure
                  hairLength={style.length as 'short' | 'medium' | 'long'}
                  hairTexture={
                    (filters.texture ?? style.textures[0]) as 'straight' | 'wavy' | 'curly' | 'coily'
                  }
                  seed={style.key}
                  size={76}
                  label={`${style.name}, illustration`}
                />
                <View style={{ flex: 1, marginLeft: SPACE.md }}>
                  <View style={styles.rowBetween}>
                    <Txt variant="heading">{style.name}</Txt>
                    <Txt variant="caption" tone="muted">{style.length}</Txt>
                  </View>
                  <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>
                    {style.description}
                  </Txt>
                </View>
              </View>

              <View style={[styles.chips, { marginTop: SPACE.md }]}>
                <Chip label={`${style.maintenance} upkeep`} accent="sage" />
                <Chip label={`${style.stylingMinutes} min/day`} accent="peach" />
                {style.protective && <Chip label="protective" accent="lavender" />}
              </View>

              {style.reasons.slice(0, 2).map((reason) => (
                <Txt key={reason} variant="bodySm" style={{ marginTop: SPACE.xs }}>• {reason}</Txt>
              ))}
              <Txt variant="caption" tone="accent" weight="semibold" style={{ marginTop: SPACE.sm }}>
                What to ask for →
              </Txt>
            </Card>
          ))}
        </View>
      )}

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.lg }}>
        {INSPIRATION_NOTE} {query.data?.disclaimer}
      </Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
});
