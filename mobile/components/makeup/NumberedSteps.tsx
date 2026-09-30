/**
 * A numbered technique list, so a routine reads as steps to follow rather than
 * a paragraph of bullets. Used anywhere a makeup look hands over an ordered
 * sequence (the overall routine, or one zone's technique).
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Txt } from '../ds';
import { RADIUS, SPACE } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';

export function NumberedSteps({ steps }: { steps: string[] }) {
  const { colors } = useTheme();
  if (!steps.length) return null;
  return (
    <View accessibilityRole="list">
      {steps.map((step, index) => (
        <View key={step} style={[styles.row, index === steps.length - 1 && { marginBottom: 0 }]}>
          <View style={[styles.badge, { backgroundColor: colors.goldSoft }]}>
            <Txt variant="caption" weight="semibold" tone="accent">{index + 1}</Txt>
          </View>
          <Txt variant="bodySm" style={styles.text}>{step}</Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACE.sm },
  badge: {
    width: 22, height: 22, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center',
    marginRight: SPACE.sm, marginTop: 1,
  },
  text: { flex: 1 },
});
