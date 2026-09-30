import React from 'react';
import { ScrollView, View } from 'react-native';

import { Card, Chip, PageHeader, Screen, Swatch, Txt } from '../../components/ds';
import { VNeck, WrapNeck, OffShoulder, ScoopNeck, SquareNeck, CowlNeck } from '../../components/illustrations/Necklines';
import { SPACE } from '../../constants/theme';
import { useAnalysisStore } from '../../store/analysisStore';
import { useTheme } from '../../theme/ThemeProvider';

const NECKLINES = [
  { id: 'vneck', label: 'V-neck', desc: 'Elongates the neck, flatters most face shapes.', Illustration: VNeck },
  { id: 'wrap', label: 'Wrap', desc: 'Creates a diagonal line, visually slims and shapes.', Illustration: WrapNeck },
  { id: 'offshoulder', label: 'Off-shoulder', desc: 'Draws the eye wide, balances a narrower hip.', Illustration: OffShoulder },
  { id: 'scoop', label: 'Scoop neck', desc: 'Versatile and universally flattering.', Illustration: ScoopNeck },
  { id: 'square', label: 'Square neck', desc: 'Adds structure, great for fuller busts.', Illustration: SquareNeck },
  { id: 'cowl', label: 'Cowl neck', desc: 'Soft drape, elegant for evening looks.', Illustration: CowlNeck },
];

const PALETTE: { label: string; hex: string }[] = [
  { label: 'Camel', hex: '#c19a6b' },
  { label: 'Ivory', hex: '#f2ece3' },
  { label: 'Chocolate', hex: '#5c3d2e' },
  { label: 'Rust', hex: '#b5541b' },
  { label: 'Sage', hex: '#8a9e7b' },
  { label: 'Navy', hex: '#1a2744' },
];

const PRINCIPLES = [
  'Monochromatic looks in your undertone range elongate and refine.',
  'Keep busy prints on the lower half, away from the face.',
  'Structured shoulders balance a proportionally wider hip.',
];

export default function WardrobeScreen() {
  const { colors } = useTheme();
  const outfits = useAnalysisStore((s) => s.currentAnalysis?.recommendations?.filter((r) => r.category === 'outfit') ?? []);

  return (
    <Screen>
      <PageHeader eyebrow="Analysis" title="Outfit styling" />

      <Card>
        <Txt variant="heading" serif accessibilityRole="header" style={{ marginBottom: SPACE.md }}>Your wardrobe palette</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
          {PALETTE.map((p) => <Swatch key={p.label} hex={p.hex} name={p.label} size={40} />)}
        </View>
      </Card>

      <View style={{ marginTop: SPACE.xxl }}>
        <Txt variant="h3" serif accessibilityRole="header" style={{ marginBottom: SPACE.md }}>Neckline guide</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACE.sm, paddingRight: SPACE.xl }}>
          {NECKLINES.map((n, i) => (
            <Card
              key={n.id}
              variant={i === 0 ? 'tinted' : 'plain'}
              accent="gold"
              style={{ width: 108, alignItems: 'center', gap: SPACE.sm }}
            >
              <n.Illustration color={i === 0 ? colors.gold : colors.textMuted} size={60} />
              <Txt variant="caption" weight="semibold" tone={i === 0 ? 'accent' : 'muted'} style={{ textAlign: 'center' }}>
                {n.label}
              </Txt>
              {i === 0 ? <Chip label="Best" selected /> : null}
            </Card>
          ))}
        </ScrollView>
      </View>

      {outfits.length > 0 ? (
        <View style={{ marginTop: SPACE.xxl }}>
          <Txt variant="h3" serif accessibilityRole="header" style={{ marginBottom: SPACE.md }}>Outfit matches</Txt>
          <View style={{ gap: SPACE.sm }}>
            {outfits.slice(0, 6).map((r) => (
              <Card key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
                <View style={{ flex: 1 }}>
                  <Txt variant="body" weight="semibold">{r.title}</Txt>
                  {r.description ? <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>{r.description}</Txt> : null}
                </View>
                <Chip label={`${Math.round(r.confidence * 100)}% match`} />
              </Card>
            ))}
          </View>
        </View>
      ) : null}

      <Card style={{ marginTop: SPACE.xxl }}>
        <Txt variant="heading" serif accessibilityRole="header" style={{ marginBottom: SPACE.md }}>Style principles</Txt>
        {PRINCIPLES.map((tip, i) => (
          <View key={tip} style={{ flexDirection: 'row', gap: SPACE.sm, marginBottom: i === PRINCIPLES.length - 1 ? 0 : SPACE.sm }}>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.gold, marginTop: 7 }} />
            <Txt variant="bodySm" tone="muted" style={{ flex: 1 }}>{tip}</Txt>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
