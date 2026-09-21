import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Chip, ErrorState, LoadingState, SectionHeader, Txt } from '../../components/ds';
import {
  AESTHETICS, CULTURAL_PREFERENCES, FIT_PREFERENCES, HAIR_LENGTHS,
  MAKEUP_EXPERIENCE, NECKLINES, SILHOUETTES, SLEEVES,
} from '../../constants/wardrobe';
import { RADIUS, SPACE } from '../../constants/theme';
import { NotFoundError, useBeautyProfile, useSaveBeautyProfile } from '../../hooks/useBeauty';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * The styling questionnaire.
 *
 * Every question is optional and multi-select where that makes sense. Nothing
 * on this screen asks for a photograph, and no answer is required to get a
 * useful result — which is the point of the questionnaire replacing the old
 * photo-derived body analysis.
 */
export default function StyleQuestionnaireScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const profile = useBeautyProfile();
  const save = useSaveBeautyProfile();

  const [fit, setFit] = useState<string | null>(null);
  const [necklines, setNecklines] = useState<string[]>([]);
  const [sleeves, setSleeves] = useState<string[]>([]);
  const [silhouettes, setSilhouettes] = useState<string[]>([]);
  const [aesthetics, setAesthetics] = useState<string[]>([]);
  const [cultural, setCultural] = useState<string[]>([]);
  const [hairLength, setHairLength] = useState<string | null>(null);
  const [makeup, setMakeup] = useState<string | null>(null);
  const [height, setHeight] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Seed from whatever is already stored, so the screen is an editor rather
  // than a form that silently discards earlier answers.
  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setFit(p.fitPreference ?? null);
    setNecklines(p.necklinePreferences ?? []);
    setSleeves(p.sleevePreferences ?? []);
    setSilhouettes(p.silhouettePreferences ?? []);
    setAesthetics(p.aesthetics ?? []);
    setCultural(p.culturalPreferences ?? []);
    setHairLength(p.hairLength ?? null);
    setMakeup(p.makeupExperience ?? null);
    setHeight(p.heightCm ? String(p.heightCm) : '');
  }, [profile.data]);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const isLoading = profile.isLoading;
  const loadFailed = profile.isError && !(profile.error instanceof NotFoundError);

  if (isLoading) return <LoadingState label="Loading your styling profile…" />;

  const handleSave = async () => {
    const parsedHeight = height.trim() ? Number(height.trim()) : null;
    await save.mutateAsync({
      fitPreference: fit,
      necklinePreferences: necklines,
      sleevePreferences: sleeves,
      silhouettePreferences: silhouettes,
      aesthetics,
      culturalPreferences: cultural,
      hairLength,
      makeupExperience: makeup,
      heightCm: parsedHeight && !Number.isNaN(parsedHeight) ? parsedHeight : null,
    });
    setSavedAt(Date.now());
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Discover My Style</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: SPACE.xs }}>
        Answer what you like and skip the rest. MyLookFit never asks for a body photograph, and never
        infers your shape from one.
      </Txt>

      {loadFailed ? (
        <ErrorState message="Could not load your saved answers." onRetry={() => profile.refetch()} />
      ) : null}

      <Card variant="tinted" accent="sage" style={{ marginTop: SPACE.xl }} onPress={() => router.push('/style/body' as never)}>
        <Txt variant="heading" serif>Body type and silhouettes</Txt>
        <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
          Choose one yourself, or skip the category entirely. →
        </Txt>
      </Card>

      <Group title="Preferred fit">
        {FIT_PREFERENCES.map((f) => (
          <Chip key={f} label={f} accent="sage" selected={fit === f} onPress={() => setFit(fit === f ? null : f)} />
        ))}
      </Group>

      <Group title="Necklines you reach for">
        {NECKLINES.map((n) => (
          <Chip key={n} label={n} accent="blush" selected={necklines.includes(n)} onPress={() => toggle(necklines, setNecklines, n)} />
        ))}
      </Group>

      <Group title="Sleeves">
        {SLEEVES.map((s) => (
          <Chip key={s} label={s} accent="peach" selected={sleeves.includes(s)} onPress={() => toggle(sleeves, setSleeves, s)} />
        ))}
      </Group>

      <Group title="Silhouettes">
        {SILHOUETTES.map((s) => (
          <Chip key={s} label={s} accent="lavender" selected={silhouettes.includes(s)} onPress={() => toggle(silhouettes, setSilhouettes, s)} />
        ))}
      </Group>

      <Group title="Aesthetics">
        {AESTHETICS.map((a) => (
          <Chip key={a} label={a} accent="gold" selected={aesthetics.includes(a)} onPress={() => toggle(aesthetics, setAesthetics, a)} />
        ))}
      </Group>

      <Group title="Cultural wardrobe">
        {CULTURAL_PREFERENCES.map((c) => (
          <Chip key={c} label={c} accent="peach" selected={cultural.includes(c)} onPress={() => toggle(cultural, setCultural, c)} />
        ))}
      </Group>

      <Group title="Hair length">
        {HAIR_LENGTHS.map((h) => (
          <Chip key={h} label={h} accent="lavender" selected={hairLength === h} onPress={() => setHairLength(hairLength === h ? null : h)} />
        ))}
      </Group>

      <Group title="Makeup experience">
        {MAKEUP_EXPERIENCE.map((m) => (
          <Chip key={m} label={m} accent="blush" selected={makeup === m} onPress={() => setMakeup(makeup === m ? null : m)} />
        ))}
      </Group>

      <View style={styles.section}>
        <SectionHeader title="Height, if you want to share it" />
        <TextInput
          value={height}
          onChangeText={setHeight}
          keyboardType="number-pad"
          placeholder="cm — entirely optional"
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel="Height in centimetres"
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
        />
      </View>

      <Button
        label="Save my answers"
        loading={save.isPending}
        style={{ marginTop: SPACE.xl }}
        onPress={handleSave}
      />
      {savedAt ? (
        <Card variant="tinted" accent="sage" style={{ marginTop: SPACE.md }}>
          <Txt variant="bodySm" tone="success" weight="semibold">Saved</Txt>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>
            Your passport and recommendations now use these answers.
          </Txt>
        </Card>
      ) : null}
      {save.isError ? <ErrorState message="Could not save your answers." onRetry={handleSave} /> : null}
    </ScrollView>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      <View style={styles.wrap}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  section: { marginTop: SPACE.xxl },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.lg,
  },
});
