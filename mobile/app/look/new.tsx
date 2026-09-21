/**
 * The guided flow that leads into the Look Builder.
 *
 * Guided, not gated: every step can be skipped and every step can be changed
 * later. Step 4 shows exactly which parts of the passport are being used, and
 * lets any of them be left out of this one look without touching the profile.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  Button, Card, Chip, ErrorState, LoadingState, ProgressBar, SectionHeader, Txt,
} from '../../components/ds';
import { LookCard } from '../../components/look';
import { RADIUS, SPACE } from '../../constants/theme';
import { useGenerateLooks, useLookContext, useLookOptions } from '../../hooks/useLook';
import type { LookBrief, LookComposition } from '../../services/lookService';
import { useLookDraft } from '../../store/lookDraft';
import { useTheme } from '../../theme/ThemeProvider';

const STEPS = ['Occasion', 'Aesthetic', 'Wardrobe', 'You', 'Looks'] as const;

const REGIONS = [
  { key: 'indian', label: 'Indian and South Asian' },
  { key: 'global', label: 'Western and global' },
] as const;

export default function NewLookScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    occasion?: string; aesthetic?: string; structure?: string;
  }>();

  const options = useLookOptions();
  const [step, setStep] = useState(0);
  const [occasion, setOccasion] = useState<string | null>(params.occasion ?? null);
  const [customOccasion, setCustomOccasion] = useState('');
  const [aesthetics, setAesthetics] = useState<string[]>(
    params.aesthetic ? [params.aesthetic] : [],
  );
  const [regions, setRegions] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [concepts, setConcepts] = useState<LookComposition[]>([]);

  const context = useLookContext(excluded);
  const generate = useGenerateLooks();
  const startDraft = useLookDraft((s) => s.start);

  const brief: LookBrief = useMemo(() => ({
    occasion,
    customOccasion: occasion === 'custom' ? customOccasion.trim() || null : null,
    aesthetics,
    regions,
    exclude: excluded,
    limit: 3,
  }), [occasion, customOccasion, aesthetics, regions, excluded]);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const runGeneration = async () => {
    const result = await generate.mutateAsync(brief);
    setConcepts(result.looks);
    setStep(4);
  };

  const openBuilder = (composition: LookComposition) => {
    startDraft(composition, brief);
    router.push('/look/builder' as never);
  };

  if (options.isLoading) return <LoadingState label="Loading the studio…" />;
  if (options.error) {
    return <ErrorState message="We could not load the studio."
                       onRetry={() => { void options.refetch(); }} />;
  }

  const occasions = options.data?.occasions ?? [];
  const allAesthetics = options.data?.aesthetics ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Txt variant="overline" tone="subtle">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </Txt>
      <ProgressBar value={(step + 1) / STEPS.length} label="Look progress" />

      {/* ------------------------------------------------ step 1: occasion */}
      {step === 0 ? (
        <View style={styles.section}>
          <Txt variant="display" serif>What are you dressing for?</Txt>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
            You can change this at any point.
          </Txt>
          <View style={styles.wrap}>
            {occasions.map((entry) => (
              <Chip
                key={entry.key}
                label={entry.label}
                accent="peach"
                selected={occasion === entry.key}
                onPress={() => setOccasion(occasion === entry.key ? null : entry.key)}
              />
            ))}
          </View>
          {occasion === 'custom' ? (
            <TextInput
              value={customOccasion}
              onChangeText={setCustomOccasion}
              placeholder="Tell us what it is"
              placeholderTextColor={colors.textSubtle}
              accessibilityLabel="Your own occasion"
              style={[styles.input, {
                borderColor: colors.border, color: colors.text, backgroundColor: colors.surface,
              }]}
            />
          ) : null}
          <Button label="Next" onPress={() => setStep(1)} style={styles.next} />
          <Button label="Skip — surprise me" variant="ghost" onPress={() => setStep(3)} />
        </View>
      ) : null}

      {/* ----------------------------------------------- step 2: aesthetic */}
      {step === 1 ? (
        <View style={styles.section}>
          <Txt variant="display" serif>Any aesthetic in mind?</Txt>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
            Pick as many as fit, or none. Nobody is one aesthetic.
          </Txt>
          <View style={styles.wrap}>
            {allAesthetics.map((aesthetic) => (
              <Chip
                key={aesthetic.key}
                label={aesthetic.name}
                accent="lavender"
                selected={aesthetics.includes(aesthetic.key)}
                onPress={() => setAesthetics(toggle(aesthetics, aesthetic.key))}
              />
            ))}
          </View>
          <Button label="Next" onPress={() => setStep(2)} style={styles.next} />
          <Button label="Back" variant="ghost" onPress={() => setStep(0)} />
        </View>
      ) : null}

      {/* ------------------------------------------------ step 3: wardrobe */}
      {step === 2 ? (
        <View style={styles.section}>
          <Txt variant="display" serif>Which wardrobe?</Txt>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
            Leave both unselected to see everything. We never guess this from a photo.
          </Txt>
          <View style={styles.wrap}>
            {REGIONS.map((region) => (
              <Chip
                key={region.key}
                label={region.label}
                accent="sage"
                selected={regions.includes(region.key)}
                onPress={() => setRegions(toggle(regions, region.key))}
              />
            ))}
          </View>
          <Button label="Next" onPress={() => setStep(3)} style={styles.next} />
          <Button label="Back" variant="ghost" onPress={() => setStep(1)} />
        </View>
      ) : null}

      {/* ------------------------------------------ step 4: personalisation */}
      {step === 3 ? (
        <View style={styles.section}>
          <Txt variant="display" serif>What we will use</Txt>
          {context.isLoading ? (
            <LoadingState label="Reading your passport…" />
          ) : (
            <>
              {context.data?.using.length ? (
                <>
                  <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
                    Tap any of these to leave it out of this look. Your profile is not changed.
                  </Txt>
                  {context.data.using.map((entry) => (
                    <Card
                      key={entry.key}
                      variant={excluded.includes(entry.key) ? 'plain' : 'tinted'}
                      accent="gold"
                      style={{ marginTop: SPACE.sm }}
                      onPress={() => setExcluded(toggle(excluded, entry.key))}
                      accessibilityLabel={`${entry.label}. ${
                        excluded.includes(entry.key) ? 'Excluded' : 'In use'}`}
                    >
                      <View style={styles.rowBetween}>
                        <View style={{ flex: 1 }}>
                          <Txt variant="overline" tone="subtle">{entry.label}</Txt>
                          <Txt variant="body" weight="semibold">{entry.value ?? '—'}</Txt>
                        </View>
                        <Txt variant="bodySm" tone={excluded.includes(entry.key) ? 'subtle' : 'accent'}>
                          {excluded.includes(entry.key) ? 'Left out' : 'Using'}
                        </Txt>
                      </View>
                    </Card>
                  ))}
                </>
              ) : (
                <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
                  Nothing from a beauty analysis yet — so this look is built from the
                  occasion and your answers. It still works.
                </Txt>
              )}

              {context.data?.missing.length ? (
                <View style={{ marginTop: SPACE.lg }}>
                  <SectionHeader title="Could be more personal" />
                  {context.data.missing.map((gap) => (
                    <Card
                      key={gap.key}
                      style={{ marginBottom: SPACE.sm }}
                      onPress={() => router.push(gap.route as never)}
                    >
                      <Txt variant="body">{gap.label}</Txt>
                      <Txt variant="bodySm" tone="accent" style={{ marginTop: 2 }}>
                        Add it →
                      </Txt>
                    </Card>
                  ))}
                </View>
              ) : null}
            </>
          )}

          <Button
            label="Create my looks"
            onPress={() => { void runGeneration(); }}
            loading={generate.isPending}
            style={styles.next}
          />
          <Button label="Back" variant="ghost" onPress={() => setStep(2)} />
          {generate.isError ? (
            <ErrorState message="We could not build a look just now."
                        onRetry={() => { void runGeneration(); }} />
          ) : null}
        </View>
      ) : null}

      {/* ------------------------------------------------- step 5: concepts */}
      {step === 4 ? (
        <View style={styles.section}>
          <Txt variant="display" serif>Your looks</Txt>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
            Open one to change any part of it. Nothing is saved until you say so.
          </Txt>

          {concepts.length === 0 ? (
            <ErrorState message="No looks came back for that combination."
                        onRetry={() => { void runGeneration(); }} />
          ) : (
            concepts.map((composition) => (
              <LookCard
                key={composition.structure}
                composition={composition}
                onPress={() => openBuilder(composition)}
                footer={
                  <Txt variant="bodySm" tone="accent" weight="semibold"
                       style={{ marginTop: SPACE.sm }}>
                    Open in the builder →
                  </Txt>
                }
              />
            ))
          )}

          <Button label="Change the brief" variant="secondary"
                  onPress={() => setStep(0)} style={styles.next} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxl, paddingBottom: SPACE.xxxl * 2 },
  section: { marginTop: SPACE.xl },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.lg },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  next: { marginTop: SPACE.xl },
  input: {
    minHeight: 48,
    marginTop: SPACE.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.lg,
  },
});
