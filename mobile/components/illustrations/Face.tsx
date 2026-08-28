import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface Props {
  color?: string;
  size?: number;
}

export function Face({ color = '#c9a87c', size = 70 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 70 70" fill="none">
      <Circle cx={35} cy={35} r={32} stroke={color} strokeWidth={1} strokeOpacity={0.25} />
      <Path
        d="M35 17 C42 17 47 23 47 31 C47 37 43 42 38 43 L38 47 C46 48 53 53 55 60"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M32 43 L32 47 C24 48 17 53 15 60"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M23 31 C23 23 28 17 35 17"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
