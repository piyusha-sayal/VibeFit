import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Txt } from '../ds';
import { PressScale } from '../ds/PressScale';
import { RADIUS, SPACE, accentPair, type AccentKey } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';
import type { PassportAttribute } from '../../services/beautyService';

const SNAPSHOT_KEYS: { key: string; short: string; accent: AccentKey }[] = [
  { key: 'personal_colour', short: 'Season', accent: 'blush' },
  { key: 'undertone', short: 'Undertone', accent: 'peach' },
  { key: 'face_shape', short: 'Face shape', accent: 'lavender' },
  { key: 'aesthetics', short: 'Style', accent: 'sage' },
  { key: 'hair_type', short: 'Hair', accent: 'gold' },
];

/** Only the passport facts already known, as a tappable strip to the full passport. */
export function PassportSnapshot({ attributes }: { attributes: PassportAttribute[] }) {
  const router = useRouter();
  const { colors } = useTheme();

  const known = SNAPSHOT_KEYS
    .map((s) => ({ ...s, attr: attributes.find((a) => a.key === s.key) }))
    .filter((s): s is typeof s & { attr: PassportAttribute } => s.attr?.status === 'present');

  if (!known.length) return null;

  return (
    <PressScale
      onPress={() => router.push('/(tabs)/passport' as never)}
      accessibilityLabel="Your beauty passport snapshot. Open your passport"
    >
      <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        {known.map((s) => {
          const tint = accentPair(colors, s.accent);
          const value = Array.isArray(s.attr.value) ? s.attr.value.join(', ') : s.attr.value;
          return (
            <View key={s.key} style={styles.cell}>
              <Txt variant="overline" tone="muted">{s.short}</Txt>
              <Txt variant="bodySm" weight="semibold" numberOfLines={1} style={{ color: tint.fg, marginTop: 2 }}>
                {value}
              </Txt>
            </View>
          );
        })}
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RADIUS.lg,
    padding: SPACE.lg,
  },
  cell: { minWidth: 84 },
});
