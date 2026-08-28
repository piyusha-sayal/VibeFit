import React from 'react';
import Svg, { Path, Line } from 'react-native-svg';
import { View } from 'react-native';

interface Props { color?: string; size?: number }

export function VNeck({ color = '#c9a87c', size = 60 }: Props) {
  return (
    <View style={{ width: size, height: size * 0.8 }}>
      <Svg viewBox="0 0 60 48" fill="none" width="100%" height="100%">
        <Line x1={6} y1={8} x2={54} y2={8} stroke={color} strokeWidth={1.2} strokeOpacity={0.25} />
        <Path d="M8 8 L30 42 L52 8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

export function WrapNeck({ color = '#c9a87c', size = 60 }: Props) {
  return (
    <View style={{ width: size, height: size * 0.8 }}>
      <Svg viewBox="0 0 60 48" fill="none" width="100%" height="100%">
        <Line x1={6} y1={8} x2={54} y2={8} stroke={color} strokeWidth={1.2} strokeOpacity={0.25} />
        <Path d="M8 8 L28 36 Q38 22 52 8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

export function OffShoulder({ color = '#c9a87c', size = 70 }: Props) {
  return (
    <View style={{ width: size, height: size * 0.69 }}>
      <Svg viewBox="0 0 70 48" fill="none" width="100%" height="100%">
        <Path d="M2 22 Q14 8 24 20 Q32 28 35 22 Q38 16 46 20 Q56 8 68 22" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

export function ScoopNeck({ color = '#c9a87c', size = 60 }: Props) {
  return (
    <View style={{ width: size, height: size * 0.8 }}>
      <Svg viewBox="0 0 60 48" fill="none" width="100%" height="100%">
        <Line x1={6} y1={10} x2={54} y2={10} stroke={color} strokeWidth={1.2} strokeOpacity={0.25} />
        <Path d="M8 10 Q30 40 52 10" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

export function SquareNeck({ color = '#c9a87c', size = 60 }: Props) {
  return (
    <View style={{ width: size, height: size * 0.8 }}>
      <Svg viewBox="0 0 60 48" fill="none" width="100%" height="100%">
        <Line x1={6} y1={10} x2={54} y2={10} stroke={color} strokeWidth={1.2} strokeOpacity={0.25} />
        <Path d="M8 10 L8 32 L52 32 L52 10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

export function CowlNeck({ color = '#c9a87c', size = 60 }: Props) {
  return (
    <View style={{ width: size, height: size * 0.8 }}>
      <Svg viewBox="0 0 60 48" fill="none" width="100%" height="100%">
        <Line x1={6} y1={10} x2={54} y2={10} stroke={color} strokeWidth={1.2} strokeOpacity={0.25} />
        <Path d="M8 10 Q18 22 30 28 Q42 22 52 10" stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Path d="M16 18 Q24 30 30 32 Q36 30 44 18" stroke={color} strokeWidth={1} strokeLinecap="round" strokeOpacity={0.35} />
      </Svg>
    </View>
  );
}
