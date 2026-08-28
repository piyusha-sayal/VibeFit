import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { C } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

interface Props {
  children: React.ReactNode;
  style?: TextStyle;
}

export function Lbl({ children, style }: Props) {
  return <Text style={[styles.lbl, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  lbl: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.textMuted,
  },
});
