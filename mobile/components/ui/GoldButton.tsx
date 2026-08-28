import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { C } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  style?: ViewStyle;
}

export function GoldButton({ label, onPress, loading, disabled, variant = 'primary', style }: Props) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        isPrimary && styles.primary,
        isOutline && styles.outline,
        !isPrimary && !isOutline && styles.ghost,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? C.bg : C.gold} size="small" />
      ) : (
        <Text style={[styles.label, { color: isPrimary ? C.bg : C.gold }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 9999,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primary: {
    backgroundColor: C.gold,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: C.gold,
  },
  ghost: {
    backgroundColor: C.goldDim,
    borderWidth: 0.5,
    borderColor: C.goldBorder,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: FONTS.sansBold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
