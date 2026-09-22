import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, Chip, ErrorState, LoadingState, Txt } from '../../components/ds';
import { FaceFigure, INSPIRATION_NOTE } from '../../components/visual';
import type { Fringe } from '../../components/visual/shapes';
import { SPACE } from '../../constants/theme';
import { useBangs } from '../../hooks/useFace';
import { useTheme } from '../../theme/ThemeProvider';

export default function BangsFinderScreen() {
  const { colors } = useTheme();
  const query = useBangs();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Fringe finder</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        A fringe is the hardest cut to undo, so the option of not having one
        stays on this list.
      </Txt>

      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState message="We could not load the fringe guide." onRetry={() => { void query.refetch(); }} />
      ) : (
        <View style={{ marginTop: SPACE.xl }}>
          {query.data!.bangs.map((entry) => (
            <Card
              key={entry.key}
              variant={entry.suited ? 'tinted' : 'plain'}
              accent="blush"
              style={{ marginBottom: SPACE.md }}
            >
              <View style={styles.row}>
                {/* Eight fringes described in words and drawn not at all was
                    the gap here: the one thing a fringe finder has to show is
                    what the fringe looks like. */}
                <FaceFigure
                  fringe={entry.key as Fringe}
                  hairSilhouette="rounded"
                  seed={entry.key}
                  size={72}
                  label={`${entry.name}, schematic illustration`}
                />
                <View style={{ flex: 1, marginLeft: SPACE.md }}>
                  <View style={styles.rowBetween}>
                    <Txt variant="heading">{entry.name}</Txt>
                    {entry.suited && <Chip label="often suits you" accent="blush" />}
                  </View>
                  <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{entry.description}</Txt>
                </View>
              </View>
              <Txt variant="bodySm" style={{ marginTop: SPACE.sm }}>{entry.notes}</Txt>
              <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.sm }}>
                {entry.maintenance} maintenance · works on {entry.textures.join(', ')} hair
              </Txt>
            </Card>
          ))}
        </View>
      )}

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.lg }}>{INSPIRATION_NOTE}</Txt>
      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xs }}>{query.data?.disclaimer}</Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
});
