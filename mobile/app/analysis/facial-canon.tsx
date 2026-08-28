import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import { useAnalysisStore } from '../../store/analysisStore';
import { FloatingNav } from '../../components/ui/FloatingNav';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Lbl } from '../../components/ui/Lbl';
import { C, GRADIENTS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

function CanonTile({ label }: { label: string }) {
  return (
    <View style={styles.canonTile}>
      <View style={styles.canonDot} />
      <Text style={styles.canonLabel}>{label}</Text>
    </View>
  );
}

function FaceOutline() {
  return (
    <Svg width={140} height={170} viewBox="0 0 140 170" fill="none">
      <Path
        d="M70 10 C95 10 115 32 115 65 C115 95 105 130 70 158 C35 130 25 95 25 65 C25 32 45 10 70 10 Z"
        stroke={C.gold}
        strokeWidth={1.2}
        strokeOpacity={0.55}
        fill="none"
      />
      <Line x1={25} y1={55} x2={115} y2={55} stroke={C.gold} strokeWidth={0.5} strokeOpacity={0.35} strokeDasharray="3 3" />
      <Line x1={25} y1={95} x2={115} y2={95} stroke={C.gold} strokeWidth={0.5} strokeOpacity={0.35} strokeDasharray="3 3" />
      <Line x1={70} y1={10} x2={70} y2={158} stroke={C.gold} strokeWidth={0.5} strokeOpacity={0.35} strokeDasharray="3 3" />
      <Circle cx={52} cy={70} r={2.5} fill={C.gold} />
      <Circle cx={88} cy={70} r={2.5} fill={C.gold} />
      <Circle cx={70} cy={92} r={1.8} fill={C.gold} />
      <Path d="M58 118 Q70 124 82 118" stroke={C.gold} strokeWidth={1} fill="none" />
    </Svg>
  );
}

const CANON_LABELS: Array<{ key: 'facialThirds' | 'goldenRatio' | 'eyeSpacing' | 'lipRatio' | 'jawAngle'; label: string }> = [
  { key: 'facialThirds', label: 'Facial Thirds' },
  { key: 'goldenRatio', label: 'Proportion Balance' },
  { key: 'eyeSpacing', label: 'Eye Spacing' },
  { key: 'lipRatio', label: 'Lip Proportion' },
  { key: 'jawAngle', label: 'Jaw Angle' },
];

export default function FacialCanonScreen() {
  const face = useAnalysisStore((s) => s.currentAnalysis?.faceAnalysis);

  const canonEntries = CANON_LABELS.filter((c) => face?.canon?.[c.key] !== undefined);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="Analysis" title="Facial Canon" style={{ paddingHorizontal: 20 }} />

        {/* Hero: face shape, no attractiveness rating */}
        <LinearGradient colors={GRADIENTS.hero} style={styles.heroCard}>
          <View style={styles.heroInner}>
            <View style={styles.heroLeft}>
              <Lbl>Face Shape</Lbl>
              {face?.shape ? (
                <Text style={styles.heroShapeTitle}>{String(face.shape).charAt(0).toUpperCase() + String(face.shape).slice(1)}</Text>
              ) : (
                <Text style={styles.heroShapeTitle}>—</Text>
              )}
              <Text style={styles.heroNote}>Used to guide styling suggestions — not a rating.</Text>
            </View>
            <FaceOutline />
          </View>
        </LinearGradient>

        {/* Facial proportion observations */}
        {canonEntries.length > 0 && (
          <View style={styles.section}>
            <Lbl style={{ marginBottom: 11, paddingHorizontal: 20 }}>Proportion Notes</Lbl>
            <View style={styles.canonGrid}>
              {canonEntries.map((c) => (
                <CanonTile key={c.key} label={c.label} />
              ))}
            </View>
          </View>
        )}

        {canonEntries.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              Detailed facial proportions will appear here after a full analysis.
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

  heroCard: { marginHorizontal: 20, borderRadius: 22, borderWidth: 0.5, borderColor: C.goldBorder, padding: 20, marginBottom: 16 },
  heroInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLeft: { flex: 1 },
  heroShapeTitle: { fontFamily: FONTS.serif, fontSize: 32, color: C.gold, lineHeight: 36, marginTop: 4 },
  heroNote: { fontFamily: FONTS.sans, fontSize: 12, color: C.textMuted, marginTop: 10, lineHeight: 17 },

  section: { marginBottom: 8 },
  canonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  canonTile: { flexBasis: '31.5%', backgroundColor: C.surface, borderRadius: 14, borderWidth: 0.5, borderColor: C.white06, padding: 14, alignItems: 'center' },
  canonDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold, marginBottom: 8 },
  canonLabel: { fontFamily: FONTS.sansBold, fontSize: 10, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

  card: { marginHorizontal: 20, marginTop: 16, backgroundColor: C.surface, borderRadius: 18, borderWidth: 0.5, borderColor: C.white06, padding: 18 },
  emptyText: { fontFamily: FONTS.sans, fontSize: 13, color: C.textMuted, lineHeight: 20, textAlign: 'center' },
});
