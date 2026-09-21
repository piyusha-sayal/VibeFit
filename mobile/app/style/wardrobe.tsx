import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, Chip, SectionHeader, Txt } from '../../components/ds';
import { WARDROBE } from '../../constants/wardrobe';
import { SPACE } from '../../constants/theme';
import { useBeautyProfile } from '../../hooks/useBeauty';
import { useTheme } from '../../theme/ThemeProvider';

const GROUPS = ['All', 'Indian', 'Global'] as const;

export default function WardrobeLibraryScreen() {
  const { colors } = useTheme();
  const profile = useBeautyProfile();
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('All');

  const shown = group === 'All' ? WARDROBE : WARDROBE.filter((w) => w.group === group);
  const aesthetics = profile.data?.aesthetics ?? [];

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="title" serif>Wardrobe library</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs, marginBottom: SPACE.lg }}>
        Every category is available to everyone. Nothing here is unlocked or restricted by where you are.
      </Txt>

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

      <View style={styles.section}>
        <SectionHeader title={`${shown.length} categories`} />
        {shown.map((item) => (
          <Card key={item.name} style={{ marginBottom: SPACE.sm }}>
            <View style={styles.rowBetween}>
              <Txt variant="body" weight="semibold">{item.name}</Txt>
              <Txt variant="caption" tone="subtle">{item.group}</Txt>
            </View>
            <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>{item.occasion}</Txt>
            <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.sm }}>{item.note}</Txt>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  section: { marginTop: SPACE.xxl },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm },
});
