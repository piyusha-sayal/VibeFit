import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAnalysisStore } from '../../store/analysisStore';
import { FloatingNav } from '../../components/ui/FloatingNav';
import { Lbl } from '../../components/ui/Lbl';
import { Tag } from '../../components/ui/Tag';
import { HairLob, HairCurtain, HairWaves } from '../../components/illustrations/HairStyles';
import { C } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

const HAIR_DATA = [
  {
    id: 'lob',
    label: 'Long Bob (Lob)',
    desc: 'Frames the jawline beautifully, adds volume at the cheekbones.',
    Illustration: HairLob,
    suitability: 92,
  },
  {
    id: 'curtain',
    label: 'Curtain Bangs',
    desc: 'Softens a strong forehead and draws attention to the eyes.',
    Illustration: HairCurtain,
    suitability: 87,
  },
  {
    id: 'waves',
    label: 'Soft Waves',
    desc: 'Adds width at the temples, ideal for elongated face shapes.',
    Illustration: HairWaves,
    suitability: 79,
  },
];

export default function HairScreen() {
  const router = useRouter();
  const currentAnalysis = useAnalysisStore((s) => s.currentAnalysis);
  const hair = currentAnalysis?.hairAnalysis;

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
            <Text style={styles.title}>Hair Recommendations</Text>
          </View>
        </View>

        {/* Texture overview */}
        <View style={styles.card}>
          <Lbl style={{ marginBottom: 10 }}>Your Hair Profile</Lbl>
          <View style={styles.tagRow}>
            {hair?.texture && <Tag>{String(hair.texture).charAt(0).toUpperCase() + String(hair.texture).slice(1)} Texture</Tag>}
            {hair?.thickness && <Tag>{String(hair.thickness).charAt(0).toUpperCase() + String(hair.thickness).slice(1)} Thickness</Tag>}
            {hair?.length && <Tag>{String(hair.length).charAt(0).toUpperCase() + String(hair.length).slice(1)}</Tag>}
          </View>
          {(!hair?.texture && !hair?.thickness) && (
            <Text style={styles.hint}>Upload a photo to unlock your hair profile.</Text>
          )}
        </View>

        {/* Style cards */}
        <Lbl style={styles.sectionLabel}>Recommended Styles</Lbl>
        {HAIR_DATA.map((item, i) => (
          <View key={item.id} style={styles.styleCard}>
            <View style={styles.styleIllustration}>
              <item.Illustration color={C.gold} size={90} />
            </View>
            <View style={styles.styleInfo}>
              <View style={styles.styleTop}>
                <Text style={styles.styleLabel}>{item.label}</Text>
                {i === 0 && <Tag>Best Match</Tag>}
              </View>
              <Text style={styles.styleDesc}>{item.desc}</Text>
              <View style={styles.suitRow}>
                <Text style={styles.suitLabel}>Suitability</Text>
                <View style={styles.suitTrack}>
                  <View style={[styles.suitFill, { width: `${item.suitability}%` as `${number}%` }]} />
                </View>
                <Text style={styles.suitValue}>{item.suitability}%</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Avoid section */}
        <View style={styles.avoidCard}>
          <Lbl style={{ marginBottom: 10 }}>Styles to Approach with Care</Lbl>
          <Text style={styles.avoidText}>
            Very blunt cuts and extremely short pixie styles can emphasize face width. Opt for styles with movement and layers instead.
          </Text>
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
  tagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  hint: { fontFamily: FONTS.sans, fontSize: 13, color: C.textSubtle, marginTop: 8 },
  sectionLabel: { marginHorizontal: 20, marginBottom: 12 },
  styleCard: { marginHorizontal: 20, marginBottom: 12, backgroundColor: C.surface, borderRadius: 18, borderWidth: 0.5, borderColor: C.white06, padding: 18, flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  styleIllustration: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4 },
  styleInfo: { flex: 1, gap: 6 },
  styleTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  styleLabel: { fontFamily: FONTS.sansSemiBold, fontSize: 15, color: C.text },
  styleDesc: { fontFamily: FONTS.sans, fontSize: 13, color: C.textMuted, lineHeight: 19 },
  suitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  suitLabel: { fontFamily: FONTS.sans, fontSize: 11, color: C.textSubtle, width: 62 },
  suitTrack: { flex: 1, height: 3, backgroundColor: C.surface3, borderRadius: 2, overflow: 'hidden' },
  suitFill: { height: '100%', backgroundColor: C.gold, borderRadius: 2 },
  suitValue: { fontFamily: FONTS.sansBold, fontSize: 11, color: C.gold, width: 34, textAlign: 'right' },
  avoidCard: { marginHorizontal: 20, marginTop: 4, backgroundColor: C.surface, borderRadius: 18, borderWidth: 0.5, borderColor: C.white06, padding: 18 },
  avoidText: { fontFamily: FONTS.sans, fontSize: 13, color: C.textMuted, lineHeight: 20 },
});
