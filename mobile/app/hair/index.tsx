import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  FeatureCard, Hero, ListGroup, ListRow, LoadingState, PageHeader, Screen, Txt,
} from '../../components/ds';
import { FaceFigure } from '../../components/visual';
import { SPACE } from '../../constants/theme';
import { useFaceProfile } from '../../hooks/useFace';

const TOOLS = [
  {
    label: 'Haircut finder',
    body: 'Filter by texture, length and upkeep.',
    route: '/hair/cuts',
    art: <FaceFigure hairLength="medium" hairSilhouette="layered" seed="hub-cuts" size={64} />,
  },
  {
    label: 'Fringe finder',
    body: 'Every fringe, including none at all.',
    route: '/hair/bangs',
    art: <FaceFigure fringe="curtain" hairSilhouette="rounded" seed="hub-bangs" size={64} />,
  },
  {
    label: 'Parting guide',
    body: 'Where a parting changes your face.',
    route: '/hair/parting',
    art: <FaceFigure hairLength="long" seed="hub-parting" size={64} />,
  },
  {
    label: 'Hair colour',
    body: 'Shades ranked against your colour season.',
    route: '/hair/colour',
    art: <FaceFigure hairColour="auburn" hairLength="medium" seed="hub-colour" size={64} />,
  },
];

export default function HairStudioScreen() {
  const router = useRouter();
  const profile = useFaceProfile();

  const texture = profile.data?.context.hairTexture;
  const shape = profile.data?.faceShape.value;

  return (
    <Screen>
      <PageHeader
        title="Hair Studio"
        subtitle="Cuts, colour and what to actually say at the salon."
      />

      {profile.isLoading ? (
        <LoadingState />
      ) : (
        <Hero
          eyebrow="Personalised from"
          title={shape ? `${shape.replace('_', ' ')} face shape` : 'No face shape yet'}
          body={
            shape
              ? `Every list below is ordered for this${texture ? `, and your ${texture} hair` : ''}. You can override the filters.`
              : 'Lists below show the full library until we know your shape.'
          }
          art={<FaceFigure hairLength="medium" seed="hair-hub" size={80} />}
        />
      )}

      <View style={{ marginTop: SPACE.xxl, flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
        {TOOLS.map((tool) => (
          <FeatureCard
            key={tool.route}
            title={tool.label}
            subtitle={tool.body}
            art={tool.art}
            onPress={() => router.push(tool.route as never)}
            style={{ flexBasis: '46%', flexGrow: 0 }}
          />
        ))}
      </View>

      <View style={{ marginTop: SPACE.xxl }}>
        <ListGroup label="More">
          <ListRow
            title="Saved inspiration"
            subtitle="Cuts and colours you kept."
            onPress={() => router.push('/(tabs)/passport' as never)}
            last
          />
        </ListGroup>
      </View>

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xl }}>
        Reference photos show the cut, not a prediction of your result. Density,
        growth pattern and the stylist all change how it lands.
      </Txt>
    </Screen>
  );
}
