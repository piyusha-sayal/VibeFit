import React from 'react';
import { View } from 'react-native';

import { Card, Chip, PageHeader, Screen, Txt } from '../../components/ds';
import { HairLob, HairCurtain, HairWaves } from '../../components/illustrations/HairStyles';
import { SPACE } from '../../constants/theme';
import { useAnalysisStore } from '../../store/analysisStore';
import { useTheme } from '../../theme/ThemeProvider';

const HAIR_DATA = [
  {
    id: 'lob',
    label: 'Long bob (lob)',
    desc: 'Frames the jawline beautifully, adds volume at the cheekbones.',
    Illustration: HairLob,
  },
  {
    id: 'curtain',
    label: 'Curtain bangs',
    desc: 'Softens a strong forehead and draws attention to the eyes.',
    Illustration: HairCurtain,
  },
  {
    id: 'waves',
    label: 'Soft waves',
    desc: 'Adds width at the temples, ideal for elongated face shapes.',
    Illustration: HairWaves,
  },
];

function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function HairScreen() {
  const { colors } = useTheme();
  const hair = useAnalysisStore((s) => s.currentAnalysis?.hairAnalysis);

  return (
    <Screen>
      <PageHeader eyebrow="Analysis" title="Hair recommendations" />

      <Card>
        <Txt variant="heading" serif accessibilityRole="header">Your hair profile</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.md }}>
          {hair?.texture ? <Chip label={`${cap(hair.texture)} texture`} /> : null}
          {hair?.thickness ? <Chip label={`${cap(hair.thickness)} thickness`} /> : null}
          {hair?.length ? <Chip label={cap(hair.length)} /> : null}
        </View>
        {!hair?.texture && !hair?.thickness ? (
          <Txt variant="bodySm" tone="subtle" style={{ marginTop: SPACE.sm }}>
            Take a selfie to unlock your hair profile.
          </Txt>
        ) : null}
      </Card>

      <View style={{ marginTop: SPACE.xxl }}>
        <Txt variant="h3" serif accessibilityRole="header" style={{ marginBottom: SPACE.md }}>Recommended styles</Txt>
        <View style={{ gap: SPACE.md }}>
          {HAIR_DATA.map((item, i) => (
            <Card key={item.id} style={{ flexDirection: 'row', gap: SPACE.lg, alignItems: 'flex-start' }}>
              <item.Illustration color={colors.gold} size={80} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, flexWrap: 'wrap' }}>
                  <Txt variant="body" weight="semibold">{item.label}</Txt>
                  {i === 0 ? <Chip label="Best match" selected /> : null}
                </View>
                <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>{item.desc}</Txt>
              </View>
            </Card>
          ))}
        </View>
      </View>

      <Card style={{ marginTop: SPACE.xxl }}>
        <Txt variant="heading" serif accessibilityRole="header" style={{ marginBottom: SPACE.sm }}>
          Styles to approach with care
        </Txt>
        <Txt variant="bodySm" tone="muted">
          Very blunt cuts and extremely short pixie styles can emphasise face width. Styles with
          movement and layers work better for you.
        </Txt>
      </Card>
    </Screen>
  );
}
