import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, LoadingState, SectionHeader, Txt } from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { useFaceProfile } from '../../hooks/useFace';
import { useTheme } from '../../theme/ThemeProvider';

const TOOLS = [
  { label: 'Haircut finder', body: 'Filter by texture, length and how much upkeep you want.', route: '/hair/cuts' },
  { label: 'Fringe finder', body: 'Every fringe, including the option of not having one.', route: '/hair/bangs' },
  { label: 'Hair colour', body: 'Shades ranked against your colour season, with the lift each needs.', route: '/hair/colour' },
  { label: 'Parting guide', body: 'Where a parting changes the shape of your face.', route: '/hair/parting' },
  { label: 'Saved inspiration', body: 'Cuts and colours you kept.', route: '/passport' },
];

export default function HairStudioScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const profile = useFaceProfile();

  const texture = profile.data?.context.hairTexture;
  const shape = profile.data?.faceShape.value;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Hair Studio</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: SPACE.xs, marginBottom: SPACE.xl }}>
        Cuts, colour and what to actually say at the salon.
      </Txt>

      {profile.isLoading ? (
        <LoadingState />
      ) : (
        <Card variant="tinted" accent="peach">
          <Txt variant="overline" tone="muted">Personalised from</Txt>
          <Txt variant="body" style={{ marginTop: SPACE.xs }}>
            {shape ? `${shape.replace('_', ' ')} face shape` : 'No face shape yet'}
            {texture ? ` · ${texture} hair` : ''}
          </Txt>
          <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.xs }}>
            {shape
              ? 'Every list below is ordered for this. You can override the filters.'
              : 'Lists below show the full library until we know your shape.'}
          </Txt>
        </Card>
      )}

      <View style={{ marginTop: SPACE.xxl }}>
        <SectionHeader title="Tools" />
        {TOOLS.map((tool) => (
          <Card key={tool.route} style={{ marginBottom: SPACE.sm }} onPress={() => router.push(tool.route as never)}>
            <Txt variant="heading">{tool.label}</Txt>
            <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{tool.body}</Txt>
          </Card>
        ))}
      </View>

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xl }}>
        Reference photos show the cut, not a prediction of your result. Density,
        growth pattern and the stylist all change how it lands.
      </Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
});
