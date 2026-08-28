import React from 'react';
import Svg, { Circle, Line, Ellipse, Path } from 'react-native-svg';

interface Props { color?: string; size?: number }

export function EarringIcon({ color = '#c9a87c', size = 52 }: Props) {
  return (
    <Svg viewBox="0 0 28 52" fill="none" width={size * (28 / 52)} height={size}>
      <Circle cx={14} cy={8} r={6} stroke={color} strokeWidth={1.6} />
      <Line x1={14} y1={14} x2={14} y2={26} stroke={color} strokeWidth={1.6} />
      <Ellipse cx={14} cy={38} rx={7} ry={10} stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

export function NecklaceIcon({ color = '#c9a87c', size = 44 }: Props) {
  return (
    <Svg viewBox="0 0 50 44" fill="none" width={size * (50 / 44)} height={size}>
      <Path d="M6 8 Q25 36 44 8" stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Circle cx={25} cy={38} r={5} stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

export function RingIcon({ color = '#c9a87c', size = 40 }: Props) {
  return (
    <Svg viewBox="0 0 36 40" fill="none" width={size * (36 / 40)} height={size}>
      <Circle cx={18} cy={28} r={10} stroke={color} strokeWidth={1.6} />
      <Circle cx={18} cy={13} r={9} stroke={color} strokeWidth={1.6} />
      <Circle cx={18} cy={11} r={4} fill={color} fillOpacity={0.3} />
    </Svg>
  );
}

export function BraceletIcon({ color = '#c9a87c', size = 34 }: Props) {
  return (
    <Svg viewBox="0 0 44 34" fill="none" width={size * (44 / 34)} height={size}>
      <Path d="M8 28 Q8 6 22 5 Q36 6 36 28" stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Line x1={8} y1={28} x2={36} y2={28} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={15} cy={20} r={2.5} fill={color} fillOpacity={0.5} />
      <Circle cx={22} cy={17} r={2.5} fill={color} fillOpacity={0.5} />
      <Circle cx={29} cy={20} r={2.5} fill={color} fillOpacity={0.5} />
    </Svg>
  );
}
