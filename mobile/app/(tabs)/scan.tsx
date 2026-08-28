import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withDelay, Easing, interpolate,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { useAnalysis } from '../../hooks/useAnalysis';
import { FloatingNav } from '../../components/ui/FloatingNav';
import { GoldButton } from '../../components/ui/GoldButton';
import { Face } from '../../components/illustrations/Face';
import { C } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

function Ring({ delay, size }: { delay: number; size: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    scale.value = withDelay(delay, withRepeat(withTiming(1.55, { duration: 2400, easing: Easing.out(Easing.ease) }), -1));
    opacity.value = withDelay(delay, withRepeat(withTiming(0, { duration: 2400, easing: Easing.out(Easing.ease) }), -1));
  }, [delay]);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1,
    borderColor: C.gold,
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={style} />;
}

function ScanLine() {
  const ty = useSharedValue(-80);

  useEffect(() => {
    ty.value = withRepeat(
      withTiming(80, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: C.gold,
    opacity: interpolate(Math.abs(ty.value), [0, 80], [0.8, 0.3]),
    transform: [{ translateY: ty.value }],
  }));

  return <Animated.View style={style} />;
}

export default function ScanScreen() {
  const router = useRouter();
  const { pickAndAnalyze, cameraAndAnalyze, isUploading, uploadProgress, isAnalyzing, error } = useAnalysis();

  const handlePick = async () => {
    try {
      const result = await pickAndAnalyze();
      if (result) router.push('/(tabs)/results');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to analyze image');
    }
  };

  const handleCamera = async () => {
    try {
      const result = await cameraAndAnalyze();
      if (result) router.push('/(tabs)/results');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to analyze image');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Scan</Text>
        <Text style={styles.subtitle}>Upload a clear front-facing photo</Text>
      </View>

      {/* Scan zone */}
      <View style={styles.scanZone}>
        <Ring delay={0} size={200} />
        <Ring delay={800} size={200} />
        <Ring delay={1600} size={200} />
        <View style={styles.scanFrame}>
          {(isUploading || isAnalyzing) ? null : <ScanLine />}
          <Face color={C.gold} size={80} />
        </View>
        {(isUploading || isAnalyzing) && (
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {isAnalyzing ? 'Analyzing…' : `Uploading ${uploadProgress}%`}
            </Text>
          </View>
        )}
      </View>

      {/* Tips */}
      <View style={styles.tips}>
        {['Face forward, good lighting', 'No sunglasses or hat', 'Hair away from face'].map((t) => (
          <View key={t} style={styles.tip}>
            <View style={styles.tipDot} />
            <Text style={styles.tipText}>{t}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <GoldButton
          label="Upload Photo"
          onPress={handlePick}
          loading={isUploading || isAnalyzing}
          style={styles.actionBtn}
        />
        <GoldButton
          label="Take Photo"
          onPress={handleCamera}
          variant="outline"
          disabled={isUploading || isAnalyzing}
          style={styles.actionBtn}
        />
      </View>

      <FloatingNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingTop: 70, paddingHorizontal: 24, marginBottom: 32 },
  title: { fontFamily: FONTS.serif, fontSize: 34, color: C.text, marginBottom: 6 },
  subtitle: { fontFamily: FONTS.sans, fontSize: 14, color: C.textMuted },
  scanZone: { alignItems: 'center', justifyContent: 'center', height: 240, marginBottom: 32 },
  scanFrame: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.goldBorder,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  progressRow: { marginTop: 16 },
  progressText: { fontFamily: FONTS.sansMedium, fontSize: 13, color: C.gold },
  tips: { paddingHorizontal: 28, gap: 10, marginBottom: 32 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.goldBorder },
  tipText: { fontFamily: FONTS.sans, fontSize: 13, color: C.textMuted },
  actions: { paddingHorizontal: 24, gap: 12 },
  actionBtn: { width: '100%' },
});
