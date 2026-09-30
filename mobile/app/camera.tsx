import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { Button, Txt } from '../components/ds';
import { RADIUS, SPACE } from '../constants/theme';
import { settleCapture, type CapturedPhoto } from '../utils/cameraBridge';
import { success, tap } from '../utils/haptics';

const TIPS = ['Face a window or soft light', 'Hair off your face', 'No glasses, neutral expression'];
const GOLD = '#C9A96E';

/** Full-screen front camera with an oval face guide, a timer, and a review step. */
export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const settled = useRef(false);

  const [ready, setReady] = useState(false);
  const [timer, setTimer] = useState<0 | 3>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [shot, setShot] = useState<CapturedPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [tip, setTip] = useState(0);

  const finish = (photo: CapturedPhoto | null) => {
    if (settled.current) return;
    settled.current = true;
    settleCapture(photo);
    router.back();
  };

  // Leaving by the system back button still tells the caller "no photo".
  useEffect(() => () => {
    if (!settled.current) settleCapture(null);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 2800);
    return () => clearInterval(id);
  }, []);

  const capture = async () => {
    if (!camera.current || busy) return;
    setBusy(true);
    try {
      const picture = await camera.current.takePictureAsync({ quality: 0.92 });
      if (picture?.uri) {
        success();
        setShot({ uri: picture.uri, mimeType: 'image/jpeg' });
      }
    } finally {
      setBusy(false);
    }
  };

  const onShutter = () => {
    tap();
    if (timer === 0) { void capture(); return; }
    let left = timer;
    setCountdown(left);
    const id = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(id);
        setCountdown(null);
        void capture();
      } else {
        tap();
        setCountdown(left);
      }
    }, 1000);
  };

  // ------------------------------------------------------ permission
  if (!permission) return <View style={styles.black} />;
  if (!permission.granted) {
    return (
      <View style={[styles.black, styles.centre, { padding: SPACE.xl }]}>
        <Txt variant="title" serif style={{ color: '#fff', textAlign: 'center' }}>Camera access needed</Txt>
        <Txt variant="bodySm" style={{ color: '#ddd', textAlign: 'center', marginTop: SPACE.sm }}>
          MyLookFit uses the front camera for your selfie. The photo is only used for your analysis.
        </Txt>
        <Button label="Allow camera" onPress={() => { void requestPermission(); }} style={{ marginTop: SPACE.xl, alignSelf: 'stretch' }} />
        <Button label="Not now" variant="ghost" onPress={() => finish(null)} style={{ marginTop: SPACE.sm }} />
      </View>
    );
  }

  // ---------------------------------------------------------- review
  if (shot) {
    return (
      <View style={styles.black}>
        <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[styles.reviewBar, { paddingBottom: insets.bottom + SPACE.lg }]}>
          <Txt variant="body" weight="semibold" style={{ color: '#fff', textAlign: 'center' }}>
            Face clear and evenly lit?
          </Txt>
          <View style={styles.reviewActions}>
            <Button label="Retake" variant="secondary" onPress={() => setShot(null)} style={{ flex: 1 }} />
            <Button label="Use photo" onPress={() => finish(shot)} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------- camera
  const ovalW = width * 0.68;
  const ovalH = ovalW * 1.32;
  const cx = width / 2;
  const cy = height * 0.44;
  const mask = `M0 0 H${width} V${height} H0 Z M${cx - ovalW / 2} ${cy} a${ovalW / 2} ${ovalH / 2} 0 1 0 ${ovalW} 0 a${ovalW / 2} ${ovalH / 2} 0 1 0 ${-ovalW} 0 Z`;

  return (
    <View style={styles.black}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="front" onCameraReady={() => setReady(true)} />

      {/* Dimmed surround with an oval window for the face. */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path d={mask} fill="rgba(0,0,0,0.55)" fillRule="evenodd" />
        <Ellipse cx={cx} cy={cy} rx={ovalW / 2} ry={ovalH / 2} stroke={GOLD} strokeWidth={3}
                 strokeDasharray={ready ? undefined : '10 8'} fill="none" />
      </Svg>

      {/* Top bar. */}
      <View style={[styles.topBar, { paddingTop: insets.top + SPACE.sm }]}>
        <Pressable onPress={() => finish(null)} accessibilityRole="button" accessibilityLabel="Close camera"
                   hitSlop={12} style={styles.roundBtn}>
          <Text style={styles.roundText}>✕</Text>
        </Pressable>
        <Pressable
          onPress={() => { tap(); setTimer(timer === 0 ? 3 : 0); }}
          accessibilityRole="button"
          accessibilityLabel={timer ? 'Timer on, 3 seconds. Turn off' : 'Timer off. Turn on 3 second timer'}
          style={[styles.pill, timer ? { backgroundColor: GOLD } : null]}
        >
          <Text style={[styles.pillText, timer ? { color: '#1E1612' } : null]}>⏱ {timer ? '3s' : 'Off'}</Text>
        </Pressable>
      </View>

      {/* Guidance. */}
      <View style={[styles.tip, { top: cy + ovalH / 2 + SPACE.lg }]} pointerEvents="none">
        <Txt variant="bodySm" weight="semibold" style={{ color: '#fff', textAlign: 'center' }} live="polite">
          Fit your face in the oval · {TIPS[tip]}
        </Txt>
      </View>

      {countdown !== null ? (
        <View style={[StyleSheet.absoluteFill, styles.centre]} pointerEvents="none">
          <Text style={styles.countdown} accessibilityLiveRegion="assertive">{countdown}</Text>
        </View>
      ) : null}

      {/* Shutter. */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACE.xl }]}>
        <Pressable
          onPress={onShutter}
          disabled={!ready || busy || countdown !== null}
          accessibilityRole="button"
          accessibilityLabel="Take selfie"
          style={[styles.shutter, (!ready || busy) && { opacity: 0.5 }]}
        >
          <View style={styles.shutterInner} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  centre: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACE.lg,
  },
  roundBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  roundText: { color: '#fff', fontSize: 18 },
  pill: {
    minHeight: 44, paddingHorizontal: SPACE.lg, borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center',
  },
  pillText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tip: { position: 'absolute', left: SPACE.xl, right: SPACE.xl },
  countdown: { color: '#fff', fontSize: 120, fontWeight: '700' },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  shutter: {
    width: 78, height: 78, borderRadius: 39, borderWidth: 5, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: GOLD },
  reviewBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.lg, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  reviewActions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md },
});
