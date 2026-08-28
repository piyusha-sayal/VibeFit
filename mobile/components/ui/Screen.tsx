import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../../constants/colors';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  gradient?: [string, string, string?];
  safeArea?: boolean;
}

export function Screen({ children, style, gradient, safeArea = true }: Props) {
  const content = (
    <View style={[styles.inner, style]}>
      {children}
    </View>
  );

  if (gradient) {
    return (
      <LinearGradient colors={gradient as [string, string]} style={styles.flex}>
        {safeArea ? <SafeAreaView style={styles.flex}>{content}</SafeAreaView> : content}
      </LinearGradient>
    );
  }

  const wrapper = safeArea ? (
    <SafeAreaView style={[styles.container, style]}>{children}</SafeAreaView>
  ) : (
    <View style={[styles.container, style]}>{children}</View>
  );

  return wrapper;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  inner: {
    flex: 1,
  },
});
