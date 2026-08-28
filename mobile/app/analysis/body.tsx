import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAnalysisStore } from '../../store/analysisStore';
import { FloatingNav } from '../../components/ui/FloatingNav';
import { Lbl } from '../../components/ui/Lbl';
import { Tag } from '../../components/ui/Tag';
import { C } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

const BODY_SHAPES = {
  hourglass: { label: 'Hourglass', tip: 'Highlight your waist with belted styles and wrap silhouettes.' },
  pear: { label: 'Pear', tip: 'Balance with structured shoulders and A-line skirts.' },
  apple: { label: 'Apple', tip: 'Empire waists and flowy fabrics create elegant length.' },
  rectangle: { label: 'Rectangle', tip: 'Create curves with peplum tops, full skirts, and layering.' },
  inverted_triangle: { label: 'Inverted Triangle', tip: 'Wide-leg trousers and A-line skirts balance broad shoulders.' },
} as const;

type BodyShapeKey = keyof typeof BODY_SHAPES;

const PROPORTION_TIPS = [
  { label: 'Vertical Line', tip: 'Wear vertical stripes or monochromatic looks to appear taller.' },
  { label: 'Focal Point', tip: 'Draw attention to your best features with color and detail.' },
  { label: 'Proportion Match', tip: 'Balance volume — if top is loose, wear fitted bottoms and vice versa.' },
  { label: 'Length Play', tip: 'High-waisted styles elongate the leg line for most proportions.' },
];

export default function BodyScreen() {
  const router = useRouter();
  const currentAnalysis = useAnalysisStore((s) => s.currentAnalysis);
  const body = currentAnalysis?.bodyAnalysis;

  const shapeKey = (body?.shape as BodyShapeKey) ?? null;
  const shapeData = shapeKey ? BODY_SHAPES[shapeKey] : null;

  const proportions = body?.proportions;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Lbl>Analysis</Lbl>
            <Text style={styles.title}>Body Styling</Text>
          </View>
        </View>

        {/* Body shape */}
        <View style={styles.card}>
          <Lbl style={{ marginBottom: 10 }}>Body Shape</Lbl>
          {shapeData ? (
            <>
              <View style={styles.shapeRow}>
                <Text style={styles.shapeName}>{shapeData.label}</Text>
                <Tag>Your Shape</Tag>
              </View>
              <Text style={styles.shapeTip}>{shapeData.tip}</Text>
            </>
          ) : (
            <Text style={styles.hint}>
              Body shape analysis requires a full-body photo. Upload one on the Scan screen.
            </Text>
          )}
        </View>

        {/* Proportions */}
        {proportions && (
          <View style={styles.card}>
            <Lbl style={{ marginBottom: 12 }}>Proportions</Lbl>
            {[
              { label: 'Shoulder Width', value: Math.round((proportions.shoulderToHip ?? 0.5) * 100) },
              { label: 'Waist Definition', value: Math.round((proportions.waistToHip ?? 0.5) * 100) },
              { label: 'Leg Length', value: Math.round((proportions.legToTorso ?? 0.5) * 100) },
            ].map((p) => (
              <View key={p.label} style={styles.propRow}>
                <Text style={styles.propLabel}>{p.label}</Text>
                <View style={styles.propTrack}>
                  <View style={[styles.propFill, { width: `${p.value}%` as `${number}%` }]} />
                </View>
                <Text style={styles.propValue}>{p.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Proportion tips */}
        <Lbl style={styles.sectionLabel}>Dressing Principles</Lbl>
        {PROPORTION_TIPS.map((p) => (
          <View key={p.label} style={styles.principleCard}>
            <Text style={styles.principleLabel}>{p.label}</Text>
            <Text style={styles.principleText}>{p.tip}</Text>
          </View>
        ))}

        {/* All body shapes reference */}
        <View style={styles.card}>
          <Lbl style={{ marginBottom: 12 }}>All Body Shape Tips</Lbl>
          {Object.entries(BODY_SHAPES).map(([key, val]) => (
            <View key={key} style={[styles.shapeRefRow, shapeKey === key && styles.shapeRefRowActive]}>
              <Text style={[styles.shapeRefLabel, shapeKey === key && styles.shapeRefLabelActive]}>{val.label}</Text>
              <Text style={styles.shapeRefTip}>{val.tip}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
      <FloatingNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingTop: 62 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: C.white06, marginTop: 4 },
  backArrow: { fontFamily: FONTS.sans, fontSize: 18, color: C.textMuted },
  headerText: { flex: 1 },
  title: { fontFamily: FONTS.serif, fontSize: 28, color: C.text, marginTop: 4 },
  card: { marginHorizontal: 20, marginBottom: 16, backgroundColor: C.surface, borderRadius: 18, borderWidth: 0.5, borderColor: C.white06, padding: 18 },
  shapeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  shapeName: { fontFamily: FONTS.serif, fontSize: 22, color: C.gold },
  shapeTip: { fontFamily: FONTS.sans, fontSize: 13, color: C.textMuted, lineHeight: 20 },
  hint: { fontFamily: FONTS.sans, fontSize: 13, color: C.textSubtle, lineHeight: 20 },
  propRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  propLabel: { fontFamily: FONTS.sansMedium, fontSize: 12, color: C.textMuted, width: 120 },
  propTrack: { flex: 1, height: 4, backgroundColor: C.surface3, borderRadius: 2, overflow: 'hidden' },
  propFill: { height: '100%', backgroundColor: C.gold, borderRadius: 2 },
  propValue: { fontFamily: FONTS.sansBold, fontSize: 12, color: C.gold, width: 28, textAlign: 'right' },
  sectionLabel: { marginHorizontal: 20, marginBottom: 10 },
  principleCard: { marginHorizontal: 20, backgroundColor: C.surface, borderRadius: 14, borderWidth: 0.5, borderColor: C.white06, padding: 14, marginBottom: 8, gap: 4 },
  principleLabel: { fontFamily: FONTS.sansSemiBold, fontSize: 13, color: C.gold },
  principleText: { fontFamily: FONTS.sans, fontSize: 13, color: C.textMuted, lineHeight: 19 },
  shapeRefRow: { paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.white06, gap: 3 },
  shapeRefRowActive: { borderLeftWidth: 2, borderLeftColor: C.gold, paddingLeft: 10, marginLeft: -10 },
  shapeRefLabel: { fontFamily: FONTS.sansMedium, fontSize: 13, color: C.textMuted },
  shapeRefLabelActive: { color: C.gold },
  shapeRefTip: { fontFamily: FONTS.sans, fontSize: 12, color: C.textSubtle, lineHeight: 18 },
});
