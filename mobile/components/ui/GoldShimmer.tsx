import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { FONTS } from '../../constants/fonts';
import { useLegacyTheme, type LegacyPalette } from '../../theme/legacy';

interface Props {
  children: string;
  style?: TextStyle;
}

export function GoldShimmer({ children, style }: Props) {
  const { C, reducedMotion } = useLegacyTheme();
  const styles = makeStyles(C);
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) return undefined;
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer, reducedMotion]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <MaskedView
      maskElement={<Text style={[styles.text, style]}>{children}</Text>}
    >
      <Text style={[styles.text, style, { opacity: 0 }]}>{children}</Text>
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          // A sheen across the theme's own gold, not a fixed hex: the highlight
          // is the accent faded toward transparent and back, so it reads
          // correctly against either theme's surface.
          colors={[C.gold, C.goldDim, C.gold, C.goldDim, C.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </MaskedView>
  );
}

const makeStyles = (C: LegacyPalette) => StyleSheet.create({
  text: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    color: C.gold,
  },
});
