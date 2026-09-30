import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Chip, EmptyState, PageHeader, Screen, Section, Txt } from '../../components/ds';
import { WARDROBE } from '../../constants/wardrobe';
import { SPACE } from '../../constants/theme';
import { useBeautyProfile } from '../../hooks/useBeauty';

const GROUPS = ['All', 'Indian', 'Global'] as const;

export default function WardrobeLibraryScreen() {
  const profile = useBeautyProfile();
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('All');

  const shown = group === 'All' ? WARDROBE : WARDROBE.filter((w) => w.group === group);
  const aesthetics = profile.data?.aesthetics ?? [];

  return (
    <Screen>
      <PageHeader
        title="Wardrobe library"
        subtitle="Every category is available to everyone. Nothing here is unlocked or restricted by where you are."
      />

      <View style={styles.wrap}>
        {GROUPS.map((g) => (
          <Chip key={g} label={g} accent="sage" selected={group === g} onPress={() => setGroup(g)} />
        ))}
      </View>

      {aesthetics.length ? (
        <Card variant="tinted" accent="gold" style={{ marginTop: SPACE.lg }}>
          <Txt variant="overline" tone="muted">Your aesthetics</Txt>
          <Txt variant="bodySm" style={{ marginTop: SPACE.xs }}>{aesthetics.join(' · ')}</Txt>
        </Card>
      ) : null}

      <Section title={`${shown.length} categories`}>
        {shown.length === 0 ? (
          <EmptyState
            title="Nothing in this group"
            body="Try another group — every category is one tap away."
          />
        ) : (
          <View style={styles.grid}>
            {shown.map((item) => (
              <View key={item.name} style={styles.tile}>
                <Card style={{ flex: 1 }}>
                  <Txt variant="body" weight="semibold">{item.name}</Txt>
                  <Txt variant="caption" tone="subtle" style={{ marginTop: 2 }}>{item.group}</Txt>
                  <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.sm }}>{item.occasion}</Txt>
                  <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.sm }}>{item.note}</Txt>
                </Card>
              </View>
            ))}
          </View>
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48%', marginBottom: SPACE.md },
});
