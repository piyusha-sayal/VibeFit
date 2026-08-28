import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { FloatingNav } from '../../components/ui/FloatingNav';
import { Lbl } from '../../components/ui/Lbl';
import { Tag } from '../../components/ui/Tag';
import { EarringIcon, NecklaceIcon, RingIcon, BraceletIcon } from '../../components/illustrations/Accessories';
import { C } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

const CATEGORIES = [
  {
    id: 'earrings',
    label: 'Earrings',
    Icon: EarringIcon,
    recs: [
      { title: 'Long Drop Earrings', desc: 'Elongate the neck and draw the eye vertically.' },
      { title: 'Geometric Hoops', desc: 'Add structure and frame the face with clean lines.' },
      { title: 'Pearl Studs', desc: 'Timeless and versatile — complement any undertone.' },
    ],
  },
  {
    id: 'necklaces',
    label: 'Necklaces',
    Icon: NecklaceIcon,
    recs: [
      { title: 'Long Pendant', desc: 'Creates a vertical line, slims the silhouette.' },
      { title: 'Layered Chains', desc: 'Adds texture and depth to necklines.' },
      { title: 'Choker', desc: 'Best with V or square necklines for proportion.' },
    ],
  },
  {
    id: 'rings',
    label: 'Rings',
    Icon: RingIcon,
    recs: [
      { title: 'Thin Stacking Rings', desc: 'Elongate the fingers, elegant and minimal.' },
      { title: 'Statement Signet', desc: 'Anchors the hand, works with any aesthetic.' },
    ],
  },
  {
    id: 'bracelets',
    label: 'Bracelets',
    Icon: BraceletIcon,
    recs: [
      { title: 'Delicate Chain', desc: 'Subtle elegance, suits warm gold undertones.' },
      { title: 'Cuff Bracelet', desc: 'Bold and sculptural, great for statement looks.' },
    ],
  },
];

const METAL_GUIDE = [
  { label: 'Yellow Gold', color: '#c9a87c', note: 'Best for warm undertones' },
  { label: 'Rose Gold', color: '#b5754c', note: 'Soft warmth, flatters medium undertones' },
  { label: 'Silver', color: '#a8adb3', note: 'Best for cool undertones' },
  { label: 'Gunmetal', color: '#5a5f68', note: 'Universal — edgy and modern' },
];

export default function AccessoriesScreen() {
  const router = useRouter();

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
            <Text style={styles.title}>Accessories</Text>
          </View>
        </View>

        {/* Metal guide */}
        <View style={styles.card}>
          <Lbl style={{ marginBottom: 12 }}>Metal Tone Guide</Lbl>
          <View style={styles.metalRow}>
            {METAL_GUIDE.map((m) => (
              <View key={m.label} style={styles.metalItem}>
                <View style={[styles.metalCircle, { backgroundColor: m.color }]} />
                <Text style={styles.metalLabel}>{m.label}</Text>
                <Text style={styles.metalNote}>{m.note}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Category sections */}
        {CATEGORIES.map((cat, ci) => (
          <View key={cat.id} style={styles.catSection}>
            <View style={styles.catHeader}>
              <cat.Icon color={C.gold} size={32} />
              <Lbl style={{ marginLeft: 8 }}>{cat.label}</Lbl>
              {ci === 0 && <Tag style={styles.topTag}>Top Priority</Tag>}
            </View>
            {cat.recs.map((rec, i) => (
              <View key={rec.title} style={styles.recCard}>
                <View style={styles.recLeft}>
                  <View style={[styles.recIndex, i === 0 && styles.recIndexBest]}>
                    <Text style={[styles.recIndexText, i === 0 && styles.recIndexTextBest]}>{i + 1}</Text>
                  </View>
                </View>
                <View style={styles.recContent}>
                  <Text style={styles.recTitle}>{rec.title}</Text>
                  <Text style={styles.recDesc}>{rec.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Tips */}
        <View style={styles.card}>
          <Lbl style={{ marginBottom: 10 }}>Accessory Rules</Lbl>
          {[
            'Match metal tone to your undertone for a cohesive look.',
            'Balance bold accessories with minimal clothing — or vice versa.',
            'One statement piece per outfit; keep the rest subtle.',
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
  metalRow: { gap: 14 },
  metalItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metalCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 0.5, borderColor: C.white06, flexShrink: 0 },
  metalLabel: { fontFamily: FONTS.sansMedium, fontSize: 13, color: C.text, width: 90 },
  metalNote: { fontFamily: FONTS.sans, fontSize: 12, color: C.textMuted, flex: 1 },
  catSection: { marginHorizontal: 20, marginBottom: 20 },
  catHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 4 },
  topTag: { marginLeft: 8 },
  recCard: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 0.5, borderColor: C.white06, padding: 14, marginBottom: 8, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  recLeft: { alignItems: 'center', paddingTop: 1 },
  recIndex: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.surface3, alignItems: 'center', justifyContent: 'center' },
  recIndexBest: { backgroundColor: C.gold },
  recIndexText: { fontFamily: FONTS.sansBold, fontSize: 11, color: C.textMuted },
  recIndexTextBest: { color: '#0c0a07' },
  recContent: { flex: 1, gap: 3 },
  recTitle: { fontFamily: FONTS.sansMedium, fontSize: 14, color: C.text },
  recDesc: { fontFamily: FONTS.sans, fontSize: 12, color: C.textMuted, lineHeight: 18 },
  tipRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 },
  tipDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.goldBorder, marginTop: 7, flexShrink: 0 },
  tipText: { fontFamily: FONTS.sans, fontSize: 13, color: C.textMuted, lineHeight: 20, flex: 1 },
});
