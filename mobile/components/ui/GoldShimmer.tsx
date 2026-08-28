import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { FONTS } from '../../constants/fonts';

interface Props {
  children: string;
  style?: TextStyle;
}

export function GoldShimmer({ children, style }: Props) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: false,
      })
    ).start();
  }, [shimmer]);

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
          colors={['#c9a87c', '#f0dcb0', '#c9a87c', '#a87d4c', '#c9a87c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    color: '#c9a87c',
  },
});
