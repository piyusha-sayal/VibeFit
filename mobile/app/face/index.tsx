import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, LoadingState, ProgressBar, SectionHeader, Txt } from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { useFaceProfile } from '../../hooks/useFace';
import { useTheme } from '../../theme/ThemeProvider';

const TOOLS = [
  {
    label: 'Face shape report',
    body: 'Your shape, the measurements behind it, and what it means for styling.',
    route: '/face/shape',
    accent: 'gold' as const,
  },
  {
    label: 'Feature explorer',
    body: 'Eyes, brows, lips, cheeks and contrast — confirm each one in a mirror.',
    route: '/face/features',
    accent: 'lavender' as const,
  },
  {
    label: 'Hair Studio',
    body: 'Cuts, fringes, colour and a script for the salon.',
    route: '/hair',
    accent: 'peach' as const,
  },
  {
    label: 'Makeup Studio',
    body: 'Fourteen aesthetics, built around what you confirmed.',
    route: '/makeup',
    accent: 'blush' as const,
  },
  {
    label: 'Accessories',
    body: 'Glasses, earrings, necklines and metals.',
    route: '/accessories',
    accent: 'sage' as const,
  },
];

export default function DiscoverMyFaceScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const profile = useFaceProfile();

  const shape = profile.data?.faceShape;
  const confirmed = profile.data?.known ?? 0;
  const total = profile.data?.total ?? 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Discover My Face</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: SPACE.xs, marginBottom: SPACE.xl }}>
        Your features as a starting point for styling — never as a score.
      </Txt>

      {profile.isLoading ? (
        <LoadingState label="Reading your profile…" />
      ) : (
        <Card variant="tinted" accent="gold" onPress={() => router.push('/face/features' as never)}>
          <Txt variant="overline" tone="muted">Your face profile</Txt>
          <Txt variant="title" serif style={{ marginTop: 2 }}>
            {shape?.value
              ? `${shape.value.replace('_', ' ')} face shape`
              : 'Not measured yet'}
          </Txt>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
            {shape?.source === 'user'
              ? 'You confirmed this shape.'
              : shape?.source === 'scan'
                ? 'Measured from your last scan. You can change it.'
                : 'Run a scan, or choose your shape yourself.'}
          </Txt>
          <ProgressBar
            value={profile.data?.completion ?? 0}
            label={`${confirmed} of ${total} features known`}
          />
          {!profile.data?.hasScan && (
            <Button
              label="Run an analysis"
              variant="secondary"
              style={{ marginTop: SPACE.lg }}
              onPress={() => router.push('/(tabs)/scan' as never)}
            />
          )}
        </Card>
      )}

      <View style={{ marginTop: SPACE.xxl }}>
        <SectionHeader title="Explore" />
        {TOOLS.map((tool) => (
          <Card
            key={tool.route}
            style={{ marginBottom: SPACE.sm }}
            onPress={() => router.push(tool.route as never)}
            accessibilityLabel={tool.label}
          >
            <Txt variant="heading">{tool.label}</Txt>
            <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{tool.body}</Txt>
          </Card>
        ))}
      </View>

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xl }}>
        {profile.data?.disclaimer ??
          'Face shape is a styling starting point, not a verdict.'}
      </Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
});
