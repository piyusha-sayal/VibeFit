import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator, ViewStyle } from 'react-native';
import { C } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

interface GoogleButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  style?: ViewStyle;
}

export function GoogleButton({ onPress, loading, disabled, label = 'Continue with Google', style }: GoogleButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.btn, (disabled || loading) && styles.btnDisabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={C.text} />
      ) : (
        <>
          <View style={styles.icon}>
            <Text style={styles.iconG}>G</Text>
          </View>
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.white08,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  btnDisabled: { opacity: 0.5 },
  icon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconG: { color: '#4285F4', fontFamily: FONTS.sansBold, fontSize: 14, lineHeight: 16 },
  label: { color: C.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 },
});
