import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Chip, ErrorState, LoadingState, PageHeader, Screen, Txt } from '../../components/ds';
import { FaceFigure, INSPIRATION_NOTE } from '../../components/visual';
import type { Fringe } from '../../components/visual/shapes';
import { SPACE } from '../../constants/theme';
import { useBangs } from '../../hooks/useFace';

export default function BangsFinderScreen() {
  const query = useBangs();

  return (
    <Screen>
      <PageHeader
        title="Fringe finder"
        subtitle="A fringe is the hardest cut to undo, so the option of not having one stays on this list."
      />

      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState message="We could not load the fringe guide." onRetry={() => { void query.refetch(); }} />
      ) : (
        <View>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
});
