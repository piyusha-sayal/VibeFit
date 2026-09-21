import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Card, Chip, ErrorState, LoadingState, Txt } from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { usePartings } from '../../hooks/useFace';
import { useTheme } from '../../theme/ThemeProvider';

export default function PartingGuideScreen() {
  const { colors } = useTheme();
  const query = usePartings();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Parting guide</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        The cheapest change in this whole app: free, reversible, and visible in
        a second.
      </Txt>

      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState message="We could not load the parting guide." onRetry={() => { void query.refetch(); }} />
      ) : (
        query.data!.partings.map((parting) => (
          <Card
            key={parting.key}
            variant={parting.suited ? 'tinted' : 'plain'}
            accent="gold"
            style={{ marginTop: SPACE.md }}
          >
            <Txt variant="heading">{parting.name}</Txt>
            {parting.suited && <Chip label="often suits your shape" accent="gold" />}
            <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>{parting.note}</Txt>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
});
