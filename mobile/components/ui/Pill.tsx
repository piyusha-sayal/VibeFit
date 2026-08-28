import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { C } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

interface Props {
  children: React.ReactNode;
  active?: boolean;
  gold?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Pill({ children, active, gold, onPress, style, textStyle }: Props) {
  const bgColor = active ? C.gold : gold ? C.goldDim : C.surface2;
  const textColor = active ? C.bg : gold ? C.gold : C.textMuted;
  const borderColor = active ? C.gold : gold ? C.goldBorder : C.white06;

  const content = (
    <>
      <Text style={[styles.text, { color: textColor }, textStyle]}>{children}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.pill, { backgroundColor: bgColor, borderColor }, style]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <React.Fragment>
      <TouchableOpacity
        style={[styles.pill, { backgroundColor: bgColor, borderColor }, style]}
        disabled
      >
        {content}
      </TouchableOpacity>
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 9999,
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderWidth: 0.5,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontFamily: FONTS.sansMedium,
  },
});
