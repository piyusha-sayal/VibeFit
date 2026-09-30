import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  Button, Card, EmptyState, LoadingState, PageHeader, Screen, SectionHeader, StatusBanner, Txt,
} from '../../../components/ds';
import { success } from '../../../utils/haptics';
import { SPACE } from '../../../constants/theme';
import { useSalonGuide } from '../../../hooks/useFace';
import { useSaveLook } from '../../../hooks/useBeauty';
import { useTheme } from '../../../theme/ThemeProvider';

export default function SalonGuideScreen() {
  const router = useRouter();
  const { style } = useLocalSearchParams<{ style: string }>();
  const { colors } = useTheme();
  const query = useSalonGuide(style ?? null);
  const saveLook = useSaveLook();

  if (query.isLoading) return <LoadingState label="Loading the guide…" />;
  if (!query.data) {
    return <EmptyState title="We do not have that cut" body="Pick one from the haircut finder." />;
  }

  const guide = query.data;

  return (
    <Screen>
      <PageHeader eyebrow="Salon consultation" title={guide.title} />

      {/* Large, high-contrast and legible at arm's length: this is the card a
          person holds up to their stylist, not one they read themselves. */}
      <View
        style={{
          backgroundColor: colors.text, borderRadius: 24, padding: SPACE.xl,
        }}
      >
        <Txt variant="overline" style={{ color: colors.bg, opacity: 0.7 }}>Show your stylist</Txt>
        {guide.askFor.map((line) => (
          <Txt
            key={line}
            variant="title"
            serif
            weight="semibold"
            style={{ color: colors.bg, marginTop: SPACE.md }}
          >
            {line}
          </Txt>
        ))}
      </View>

      <SectionHeader title="Worth knowing" style={{ marginTop: SPACE.xxl }} />
      <Card variant="tinted" accent="peach">
        {guide.watchOut.map((line) => (
          <Txt key={line} variant="bodySm" style={{ marginBottom: SPACE.sm }}>• {line}</Txt>
        ))}
        <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.xs }}>{guide.maintenance}</Txt>
      </Card>

      <Button
        label={saveLook.isSuccess ? 'Saved to your Passport' : 'Save to my Passport'}
        variant="secondary"
        loading={saveLook.isPending}
        disabled={saveLook.isSuccess}
        style={{ marginTop: SPACE.xl }}
        onPress={() => saveLook.mutate({
          name: guide.title.replace('Asking for a ', ''),
          kind: 'hair',
          status: 'want_to_try',
          payload: { styleKey: guide.styleKey },
        }, { onSuccess: () => success() })}
      />
      {saveLook.isSuccess ? (
        <View style={{ marginTop: SPACE.md }}>
          <StatusBanner
            tone="success"
            title="Saved to your Beauty Passport"
            actionLabel="View"
            onAction={() => router.push('/(tabs)/passport' as never)}
          />
        </View>
      ) : null}

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xl }}>{guide.disclaimer}</Txt>
    </Screen>
  );
}
