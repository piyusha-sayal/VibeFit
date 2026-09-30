import React from 'react';
import { View } from 'react-native';

import { Card, PageHeader, Screen, Swatch, Txt } from '../../components/ds';
import { EarringIcon, NecklaceIcon, RingIcon, BraceletIcon } from '../../components/illustrations/Accessories';
import { SPACE } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';

const CATEGORIES = [
  {
    id: 'earrings',
    label: 'Earrings',
    Icon: EarringIcon,
    recs: [
      { title: 'Long drop earrings', desc: 'Elongate the neck and draw the eye vertically.' },
      { title: 'Geometric hoops', desc: 'Add structure and frame the face with clean lines.' },
      { title: 'Pearl studs', desc: 'Timeless and versatile — complement any undertone.' },
    ],
  },
  {
    id: 'necklaces',
    label: 'Necklaces',
    Icon: NecklaceIcon,
    recs: [
      { title: 'Long pendant', desc: 'Creates a vertical line, slims the silhouette.' },
      { title: 'Layered chains', desc: 'Adds texture and depth to necklines.' },
      { title: 'Choker', desc: 'Best with V or square necklines for proportion.' },
    ],
  },
  {
    id: 'rings',
    label: 'Rings',
    Icon: RingIcon,
    recs: [
      { title: 'Thin stacking rings', desc: 'Elongate the fingers, elegant and minimal.' },
      { title: 'Statement signet', desc: 'Anchors the hand, works with any aesthetic.' },
    ],
  },
  {
    id: 'bracelets',
    label: 'Bracelets',
    Icon: BraceletIcon,
    recs: [
      { title: 'Delicate chain', desc: 'Subtle elegance, suits warm gold undertones.' },
      { title: 'Cuff bracelet', desc: 'Bold and sculptural, great for statement looks.' },
    ],
  },
];

const METAL_GUIDE = [
  { label: 'Yellow gold', color: '#c9a87c', note: 'Best for warm undertones' },
  { label: 'Rose gold', color: '#b5754c', note: 'Soft warmth, flatters medium undertones' },
  { label: 'Silver', color: '#a8adb3', note: 'Best for cool undertones' },
  { label: 'Gunmetal', color: '#5a5f68', note: 'Universal — edgy and modern' },
];

const RULES = [
  'Match metal tone to your undertone for a cohesive look.',
  'Balance bold accessories with minimal clothing — or vice versa.',
  'One statement piece per outfit; keep the rest subtle.',
];

export default function AccessoriesScreen() {
  const { colors } = useTheme();

  return (
    <Screen>
      <PageHeader eyebrow="Analysis" title="Accessories" />

      <Card>
        <Txt variant="heading" serif accessibilityRole="header" style={{ marginBottom: SPACE.md }}>Metal tone guide</Txt>
        <View style={{ gap: SPACE.md }}>
          {METAL_GUIDE.map((m) => (
            <View key={m.label} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
              <Swatch hex={m.color} size={36} />
              <View style={{ flex: 1 }}>
                <Txt variant="bodySm" weight="semibold">{m.label}</Txt>
                <Txt variant="caption" tone="muted">{m.note}</Txt>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {CATEGORIES.map((cat, ci) => (
        <View key={cat.id} style={{ marginTop: SPACE.xxl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACE.md, gap: SPACE.sm }}>
            <cat.Icon color={colors.gold} size={28} />
            <Txt variant="h3" serif accessibilityRole="header">{cat.label}</Txt>
            {ci === 0 ? (
              <Txt variant="caption" tone="accent" weight="semibold" style={{ marginLeft: SPACE.sm }}>Top priority</Txt>
            ) : null}
          </View>
          <View style={{ gap: SPACE.sm }}>
            {cat.recs.map((rec, i) => (
              <Card key={rec.title} style={{ flexDirection: 'row', gap: SPACE.md, alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: i === 0 ? colors.gold : colors.surfaceAlt,
                  }}
                >
                  <Txt variant="caption" weight="bold" style={{ color: i === 0 ? colors.onAccent : colors.textMuted }}>
                    {i + 1}
                  </Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="body" weight="semibold">{rec.title}</Txt>
                  <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>{rec.desc}</Txt>
                </View>
              </Card>
            ))}
          </View>
        </View>
      ))}

      <Card style={{ marginTop: SPACE.xxl }}>
        <Txt variant="heading" serif accessibilityRole="header" style={{ marginBottom: SPACE.md }}>Accessory rules</Txt>
        {RULES.map((tip, i) => (
          <View key={tip} style={{ flexDirection: 'row', gap: SPACE.sm, marginBottom: i === RULES.length - 1 ? 0 : SPACE.sm }}>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.gold, marginTop: 7 }} />
            <Txt variant="bodySm" tone="muted" style={{ flex: 1 }}>{tip}</Txt>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
