import React from 'react';

import { Card, Chip, ErrorState, LoadingState, PageHeader, Screen, Txt } from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { usePartings } from '../../hooks/useFace';

export default function PartingGuideScreen() {
  const query = usePartings();

  return (
    <Screen>
      <PageHeader
        title="Parting guide"
        subtitle="The cheapest change in this whole app: free, reversible, and visible in a second."
      />

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
            style={{ marginBottom: SPACE.md }}
          >
            <Txt variant="heading">{parting.name}</Txt>
            {parting.suited && <Chip label="often suits your shape" accent="gold" />}
            <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>{parting.note}</Txt>
          </Card>
        ))
      )}
    </Screen>
  );
}
