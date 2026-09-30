import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldButton } from '../../components/ui/GoldButton';
import { Logo } from '../../components/ds/Logo';
import { FONTS } from '../../constants/fonts';
import { useLegacyTheme, type LegacyPalette } from '../../theme/legacy';
import { useTheme } from '../../theme/ThemeProvider';

const LOGO_IN_MS = 800;
const ACTIONS_IN_MS = 500;
const ACTIONS_DELAY_MS = 200;

/** First screen of a signed-out launch: the mark animates in, then the choice to sign in or sign up. */
export default function WelcomeScreen() {
  const { C, GRADIENTS } = useLegacyTheme();
  const { reducedMotion } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const logo = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const actions = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) return undefined;
    const intro = Animated.sequence([
      Animated.timing(logo, {
        toValue: 1, duration: LOGO_IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.delay(ACTIONS_DELAY_MS),
      Animated.timing(actions, {
        toValue: 1, duration: ACTIONS_IN_MS, easing: Easing.out(Easing.ease), useNativeDriver: true,
      }),
    ]);
    intro.start();
    return () => intro.stop();
  }, [reducedMotion, logo, actions]);

  const logoStyle = {
    opacity: logo,
    transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
  };
  const actionsStyle = {
    opacity: actions,
    transform: [{ translateY: actions.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  };

  return (
    <LinearGradient
      colors={GRADIENTS.heroAlt}
      style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
    >
      <Animated.View style={[styles.hero, logoStyle]}>
        <Logo variant="horizontal" width={240} showTagline />
      </Animated.View>

      <Animated.View style={[styles.actions, actionsStyle]}>
        <Text style={styles.headline} accessibilityRole="header">Find what fits you.</Text>
        <Text style={styles.sub}>Your colours, face shape and style, in one passport.</Text>
        <GoldButton label="Create account" onPress={() => router.push('/(auth)/register')} />
        <GoldButton
          label="I already have an account"
          variant="outline"
          onPress={() => router.push('/(auth)/login')}
        />
      </Animated.View>
    </LinearGradient>
  );
}

const makeStyles = (C: LegacyPalette) => StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: 12 },
  headline: { fontFamily: FONTS.serif, fontSize: 30, color: C.text, textAlign: 'center' },
  sub: {
    fontFamily: FONTS.sans, fontSize: 15, color: C.textMuted, textAlign: 'center',
    lineHeight: 22, marginBottom: 12,
  },
});
