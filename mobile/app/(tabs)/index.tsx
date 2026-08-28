import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { useAnalysisStore } from '../../store/analysisStore';
import { useAuthStore } from '../../store/authStore';
import { FloatingNav } from '../../components/ui/FloatingNav';
import { Face } from '../../components/illustrations/Face';
import { ColorCircles } from '../../components/ui/ColorCircles';
import { Pill } from '../../components/ui/Pill';
import { Lbl } from '../../components/ui/Lbl';
import { GoldButton } from '../../components/ui/GoldButton';
import { C, GRADIENTS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

function SettingsIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke={C.textMuted} strokeWidth={1.7} />
      <Path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke={C.textMuted} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { currentAnalysis, loadLatest } = useAnalysisStore();

  const floatY = useSharedValue(0);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: floatY.value }] }));

  useEffect(() => {
    loadLatest();
    floatY.value = withRepeat(withTiming(-4, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  if (!currentAnalysis) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Image source={require('../../assets/logo.png')} style={styles.brandLogo} resizeMode="contain" />
          <TouchableOpacity style={styles.planBtn} onPress={() => router.push('/plan')} activeOpacity={0.7}>
            <Text style={styles.planBtnText}>Your Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.7}>
            <SettingsIcon />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyWrap}>
          <Animated.View style={floatStyle}>
            <Face color={C.gold} size={90} />
          </Animated.View>
          <Text style={styles.emptyTitle}>Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</Text>
          <Text style={styles.emptyText}>
            Upload a photo to unlock your personalized style profile, color palette, and recommendations.
          </Text>
          <GoldButton
            label="Start your scan"
            onPress={() => router.push('/(tabs)/scan')}
            style={{ marginTop: 24 }}
          />
        </View>
        <FloatingNav />
      </View>
    );
  }

  const faceShape = currentAnalysis.faceAnalysis?.shape ?? '—';
  const undertone = currentAnalysis.colorAnalysis?.skinUndertone ?? '—';
  const contrastLevel = currentAnalysis.colorAnalysis?.contrastLevel ?? '—';
  const palette = currentAnalysis.colorAnalysis?.palette?.primary ?? [];
  const aesthetics = currentAnalysis.recommendations
    ?.filter((r) => r.category === 'aesthetic')
    .slice(0, 4)
    .map((r) => r.title) ?? [];
  const hairCount = currentAnalysis.hairAnalysis?.recommendedStyles?.length ?? 0;
  const outfitCount = currentAnalysis.recommendations?.filter((r) => r.category === 'outfit').length ?? 0;
  const aestheticCount = currentAnalysis.recommendations?.filter((r) => r.category === 'aesthetic').length ?? 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../../assets/logo.png')} style={styles.brandLogo} resizeMode="contain" />
          <TouchableOpacity style={styles.planBtn} onPress={() => router.push('/plan')} activeOpacity={0.7}>
            <Text style={styles.planBtnText}>Your Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.7}>
            <SettingsIcon />
          </TouchableOpacity>
        </View>

        {/* Hero analysis card */}
        <LinearGradient colors={GRADIENTS.hero} style={styles.heroCard}>
          <Animated.View style={[styles.faceWrapper, floatStyle]}>
            <Face color={C.gold} size={70} />
          </Animated.View>
          <View style={styles.heroContent}>
            <Lbl style={{ marginBottom: 8 }}>Analysis Complete</Lbl>
            <Text style={styles.heroTitle}>
              {String(faceShape).charAt(0).toUpperCase() + String(faceShape).slice(1)}{'\n'}
              <Text style={[styles.heroTitle, { color: C.gold, fontSize: 22 }]}>
                {String(undertone).charAt(0).toUpperCase() + String(undertone).slice(1)} · {String(contrastLevel).charAt(0).toUpperCase() + String(contrastLevel).slice(1)}
              </Text>
            </Text>
            <TouchableOpacity
              style={styles.heroLink}
              onPress={() => router.push('/analysis/hair')}
              activeOpacity={0.7}
            >
              <Text style={styles.heroLinkText}>View full report</Text>
              <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                <Path d="M5 12h14M13 6l6 6-6 6" stroke={C.gold} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Color palette */}
        {palette.length > 0 && (
          <View style={styles.section}>
            <Lbl style={{ marginBottom: 11 }}>Your color palette</Lbl>
            <View style={styles.paletteRow}>
              <ColorCircles colors={palette} size={46} />
              <Text style={styles.paletteCount}>{palette.length} tones</Text>
            </View>
          </View>
        )}

        {/* Aesthetics */}
        {aesthetics.length > 0 && (
          <View style={styles.section}>
            <Lbl style={{ marginBottom: 11 }}>Best aesthetics</Lbl>
            <View style={styles.pillRow}>
              {aesthetics.map((a, i) => (
                <Pill key={a} active={i === 0} gold={i > 0}>{a}</Pill>
              ))}
            </View>
          </View>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { n: String(hairCount), label: 'Hairstyles' },
            { n: String(outfitCount), label: 'Outfit matches' },
            { n: String(aestheticCount), label: 'Aesthetics' },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statNum}>{s.n}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16, gap: 10 },
  planBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9999, backgroundColor: C.goldDim, borderWidth: 0.5, borderColor: C.goldBorder },
  planBtnText: { fontFamily: FONTS.sansSemiBold, fontSize: 12, color: C.gold },
  brand: { fontFamily: FONTS.serif, fontSize: 22, color: C.gold, letterSpacing: 0.5 },
  brandLogo: { width: 110, height: 32 },
  settingsBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surface2, borderWidth: 0.5, borderColor: C.white08, alignItems: 'center', justifyContent: 'center' },
  heroCard: { marginHorizontal: 20, borderRadius: 22, borderWidth: 0.5, borderColor: C.goldBorder, padding: 18, flexDirection: 'row', gap: 16 },
  faceWrapper: { flexShrink: 0, width: 70 },
  heroContent: { flex: 1 },
  heroTitle: { fontFamily: FONTS.serif, fontSize: 30, color: C.text, lineHeight: 34 },
  heroLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  heroLinkText: { fontFamily: FONTS.sansSemiBold, fontSize: 13, color: C.gold },
  section: { paddingHorizontal: 20, paddingTop: 18 },
  paletteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paletteCount: { fontFamily: FONTS.sans, fontSize: 11, color: C.textMuted },
  pillRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 16 },
  statCard: { flex: 1, backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.white06, borderRadius: 14, padding: 14 },
  statNum: { fontFamily: FONTS.serif, fontSize: 28, color: C.gold, lineHeight: 30 },
  statLabel: { fontFamily: FONTS.sansBold, fontSize: 10, color: C.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 80 },
  emptyTitle: { fontFamily: FONTS.serif, fontSize: 26, color: C.text, marginTop: 24 },
  emptyText: { fontFamily: FONTS.sans, fontSize: 14, color: C.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 20 },
});
