import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Card, EmptyState, LoadingState, SectionHeader, Txt } from '../../../components/ds';
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="overline" tone="muted">Salon consultation</Txt>
      <Txt variant="display" serif style={{ marginTop: 2 }}>{guide.title}</Txt>

      <SectionHeader title="Say this" style={{ marginTop: SPACE.xl }} />
      <Card>
        {guide.askFor.map((line) => (
          <Txt key={line} variant="body" style={{ marginBottom: SPACE.sm }}>• {line}</Txt>
        ))}
      </Card>

      <SectionHeader title="Worth knowing" style={{ marginTop: SPACE.xl }} />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
});
