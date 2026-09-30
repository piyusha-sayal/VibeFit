import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Button, Card, ErrorState, LoadingState, PageHeader, Screen, Section, SelectCard, StatusBanner, Txt,
} from '../../components/ds';
import { GarmentFigure } from '../../components/visual';
import { BODY_GUIDANCE, BODY_TYPES } from '../../constants/wardrobe';
import { SPACE } from '../../constants/theme';
import { useBeautyProfile, useSaveBeautyProfile } from '../../hooks/useBeauty';

/** The silhouette each body type's card illustrates. Decorative only — never
    a claim about how a body looks, just a shape from the garment library. */
const BODY_TYPE_ART: Record<string, string> = {
  pear: 'a_line',
  apple: 'column',
  hourglass: 'fit_and_flare',
  rectangle: 'straight',
  inverted_triangle: 'wide_leg',
};

/**
 * Body type, chosen by the person it belongs to.
 *
 * This screen replaces the old photo-derived body analysis. "Not sure" and
 * "Rather not" are real answers that still produce guidance, so nobody has to
 * categorise themselves to use the rest of the app.
 */
export default function BodyStyleScreen() {
  const router = useRouter();
  const profile = useBeautyProfile();
  const save = useSaveBeautyProfile();
  const [choice, setChoice] = useState<string | null>(null);

  const selected = choice ?? profile.data?.bodyType ?? null;
  const guidance = selected ? BODY_GUIDANCE[selected] : null;

  if (profile.isLoading) return <LoadingState label="Loading your styling profile…" />;

  return (
    <Screen>
      <PageHeader title="Body type" subtitle="You choose this — not a camera." />

      <StatusBanner
        tone="info"
        title="Self-selected, always"
        body="MyLookFit does not ask for body photographs and does not estimate proportions from your face scan."
      />

      <Section title="Pick what fits, or skip it">
        <View style={styles.grid}>
          {BODY_TYPES.map((t) => (
            <View key={t.key} style={styles.tile}>
              <SelectCard
                title={t.label}
                subtitle={t.note}
                selected={selected === t.key}
                onPress={() => setChoice(t.key)}
                art={<GarmentFigure silhouette={BODY_TYPE_ART[t.key] ?? 'straight'} seed={t.key} width={48} />}
              />
            </View>
          ))}
        </View>
      </Section>

      {guidance ? (
        <>
          <Card variant="tinted" accent="sage" style={{ marginTop: SPACE.lg }}>
            <Txt variant="bodySm">{guidance.summary}</Txt>
            <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.sm }}>
              Options worth trying — not rules, and not a verdict on how you look.
            </Txt>
          </Card>

          <Section title="Worth exploring">
            {guidance.explore.map((item) => (
              <Card key={item} style={{ marginBottom: SPACE.sm }}>
                <Txt variant="bodySm">{item}</Txt>
              </Card>
            ))}
          </Section>

          <Section title="Indian wardrobe">
            {guidance.indian.map((item) => (
              <Card key={item} variant="tinted" accent="peach" style={{ marginBottom: SPACE.sm }}>
                <Txt variant="bodySm">{item}</Txt>
              </Card>
            ))}
          </Section>

          <Section title="Global wardrobe">
            {guidance.global.map((item) => (
              <Card key={item} variant="tinted" accent="sage" style={{ marginBottom: SPACE.sm }}>
                <Txt variant="bodySm">{item}</Txt>
              </Card>
            ))}
          </Section>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48%', marginBottom: SPACE.sm },
});
