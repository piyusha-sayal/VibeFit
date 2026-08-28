import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { C } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

interface Props {
  children: React.ReactNode;
  red?: boolean;
  style?: ViewStyle;
}

export function Tag({ children, red, style }: Props) {
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

const styles = StyleSheet.create({
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
