import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Lbl } from './Lbl';
import { C } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

interface Props {
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
  style?: ViewStyle;
}

export function ScreenHeader({ eyebrow, title, right, style }: Props) {
  const router = useRouter();
  return (
    <View style={[styles.header, style]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>
      <View style={styles.headerText}>
        <Lbl>{eyebrow}</Lbl>
        <Text style={styles.title}>{title}</Text>
      </View>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: C.white06, marginTop: 4 },
  backArrow: { fontFamily: FONTS.sans, fontSize: 18, color: C.textMuted },
  headerText: { flex: 1 },
  title: { fontFamily: FONTS.serif, fontSize: 28, color: C.text, marginTop: 4 },
  right: { marginTop: 4 },
});
