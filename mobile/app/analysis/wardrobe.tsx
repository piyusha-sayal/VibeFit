import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAnalysisStore } from '../../store/analysisStore';
import { FloatingNav } from '../../components/ui/FloatingNav';
import { Lbl } from '../../components/ui/Lbl';
import { Tag } from '../../components/ui/Tag';
import { Pill } from '../../components/ui/Pill';
import { VNeck, WrapNeck, OffShoulder, ScoopNeck, SquareNeck, CowlNeck } from '../../components/illustrations/Necklines';
import { C } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

const NECKLINES = [
  { id: 'vneck', label: 'V-Neck', desc: 'Elongates the neck, flatters most face shapes.', Illustration: VNeck, score: 95 },
  { id: 'wrap', label: 'Wrap', desc: 'Creates a diagonal line, visually slims and shapes.', Illustration: WrapNeck, score: 90 },
  { id: 'offshoulder', label: 'Off-Shoulder', desc: 'Draws the eye wide, balances a narrower hip.', Illustration: OffShoulder, score: 82 },
  { id: 'scoop', label: 'Scoop Neck', desc: 'Versatile and universally flattering.', Illustration: ScoopNeck, score: 78 },
  { id: 'square', label: 'Square Neck', desc: 'Adds structure, great for fuller busts.', Illustration: SquareNeck, score: 72 },
  { id: 'cowl', label: 'Cowl Neck', desc: 'Soft drape, elegant for evening looks.', Illustration: CowlNeck, score: 68 },
];

const PALETTES: { label: string; color: string }[] = [
  { label: 'Camel', color: '#c19a6b' },
  { label: 'Ivory', color: '#f2ece3' },
  { label: 'Chocolate', color: '#5c3d2e' },
  { label: 'Rust', color: '#b5541b' },
  { label: 'Sage', color: '#8a9e7b' },
  { label: 'Navy', color: '#1a2744' },
];

export default function WardrobeScreen() {
  const router = useRouter();
  const currentAnalysis = useAnalysisStore((s) => s.currentAnalysis);
  const outfits = currentAnalysis?.recommendations?.filter((r) => r.category === 'outfit') ?? [];

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
            <Text style={styles.title}>Outfit Styling</Text>
          </View>
        </View>

        {/* Wardrobe palette */}
        <View style={styles.card}>
          <Lbl style={{ marginBottom: 12 }}>Your Wardrobe Palette</Lbl>
          <View style={styles.paletteGrid}>
            {PALETTES.map((p) => (
              <View key={p.label} style={styles.paletteItem}>
                <View style={[styles.paletteCircle, { backgroundColor: p.color }]} />
                <Text style={styles.paletteLabel}>{p.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Necklines */}
        <Lbl style={styles.sectionLabel}>Neckline Guide</Lbl>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.neckRow}>
          {NECKLINES.map((n, i) => (
            <View key={n.id} style={[styles.neckCard, i === 0 && styles.neckCardBest]}>
              <n.Illustration color={i === 0 ? C.gold : C.textMuted} size={64} />
              <Text style={[styles.neckLabel, i === 0 && styles.neckLabelBest]}>{n.label}</Text>
              <Text style={styles.neckScore}>{n.score}%</Text>
              {i === 0 && <Tag style={styles.neckTag}>Best</Tag>}
            </View>
          ))}
        </ScrollView>

        {/* Outfit recs */}
        {outfits.length > 0 && (
          <View style={styles.section}>
            <Lbl style={{ marginBottom: 12 }}>Outfit Matches</Lbl>
            {outfits.slice(0, 6).map((r) => (
              <View key={r.id} style={styles.outfitCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.outfitTitle}>{r.title}</Text>
                  {r.description && <Text style={styles.outfitDesc}>{r.description}</Text>}
                </View>
                <View style={styles.matchBadge}>
                  <Text style={styles.matchText}>{Math.round(r.confidence * 100)}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Style tips */}
        <View style={styles.card}>
          <Lbl style={{ marginBottom: 10 }}>Style Principles</Lbl>
          {[
            'Monochromatic looks in your undertone range elongate and refine.',
            'Avoid very busy patterns near the face — keep prints on lower half.',
            'Structured shoulders balance a proportionally wider hip.',
          ].map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
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
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  paletteItem: { alignItems: 'center', gap: 6 },
  paletteCircle: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: C.white06 },
  paletteLabel: { fontFamily: FONTS.sans, fontSize: 10, color: C.textMuted },
  sectionLabel: { marginHorizontal: 20, marginBottom: 12 },
  neckRow: { paddingHorizontal: 20, gap: 10, paddingBottom: 16 },
  neckCard: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 0.5, borderColor: C.white06, padding: 14, alignItems: 'center', gap: 6, width: 100 },
  neckCardBest: { borderColor: C.goldBorder },
  neckLabel: { fontFamily: FONTS.sansMedium, fontSize: 12, color: C.textMuted, textAlign: 'center' },
  neckLabelBest: { color: C.gold },
  neckScore: { fontFamily: FONTS.sansBold, fontSize: 11, color: C.gold },
  neckTag: { marginTop: 2 },
  section: { paddingHorizontal: 20, marginBottom: 16 },
  outfitCard: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 0.5, borderColor: C.white06, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  outfitTitle: { fontFamily: FONTS.sansMedium, fontSize: 14, color: C.text },
  outfitDesc: { fontFamily: FONTS.sans, fontSize: 12, color: C.textMuted, marginTop: 2 },
  matchBadge: { backgroundColor: C.surface3, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: C.goldBorder },
  matchText: { fontFamily: FONTS.sansBold, fontSize: 12, color: C.gold },
  tipRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 },
  tipDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.goldBorder, marginTop: 7, flexShrink: 0 },
  tipText: { fontFamily: FONTS.sans, fontSize: 13, color: C.textMuted, lineHeight: 20, flex: 1 },
});
