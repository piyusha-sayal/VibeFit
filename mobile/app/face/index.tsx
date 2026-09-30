import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Button, FeatureCard, Hero, LoadingState, PageHeader, ProgressBar, Screen, Section, Txt,
} from '../../components/ds';
import { FaceFigure, faceShapeFor } from '../../components/visual';
import { SPACE } from '../../constants/theme';
import { useFaceProfile } from '../../hooks/useFace';

const TOOLS = [
  {
    label: 'Feature explorer',
    body: 'Eyes, brows, lips, cheeks and contrast.',
    route: '/face/features',
  },
  {
    label: 'Hair Studio',
    body: 'Cuts, fringes, colour and a salon script.',
    route: '/hair',
  },
  {
    label: 'Makeup Studio',
    body: 'Fourteen aesthetics, built around you.',
    route: '/makeup',
  },
  {
    label: 'Accessories',
    body: 'Glasses, earrings, necklines and metals.',
    route: '/accessories',
  },
];

export default function DiscoverMyFaceScreen() {
  const router = useRouter();
  const profile = useFaceProfile();

  const shape = profile.data?.faceShape;
  const confirmed = profile.data?.known ?? 0;
  const total = profile.data?.total ?? 0;

  return (
    <Screen>
      <PageHeader
        title="Discover My Face"
        subtitle="Your features as a starting point for styling — never a score."
      />

      {profile.isLoading ? (
        <LoadingState label="Reading your profile…" />
      ) : (
        <Hero
          eyebrow="Your face profile"
          title={shape?.value ? `${shape.value.replace('_', ' ')} face shape` : 'Not measured yet'}
          body={
            shape?.source === 'user'
              ? 'You confirmed this shape.'
              : shape?.source === 'scan'
                ? 'Measured from your last scan. You can change it.'
                : 'Run a scan, or choose your shape yourself.'
          }
          art={<FaceFigure faceShape={faceShapeFor(shape?.value) ?? 'oval'} hairLength="short" seed="face-home" size={88} />}
          actionLabel={!profile.data?.hasScan ? 'Run an analysis' : undefined}
          onAction={!profile.data?.hasScan ? () => router.push('/(tabs)/scan' as never) : undefined}
        />
      )}

      {!profile.isLoading && (
        <View style={{ marginTop: SPACE.lg }}>
          <ProgressBar
            value={profile.data?.completion ?? 0}
            label={`${confirmed} of ${total} features known`}
          />
          {!profile.data?.hasScan ? null : (
            <Button
              label="Open the face shape report"
              variant="secondary"
              style={{ marginTop: SPACE.lg }}
              onPress={() => router.push('/face/shape' as never)}
            />
          )}
        </View>
      )}

      <Section title="Explore">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
          {TOOLS.map((tool) => (
            <FeatureCard
              key={tool.route}
              title={tool.label}
              subtitle={tool.body}
              onPress={() => router.push(tool.route as never)}
              style={{ flexBasis: '46%', flexGrow: 0 }}
            />
          ))}
        </View>
      </Section>

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xl }}>
        {profile.data?.disclaimer ?? 'Face shape is a styling starting point, not a verdict.'}
      </Txt>
    </Screen>
  );
}
