import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAnalysisStore } from '../../store/analysisStore';
import { FloatingNav } from '../../components/ui/FloatingNav';
import { Lbl } from '../../components/ui/Lbl';
import { C } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import type { ColorSwatch } from '../../types';

function Swatch({ swatch, size = 44 }: { swatch: ColorSwatch; size?: number }) {
  return (
    <View style={styles.swatchWrap}>
      <View style={[styles.swatchCircle, { backgroundColor: swatch.hex, width: size, height: size, borderRadius: size / 2 }]} />
      {swatch.name && <Text style={styles.swatchName} numberOfLines={1}>{swatch.name}</Text>}
    </View>
  );
}

function SwatchSection({ title, swatches }: { title: string; swatches: ColorSwatch[] }) {
  if (!swatches?.length) return null;
  return (
    <View style={styles.card}>
      <Lbl style={{ marginBottom: 14 }}>{title}</Lbl>
      <View style={styles.swatchRow}>
        {swatches.map((s, i) => (
          <Swatch key={`${s.hex}-${i}`} swatch={s} />
        ))}
      </View>
    </View>
  );
}

export default function MakeupScreen() {
  const router = useRouter();
  const makeup = useAnalysisStore((s) => s.currentAnalysis?.colorAnalysis?.makeup);
  const seasonal = useAnalysisStore((s) => s.currentAnalysis?.colorAnalysis?.seasonal);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Lbl>Analysis</Lbl>
            <Text style={styles.title}>Makeup Guide</Text>
            {seasonal && <Text style={styles.subtitle}>Tailored for {seasonal.label}</Text>}
          </View>
        </View>

        <SwatchSection title="Lip Colors" swatches={makeup?.lipColors ?? []} />
        <SwatchSection title="Eye Shadows" swatches={makeup?.eyeShadows ?? []} />
        <SwatchSection title="Blushes" swatches={makeup?.blushes ?? []} />

        {makeup?.notes?.length ? (
          <View style={styles.card}>
            <Lbl style={{ marginBottom: 10 }}>Application Notes</Lbl>
            {makeup.notes.map((n) => (
              <View key={n} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{n}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {!makeup && (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              Personalized makeup swatches will appear here after color analysis.
            </Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
      <FloatingNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingTop: 62 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, marginBottom: 18 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: C.white06, marginTop: 4 },
  backArrow: { fontFamily: FONTS.sans, fontSize: 18, color: C.textMuted },
  headerText: { flex: 1 },
  title: { fontFamily: FONTS.serif, fontSize: 28, color: C.text, marginTop: 4 },
  subtitle: { fontFamily: FONTS.sans, fontSize: 12, color: C.textMuted, marginTop: 4 },
  card: { marginHorizontal: 20, marginBottom: 12, backgroundColor: C.surface, borderRadius: 18, borderWidth: 0.5, borderColor: C.white06, padding: 18 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  swatchWrap: { alignItems: 'center', width: 60 },
  swatchCircle: { borderWidth: 0.5, borderColor: C.white06 },
  swatchName: { fontFamily: FONTS.sans, fontSize: 10, color: C.textMuted, marginTop: 6, textAlign: 'center' },
  tipRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 },
  tipDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.goldBorder, marginTop: 7, flexShrink: 0 },
  tipText: { fontFamily: FONTS.sans, fontSize: 13, color: C.textMuted, lineHeight: 20, flex: 1 },
  emptyText: { fontFamily: FONTS.sans, fontSize: 13, color: C.textMuted, lineHeight: 20, textAlign: 'center' },
});
