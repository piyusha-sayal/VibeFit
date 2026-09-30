import React, { useRef } from 'react';
import { Animated, Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { tap } from '../../utils/haptics';

interface PressScaleProps {
  children: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /** Layout for the outer touch target (width, flex, margins). */
  containerStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** How far it shrinks while held. */
  scaleTo?: number;
}

/**
 * A tappable surface that gives a little springy squeeze and a haptic tick.
 * Static styles only: NativeWind drops `style` callbacks on native.
 */
export function PressScale({
  children, onPress, style, containerStyle, accessibilityLabel, accessibilityHint, scaleTo = 0.95,
}: PressScaleProps) {
  const { reducedMotion } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const springTo = (toValue: number) => {
    if (reducedMotion) return;
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPressIn={() => springTo(scaleTo)}
      onPressOut={() => springTo(1)}
      onPress={() => { tap(); onPress(); }}
      style={containerStyle}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
