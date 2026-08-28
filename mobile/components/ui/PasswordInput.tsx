import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, TextInputProps } from 'react-native';
import { C } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  value: string;
  onChangeText: (text: string) => void;
}

export function PasswordInput({ value, onChangeText, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <TextInput
        {...rest}
        style={[styles.input, rest.style]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={C.textSubtle}
      />
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.toggleText}>{visible ? 'HIDE' : 'SHOW'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', justifyContent: 'center' },
  input: {
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.white08,
    borderRadius: 12,
    padding: 14,
    paddingRight: 64,
    fontFamily: FONTS.sans,
    fontSize: 15,
    color: C.text,
  },
  toggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  toggleText: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    letterSpacing: 1,
    color: C.gold,
  },
});
