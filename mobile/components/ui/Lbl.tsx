import { useMemo } from 'react';
import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { useLegacyTheme, type LegacyPalette } from '../../theme/legacy';
import { FONTS } from '../../constants/fonts';

interface Props {
  children: React.ReactNode;
  style?: TextStyle;
}

export function Lbl({ children, style }: Props) {
  const { C } = useLegacyTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return <Text style={[styles.lbl, style]}>{children}</Text>;
}

const makeStyles = (C: LegacyPalette) => StyleSheet.create({
  lbl: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.textMuted,
  },
});
