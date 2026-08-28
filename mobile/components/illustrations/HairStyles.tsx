import React from 'react';
import Svg, { Path, Ellipse } from 'react-native-svg';
import { View } from 'react-native';

interface Props {
  color?: string;
  size?: number;
}

const BG = '#0c0a07';

export function HairLob({ color = '#c9a87c', size = 80 }: Props) {
  return (
    <View style={{ width: size, height: size * 1.2 }}>
      <Svg viewBox="0 0 80 96" fill="none" width="100%" height="100%">
        <Path d="M13 38 Q13 14 40 10 Q67 14 67 38 L65 68 Q55 82 40 82 Q25 82 15 68 Z" fill={color} fillOpacity={0.07} stroke={color} strokeWidth={1.2} strokeOpacity={0.35} />
        <Ellipse cx={40} cy={52} rx={19} ry={24} fill={BG} stroke={color} strokeWidth={1.2} />
        <Ellipse cx={32} cy={46} rx={2.2} ry={2.6} fill={color} fillOpacity={0.55} />
        <Ellipse cx={48} cy={46} rx={2.2} ry={2.6} fill={color} fillOpacity={0.55} />
        <Path d="M34 63 Q40 67 46 63" stroke={color} strokeWidth={1.3} strokeLinecap="round" fill="none" strokeOpacity={0.7} />
      </Svg>
    </View>
  );
}

export function HairCurtain({ color = '#c9a87c', size = 80 }: Props) {
  return (
    <View style={{ width: size, height: size * 1.2 }}>
      <Svg viewBox="0 0 80 96" fill="none" width="100%" height="100%">
        <Path d="M13 36 Q13 14 40 10 Q67 14 67 36 L69 58 Q61 74 40 76 Q19 74 11 58 Z" fill={color} fillOpacity={0.07} stroke={color} strokeWidth={1.2} strokeOpacity={0.35} />
        <Path d="M20 38 Q27 24 33 36" stroke={color} strokeWidth={1.8} fill="none" strokeOpacity={0.6} strokeLinecap="round" />
        <Path d="M60 38 Q53 24 47 36" stroke={color} strokeWidth={1.8} fill="none" strokeOpacity={0.6} strokeLinecap="round" />
        <Ellipse cx={40} cy={52} rx={19} ry={24} fill={BG} stroke={color} strokeWidth={1.2} />
        <Ellipse cx={32} cy={46} rx={2.2} ry={2.6} fill={color} fillOpacity={0.55} />
        <Ellipse cx={48} cy={46} rx={2.2} ry={2.6} fill={color} fillOpacity={0.55} />
        <Path d="M34 63 Q40 67 46 63" stroke={color} strokeWidth={1.3} strokeLinecap="round" fill="none" strokeOpacity={0.7} />
      </Svg>
    </View>
  );
}

export function HairWaves({ color = '#c9a87c', size = 80 }: Props) {
  return (
    <View style={{ width: size, height: size * 1.2 }}>
      <Svg viewBox="0 0 80 96" fill="none" width="100%" height="100%">
        <Path d="M12 36 Q12 12 40 8 Q68 12 68 36 L70 64 Q60 82 40 84 Q20 82 10 64 Z" fill={color} fillOpacity={0.07} stroke={color} strokeWidth={1.2} strokeOpacity={0.35} />
        <Path d="M14 52 Q10 62 14 70" stroke={color} strokeWidth={1.4} fill="none" strokeOpacity={0.4} />
        <Path d="M66 52 Q70 62 66 70" stroke={color} strokeWidth={1.4} fill="none" strokeOpacity={0.4} />
        <Path d="M12 60 Q16 56 20 60 Q24 64 28 60" stroke={color} strokeWidth={1.2} fill="none" strokeOpacity={0.4} />
        <Path d="M68 60 Q64 56 60 60 Q56 64 52 60" stroke={color} strokeWidth={1.2} fill="none" strokeOpacity={0.4} />
        <Ellipse cx={40} cy={50} rx={19} ry={24} fill={BG} stroke={color} strokeWidth={1.2} />
        <Ellipse cx={32} cy={44} rx={2.2} ry={2.6} fill={color} fillOpacity={0.55} />
        <Ellipse cx={48} cy={44} rx={2.2} ry={2.6} fill={color} fillOpacity={0.55} />
        <Path d="M34 61 Q40 65 46 61" stroke={color} strokeWidth={1.3} strokeLinecap="round" fill="none" strokeOpacity={0.7} />
      </Svg>
    </View>
  );
}
