import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Card, PageHeader, Screen, Txt } from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { useAnalysisStore } from '../../store/analysisStore';
import { useTheme } from '../../theme/ThemeProvider';

function FaceOutline() {
  const { colors } = useTheme();
  return (
    <Svg width={120} height={146} viewBox="0 0 140 170" fill="none">
      <Path
        d="M70 10 C95 10 115 32 115 65 C115 95 105 130 70 158 C35 130 25 95 25 65 C25 32 45 10 70 10 Z"
        stroke={colors.gold}
        strokeWidth={1.2}
        strokeOpacity={0.55}
        fill="none"
      />
      <Line x1={25} y1={55} x2={115} y2={55} stroke={colors.gold} strokeWidth={0.5} strokeOpacity={0.35} strokeDasharray="3 3" />
      <Line x1={25} y1={95} x2={115} y2={95} stroke={colors.gold} strokeWidth={0.5} strokeOpacity={0.35} strokeDasharray="3 3" />
      <Line x1={70} y1={10} x2={70} y2={158} stroke={colors.gold} strokeWidth={0.5} strokeOpacity={0.35} strokeDasharray="3 3" />
      <Circle cx={52} cy={70} r={2.5} fill={colors.gold} />
      <Circle cx={88} cy={70} r={2.5} fill={colors.gold} />
      <Circle cx={70} cy={92} r={1.8} fill={colors.gold} />
      <Path d="M58 118 Q70 124 82 118" stroke={colors.gold} strokeWidth={1} fill="none" />
    </Svg>
  );
}

const CANON_LABELS: Array<{ key: 'facialThirds' | 'goldenRatio' | 'eyeSpacing' | 'lipRatio' | 'jawAngle'; label: string }> = [
  { key: 'facialThirds', label: 'Facial thirds' },
  { key: 'goldenRatio', label: 'Proportion balance' },
  { key: 'eyeSpacing', label: 'Eye spacing' },
  { key: 'lipRatio', label: 'Lip proportion' },
  { key: 'jawAngle', label: 'Jaw angle' },
];

function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function FacialCanonScreen() {
  const { colors } = useTheme();
  const face = useAnalysisStore((s) => s.currentAnalysis?.faceAnalysis);
  const canonEntries = CANON_LABELS.filter((c) => face?.canon?.[c.key] !== undefined);

  return (
    <Screen>
      <PageHeader eyebrow="Analysis" title="Your proportions" subtitle="Used to personalise styling — never a rating." />

      <Card variant="tinted" accent="gold" style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.lg }}>
        <View style={{ flex: 1 }}>
          <Txt variant="overline" tone="muted">Face shape</Txt>
          <Txt variant="h1" serif accessibilityRole="header" style={{ marginTop: SPACE.xs }}>
            {face?.shape ? cap(String(face.shape)) : '—'}
          </Txt>
          <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.sm }}>
            Guides hair, makeup, glasses and neckline suggestions.
          </Txt>
        </View>
        <FaceOutline />
      </Card>

      {canonEntries.length > 0 ? (
        <View style={{ marginTop: SPACE.xxl }}>
          <Txt variant="h3" serif accessibilityRole="header" style={{ marginBottom: SPACE.md }}>Proportion notes</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
            {canonEntries.map((c) => (
              <View
                key={c.key}
                style={{
                  flexBasis: '31%', backgroundColor: colors.surface, borderColor: colors.border,
                  borderWidth: 1, borderRadius: 14, padding: SPACE.md, alignItems: 'center',
                }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold, marginBottom: SPACE.sm }} />
                <Txt variant="caption" tone="muted" weight="semibold" style={{ textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {c.label}
                </Txt>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Card style={{ marginTop: SPACE.xl }}>
          <Txt variant="bodySm" tone="muted" style={{ textAlign: 'center' }}>
            Detailed facial proportions will appear here after a full analysis.
          </Txt>
        </Card>
      )}
    </Screen>
  );
}
