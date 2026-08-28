import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAnalysisStore } from '../../store/analysisStore';
import { FloatingNav } from '../../components/ui/FloatingNav';
import { Face } from '../../components/illustrations/Face';
import { ColorCircles } from '../../components/ui/ColorCircles';
import { Pill } from '../../components/ui/Pill';
import { Tag } from '../../components/ui/Tag';
import { Lbl } from '../../components/ui/Lbl';
import { GoldButton } from '../../components/ui/GoldButton';
import { downloadAndShareReport, downloadAndShareCard, downloadAndShareOverlay } from '../../services/reportService';
import { C, GRADIENTS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <View style={styles.scoreTrack}>
        <View style={[styles.scoreFill, { width: `${value}%` as `${number}%` }]} />
      </View>
      <Text style={styles.scoreValue}>{value}</Text>
    </View>
  );
}

function SkinStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.skinStat}>
      <Text style={styles.skinStatLabel}>{label}</Text>
      <Text style={styles.skinStatValue}>{value}</Text>
    </View>
  );
}

export default function ResultsScreen() {
  const router = useRouter();
  const currentAnalysis = useAnalysisStore((s) => s.currentAnalysis);
  const [busy, setBusy] = useState<null | 'report' | 'card' | 'overlay'>(null);

  const runShare = async (
    kind: 'report' | 'card' | 'overlay',
    fn: () => Promise<{ success: boolean; error?: string }>,
    failTitle: string,
  ) => {
    if (!currentAnalysis || busy) return;
    setBusy(kind);
    const res = await fn();
    setBusy(null);
    if (!res.success) Alert.alert(failTitle, res.error ?? 'Something went wrong.');
  };

  const handleDownloadReport = () =>
    runShare('report', () => downloadAndShareReport(currentAnalysis!.id), 'Report');
  const handleDownloadCard = () =>
    runShare('card', () => downloadAndShareCard(currentAnalysis!.id), 'Summary Card');
  const handleOverlay = () =>
    runShare('overlay', () => downloadAndShareOverlay(currentAnalysis!.imageUrl), 'Overlay');

  const canOverlay = !!currentAnalysis?.imageUrl && /^https?:\/\//.test(currentAnalysis.imageUrl);

  if (!currentAnalysis) {
    return (
      <View style={styles.empty}>
        <Face color={C.textSubtle} size={60} />
        <Text style={styles.emptyTitle}>No analysis yet</Text>
        <Text style={styles.emptyText}>Upload a photo to get your personalized style profile.</Text>
        <GoldButton label="Scan Now" onPress={() => router.push('/(tabs)/scan')} style={{ marginTop: 24 }} />
        <FloatingNav />
      </View>
    );
  }

  const { faceAnalysis, colorAnalysis, hairAnalysis, recommendations, skinAnalysis, quality } = currentAnalysis;
  const featureScores = faceAnalysis?.featureScores;
  const palette = colorAnalysis?.palette?.primary ?? [];
  const aesthetics = recommendations?.filter((r) => r.category === 'aesthetic').slice(0, 4).map((r) => r.title) ?? [];
  const seasonal = colorAnalysis?.seasonal;
  const overallScore = faceAnalysis?.overallScore ?? (faceAnalysis?.harmony ? Math.round(faceAnalysis.harmony * 100) / 10 : null);
  const bestColors = colorAnalysis?.bestColors ?? [];
  const avoidColors = colorAnalysis?.avoidColors ?? [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={GRADIENTS.hero} style={styles.heroCard}>
          <View style={styles.heroInner}>
            <View>
              <Lbl>Your Profile</Lbl>
              <Text style={styles.heroTitle}>
                {faceAnalysis?.shape ? String(faceAnalysis.shape).charAt(0).toUpperCase() + String(faceAnalysis.shape).slice(1) : 'Oval'}{'\n'}
                <Text style={{ color: C.gold, fontSize: 22 }}>
                  {colorAnalysis?.skinUndertone
                    ? String(colorAnalysis.skinUndertone).charAt(0).toUpperCase() + String(colorAnalysis.skinUndertone).slice(1)
                    : 'Warm'}
                  {' '}·{' '}
                  {colorAnalysis?.contrastLevel
                    ? String(colorAnalysis.contrastLevel).charAt(0).toUpperCase() + String(colorAnalysis.contrastLevel).slice(1)
                    : 'Medium'}
                </Text>
              </Text>
              <View style={styles.tagRow}>
                {seasonal ? <Tag>{seasonal.label}</Tag> : <Tag>Perfect Harmony</Tag>}
              </View>
            </View>
            <View style={styles.heroRight}>
              {overallScore !== null && (
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreBadgeNum}>{overallScore.toFixed(1)}</Text>
                  <Text style={styles.scoreBadgeOut}>/10</Text>
                </View>
              )}
              <Face color={C.gold} size={56} />
            </View>
          </View>
        </LinearGradient>

        {/* Quality retake banner */}
        {quality && (quality.overall !== 'good' || quality.flags.length > 0) && (
          <View style={styles.qualityBanner}>
            <Text style={styles.qualityTitle}>
              Photo quality: {quality.overall}
            </Text>
            {quality.flags.length > 0 && (
              <Text style={styles.qualityText}>
                For better results, retake — {quality.flags.join(', ')}.
              </Text>
            )}
          </View>
        )}

        {/* Face harmony */}
        <View style={styles.card}>
          <Lbl style={{ marginBottom: 14 }}>Facial Harmony</Lbl>
          {featureScores ? (
            <>
              {typeof featureScores.symmetry === 'number' && <ScoreBar label="Symmetry" value={featureScores.symmetry} />}
              {typeof featureScores.eyes === 'number' && <ScoreBar label="Eyes" value={featureScores.eyes} />}
              {typeof featureScores.eyebrows === 'number' && <ScoreBar label="Eyebrows" value={featureScores.eyebrows} />}
              {typeof featureScores.nose === 'number' && <ScoreBar label="Nose" value={featureScores.nose} />}
              {typeof featureScores.lips === 'number' && <ScoreBar label="Lips" value={featureScores.lips} />}
              {typeof featureScores.jawline === 'number' && <ScoreBar label="Jawline" value={featureScores.jawline} />}
            </>
          ) : (
            <ScoreBar label="Symmetry" value={faceAnalysis?.harmony ? Math.round(faceAnalysis.harmony * 100) : 82} />
          )}
        </View>

        {/* Skin analysis */}
        {skinAnalysis && skinAnalysis.quality?.faceFound && (
          <View style={styles.card}>
            <Lbl style={{ marginBottom: 14 }}>Skin Analysis</Lbl>
            <ScoreBar label="Evenness" value={skinAnalysis.evenness} />
            <View style={styles.skinRow}>
              <SkinStat label="Texture" value={skinAnalysis.texture} />
              <SkinStat label="Redness" value={skinAnalysis.redness} />
            </View>
            <View style={styles.skinRow}>
              <SkinStat label="Under-eye" value={skinAnalysis.underEye} />
              <SkinStat label="Oiliness" value={skinAnalysis.oiliness} />
            </View>
            {skinAnalysis.concerns.length > 0 && (
              <View style={styles.pillWrap}>
                {skinAnalysis.concerns.map((c) => <Pill key={c} gold>{c}</Pill>)}
              </View>
            )}
          </View>
        )}

        {/* Color palette */}
        {palette.length > 0 && (
          <View style={styles.card}>
            <Lbl style={{ marginBottom: 14 }}>Color Palette</Lbl>
            <ColorCircles colors={palette} size={46} />
            <Text style={[styles.hint, { marginTop: 12 }]}>
              {colorAnalysis?.skinUndertone === 'warm'
                ? 'Earth tones, warm neutrals, and golden accents complement your undertone.'
                : colorAnalysis?.skinUndertone === 'cool'
                ? 'Jewel tones, cool grays, and navy complement your undertone.'
                : 'Balanced palette — both warm and cool tones suit you well.'}
            </Text>
          </View>
        )}

        {/* Best / avoid swatches */}
        {(bestColors.length > 0 || avoidColors.length > 0) && (
          <View style={styles.card}>
            {bestColors.length > 0 && (
              <>
                <Lbl style={{ marginBottom: 10 }}>Best Colors</Lbl>
                <ColorCircles colors={bestColors.map((c) => c.hex)} size={38} />
              </>
            )}
            {avoidColors.length > 0 && (
              <>
                <Lbl style={{ marginTop: 16, marginBottom: 10 }}>Avoid</Lbl>
                <ColorCircles colors={avoidColors.map((c) => c.hex)} size={38} />
              </>
            )}
          </View>
        )}

        {/* Aesthetics */}
        {aesthetics.length > 0 && (
          <View style={styles.card}>
            <Lbl style={{ marginBottom: 12 }}>Matched Aesthetics</Lbl>
            <View style={styles.pillWrap}>
              {aesthetics.map((a, i) => <Pill key={a} active={i === 0} gold={i > 0}>{a}</Pill>)}
            </View>
          </View>
        )}

        {/* Deep dives */}
        <View style={styles.deepDives}>
          <Lbl style={{ marginBottom: 12 }}>Explore Deeper</Lbl>
          {[
            { label: 'Facial Canon', route: '/analysis/facial-canon' as const },
            { label: 'Makeup Guide', route: '/analysis/makeup' as const },
            { label: 'Hair Recommendations', route: '/analysis/hair' as const },
            { label: 'Outfit Styling', route: '/analysis/wardrobe' as const },
            { label: 'Accessories', route: '/analysis/accessories' as const },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.deepCard}
              onPress={() => router.push(item.route)}
              activeOpacity={0.75}
            >
              <Text style={styles.deepLabel}>{item.label}</Text>
              <Text style={styles.deepArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Share / export */}
        <View style={styles.reportSection}>
          <GoldButton
            label="Download Face Report (PDF)"
            onPress={handleDownloadReport}
            loading={busy === 'report'}
            disabled={!!busy && busy !== 'report'}
          />
          <GoldButton
            label="Share Summary Card"
            onPress={handleDownloadCard}
            variant="outline"
            loading={busy === 'card'}
            disabled={!!busy && busy !== 'card'}
          />
          {canOverlay && (
            <GoldButton
              label="Facial Overlay Image"
              onPress={handleOverlay}
              variant="outline"
              loading={busy === 'overlay'}
              disabled={!!busy && busy !== 'overlay'}
            />
          )}
          <Text style={styles.reportHint}>
            Export a shareable PDF, social card, or annotated facial-proportion image.
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
  empty: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontFamily: FONTS.serif, fontSize: 26, color: C.text, marginTop: 20 },
  emptyText: { fontFamily: FONTS.sans, fontSize: 14, color: C.textMuted, textAlign: 'center', marginTop: 8 },
  scroll: { paddingTop: 62 },
  heroCard: { marginHorizontal: 20, borderRadius: 22, borderWidth: 0.5, borderColor: C.goldBorder, padding: 20, marginBottom: 16 },
  heroInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroRight: { alignItems: 'flex-end', gap: 10 },
  scoreBadge: { flexDirection: 'row', alignItems: 'baseline', gap: 2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: C.surface2, borderWidth: 0.5, borderColor: C.goldBorder },
  scoreBadgeNum: { fontFamily: FONTS.serif, fontSize: 22, color: C.gold, lineHeight: 24 },
  scoreBadgeOut: { fontFamily: FONTS.sans, fontSize: 10, color: C.textMuted },
  heroTitle: { fontFamily: FONTS.serif, fontSize: 30, color: C.text, lineHeight: 34, marginTop: 8, marginBottom: 12 },
  tagRow: { flexDirection: 'row', gap: 6 },
  card: { marginHorizontal: 20, marginBottom: 12, backgroundColor: C.surface, borderRadius: 18, borderWidth: 0.5, borderColor: C.white06, padding: 18 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  scoreLabel: { fontFamily: FONTS.sansMedium, fontSize: 12, color: C.textMuted, width: 110 },
  scoreTrack: { flex: 1, height: 4, backgroundColor: C.surface3, borderRadius: 2, overflow: 'hidden' },
  scoreFill: { height: '100%', backgroundColor: C.gold, borderRadius: 2 },
  scoreValue: { fontFamily: FONTS.sansBold, fontSize: 12, color: C.gold, width: 28, textAlign: 'right' },
  hint: { fontFamily: FONTS.sans, fontSize: 12, color: C.textMuted, lineHeight: 18 },
  pillWrap: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  deepDives: { marginHorizontal: 20, marginTop: 4 },
  deepCard: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 0.5, borderColor: C.white06, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deepLabel: { fontFamily: FONTS.sansMedium, fontSize: 14, color: C.text },
  deepArrow: { fontFamily: FONTS.sans, fontSize: 18, color: C.gold },
  reportSection: { marginHorizontal: 20, marginTop: 20, gap: 8 },
  reportHint: { fontFamily: FONTS.sans, fontSize: 12, color: C.textSubtle, textAlign: 'center' },
  qualityBanner: { marginHorizontal: 20, marginBottom: 12, backgroundColor: C.surface2, borderRadius: 14, borderWidth: 0.5, borderColor: C.goldBorder, padding: 14 },
  qualityTitle: { fontFamily: FONTS.sansBold, fontSize: 13, color: C.gold, textTransform: 'capitalize' },
  qualityText: { fontFamily: FONTS.sans, fontSize: 12, color: C.textMuted, marginTop: 4, lineHeight: 17 },
  skinRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  skinStat: { flex: 1, backgroundColor: C.surface2, borderRadius: 12, padding: 12 },
  skinStatLabel: { fontFamily: FONTS.sansMedium, fontSize: 11, color: C.textMuted },
  skinStatValue: { fontFamily: FONTS.sansBold, fontSize: 15, color: C.text, marginTop: 3, textTransform: 'capitalize' },
});
