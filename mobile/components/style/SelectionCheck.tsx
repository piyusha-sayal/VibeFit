/**
 * A small corner check, so a card's selected state does not rely on its
 * background tint alone. Sits inside any relatively-positioned card.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Txt } from '../ds';
import { SPACE } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';

export function SelectionCheck({ selected }: { selected: boolean }) {
  const { colors } = useTheme();
  if (!selected) return null;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.badge, { backgroundColor: colors.gold, borderColor: colors.gold }]}
    >
      <Txt variant="caption" weight="bold" style={{ color: colors.onAccent }}>✓</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: SPACE.sm, right: SPACE.sm, width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
});
