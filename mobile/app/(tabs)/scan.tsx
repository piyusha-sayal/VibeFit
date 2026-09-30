import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button, Card, Chip, ErrorState, SectionHeader, Txt,
} from '../../components/ds';
import { WakingBanner } from '../../components/ds/WakingBanner';
import { ProcessingStages } from '../../components/analyze/ProcessingStages';
import { PREP_TIPS } from '../../components/analyze/prepTips';
import { SPACE } from '../../constants/theme';
import { useAnalysis } from '../../hooks/useAnalysis';
import { PhotoPermissionError, photoPermissionAlert } from '../../utils/photoPermission';
import { useTheme } from '../../theme/ThemeProvider';

/** Non-judgmental description of the consultation, never a beauty rating. */
const DETECTS = [
  'Colour season', 'Undertone', 'Face shape', 'Eyes', 'Brows', 'Lips', 'Cheeks', 'Hair',
];

function showScanError(err: unknown) {
  if (err instanceof PhotoPermissionError) {
    const { title, message, offerSettings } = photoPermissionAlert(err);
    Alert.alert(title, message, offerSettings
      ? [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => { void Linking.openSettings(); } }]
      : [{ text: 'OK' }]);
    return;
  }
  Alert.alert('Error', err instanceof Error ? err.message : 'Failed to analyze image');
}

export default function ScanScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    pickAndAnalyze, cameraAndAnalyze, isUploading, uploadProgress, isAnalyzing, error, clearError,
  } = useAnalysis();
  const busy = isUploading || isAnalyzing;

  const handlePick = async () => {
    try {
      const result = await pickAndAnalyze();
      if (result) router.push('/(tabs)/results' as never);
    } catch (err) {
      showScanError(err);
    }
  };

  const handleCamera = async () => {
    try {
      const result = await cameraAndAnalyze();
      if (result) router.push('/(tabs)/results' as never);
    } catch (err) {
      showScanError(err);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + SPACE.xl }]}
      showsVerticalScrollIndicator={false}
    >
      <Txt variant="overline" tone="accent" weight="semibold">Guided consultation</Txt>
      <Txt variant="display" serif accessibilityRole="header" style={{ marginTop: SPACE.xs }}>
        See what works for you
      </Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: SPACE.sm }}>
        A short photo consultation reads your colouring and proportions, then builds
        guidance around them. It is never a rating of how you look.
      </Txt>

      <WakingBanner />

      {busy ? (
        <ProcessingStages isUploading={isUploading} uploadProgress={uploadProgress} isAnalyzing={isAnalyzing} />
      ) : (
        <>
          <Card variant="tinted" accent="gold" style={{ marginTop: SPACE.lg }}>
            <Txt variant="heading" serif accessibilityRole="header">What we'll look at</Txt>
            <View style={styles.chipWrap}>
              {DETECTS.map((d) => <Chip key={d} label={d} />)}
            </View>
          </Card>

          <View style={styles.section}>
            <SectionHeader title="Before you start" />
            <Card>
              {PREP_TIPS.map((tip, i) => (
                <View key={tip} style={[styles.tipRow, i === PREP_TIPS.length - 1 && { marginBottom: 0 }]}>
                  <Txt variant="body" tone="accent" weight="bold" style={{ width: 20 }}>✓</Txt>
                  <Txt variant="bodySm" tone="muted" style={{ flex: 1 }}>{tip}</Txt>
                </View>
              ))}
            </Card>
          </View>

          {error ? (
            <View style={{ marginTop: SPACE.xl }}>
              <ErrorState message={error} onRetry={clearError} />
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button label="Take a selfie" onPress={handleCamera} />
            <Button label="Upload a photo" variant="secondary" onPress={handlePick} />
          </View>

          <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xl, textAlign: 'center' }}>
            Your photo is deleted once your analysis finishes, unless you choose to keep it
            in Settings › Privacy.
          </Txt>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SPACE.xl, paddingBottom: SPACE.xxxl },
  section: { marginTop: SPACE.xxl },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.md },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, marginBottom: SPACE.md },
  actions: { marginTop: SPACE.xxl, gap: SPACE.md },
});
