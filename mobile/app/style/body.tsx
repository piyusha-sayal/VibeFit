import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Chip, ErrorState, LoadingState, SectionHeader, Txt } from '../../components/ds';
import { BODY_GUIDANCE, BODY_TYPES } from '../../constants/wardrobe';
import { SPACE } from '../../constants/theme';
import { useBeautyProfile, useSaveBeautyProfile } from '../../hooks/useBeauty';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Body type, chosen by the person it belongs to.
 *
 * This screen replaces the old photo-derived body analysis. "Not sure" and
 * "Rather not" are real answers that still produce guidance, so nobody has to
 * categorise themselves to use the rest of the app.
 */
export default function BodyStyleScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const profile = useBeautyProfile();
  const save = useSaveBeautyProfile();
  const [choice, setChoice] = useState<string | null>(null);

  const selected = choice ?? profile.data?.bodyType ?? null;
  const guidance = selected ? BODY_GUIDANCE[selected] : null;

  if (profile.isLoading) return <LoadingState label="Loading your styling profile…" />;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="title" serif>Body type</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        You choose this, not a camera. VibeFit does not ask for body photographs and does not estimate
        proportions from your face scan.
      </Txt>

      <View style={styles.section}>
        <SectionHeader title="Pick what fits, or skip it" />
        <View style={styles.wrap}>
          {BODY_TYPES.map((t) => (
            <Chip
              key={t.key}
              label={t.label}
              accent="sage"
              selected={selected === t.key}
              onPress={() => setChoice(t.key)}
            />
          ))}
        </View>
        {selected ? (
          <Txt variant="bodySm" tone="subtle" style={{ marginTop: SPACE.md }}>
            {BODY_TYPES.find((t) => t.key === selected)?.note}
          </Txt>
        ) : null}
      </View>

      {guidance ? (
        <>
          <Card variant="tinted" accent="sage" style={{ marginTop: SPACE.xl }}>
            <Txt variant="bodySm">{guidance.summary}</Txt>
            <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.sm }}>
              Options worth trying — not rules, and not a verdict on how you look.
            </Txt>
          </Card>

          <View style={styles.section}>
            <SectionHeader title="Worth exploring" />
            {guidance.explore.map((item) => (
              <Card key={item} style={{ marginBottom: SPACE.sm }}>
                <Txt variant="bodySm">{item}</Txt>
              </Card>
            ))}
          </View>

          <View style={styles.section}>
            <SectionHeader title="Indian wardrobe" />
            {guidance.indian.map((item) => (
              <Card key={item} variant="tinted" accent="peach" style={{ marginBottom: SPACE.sm }}>
                <Txt variant="bodySm">{item}</Txt>
              </Card>
            ))}
          </View>

          <View style={styles.section}>
            <SectionHeader title="Global wardrobe" />
            {guidance.global.map((item) => (
              <Card key={item} variant="tinted" accent="sage" style={{ marginBottom: SPACE.sm }}>
                <Txt variant="bodySm">{item}</Txt>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      <Button
        label={save.isSuccess && !choice ? 'Saved' : 'Save my choice'}
        disabled={!selected}
        loading={save.isPending}
        style={{ marginTop: SPACE.xl }}
        onPress={async () => {
          if (!selected) return;
          await save.mutateAsync({ bodyType: selected });
          setChoice(null);
        }}
      />
      {save.isError ? <ErrorState message="Could not save that." /> : null}

      <Button
        label="Answer the rest of the questionnaire"
        variant="secondary"
        style={{ marginTop: SPACE.md }}
        onPress={() => router.push('/style' as never)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  section: { marginTop: SPACE.xxl },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
});
