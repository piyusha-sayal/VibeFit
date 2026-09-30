import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Card, EmptyState, LoadingState, PageHeader, Screen, SectionHeader, Txt } from '../../../components/ds';
import { SPACE } from '../../../constants/theme';
import { useSalonGuide } from '../../../hooks/useFace';
import { useSaveLook } from '../../../hooks/useBeauty';
import { useTheme } from '../../../theme/ThemeProvider';

export default function SalonGuideScreen() {
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

      <Txt
        variant="body"
        tone="accent"
        weight="semibold"
        style={{ marginTop: SPACE.xl }}
        onPress={() => saveLook.mutate({
          name: guide.title.replace('Asking for a ', ''),
          kind: 'hair',
          status: 'want_to_try',
          payload: { styleKey: guide.styleKey },
        })}
      >
        {saveLook.isSuccess ? 'Saved to your Passport' : saveLook.isPending ? 'Saving…' : 'Save to my Passport'}
      </Txt>

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xl }}>{guide.disclaimer}</Txt>
    </Screen>
  );
}
