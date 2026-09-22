import { useMemo } from 'react';
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useLegacyTheme, type LegacyPalette } from '../../theme/legacy';
import { FONTS } from '../../constants/fonts';

interface Props {
  children: React.ReactNode;
  red?: boolean;
  style?: ViewStyle;
}

export function Tag({ children, red, style }: Props) {
  const { C } = useLegacyTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View
      style={[
        styles.tag,
        {
          backgroundColor: red ? C.redDim : C.goldDim,
          borderColor: red ? C.redBorder : C.goldBorder,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: red ? C.red : C.gold }]}>{children}</Text>
    </View>
  );
}

const makeStyles = (_C: LegacyPalette) => StyleSheet.create({
  tag: {
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 0.5,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
  },
});
