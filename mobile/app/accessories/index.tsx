import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { FeatureCard, LoadingState, PageHeader, Screen, Swatch, Txt } from '../../components/ds';
import { EarringIcon } from '../../components/illustrations/Accessories';
import { VNeck } from '../../components/illustrations/Necklines';
import { FaceFigure } from '../../components/visual';
import { SPACE } from '../../constants/theme';
import { useAccessories } from '../../hooks/useFace';
import { useTheme } from '../../theme/ThemeProvider';

const CATEGORIES = [
  { key: 'glasses', label: 'Glasses', body: 'Frames that balance your face shape.' },
  { key: 'earrings', label: 'Earrings', body: 'Shapes that draw the eye where you want it.' },
  { key: 'necklines', label: 'Necklines', body: 'Necklines that suit your proportions.' },
  { key: 'hair_accessories', label: 'Hair accessories', body: 'Clips, bands and pins worth trying.' },
  { key: 'metals', label: 'Metals', body: 'Warm or cool tones against your colouring.' },
] as const;

export default function AccessoriesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const query = useAccessories();
  const bundle = query.data;

  const art: Partial<Record<(typeof CATEGORIES)[number]['key'], React.ReactNode>> = {
    glasses: <FaceFigure glasses="round" seed="acc-glasses" size={64} />,
    earrings: <EarringIcon color={colors.gold} size={48} />,
    necklines: <VNeck color={colors.gold} size={56} />,
    metals: <Swatch hex={colors.gold} size={40} />,
  };

  return (
    <Screen>
      <PageHeader
        title="Accessories"
        subtitle={
          bundle?.faceShape
            ? `Ordered for a ${bundle.faceShape.replace('_', ' ')} face shape.`
            : 'Add a face shape and these reorder for you.'
        }
      />

      {query.isLoading ? (
        <LoadingState />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
          {CATEGORIES.map((category) => (
            <FeatureCard
              key={category.key}
              title={category.label}
              subtitle={category.body}
              art={art[category.key]}
              onPress={() => router.push(`/accessories/${category.key}` as never)}
              style={{ flexBasis: '46%', flexGrow: 0 }}
            />
          ))}
        </View>
      )}

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xl }}>
        {bundle?.note}
      </Txt>
    </Screen>
  );
}
