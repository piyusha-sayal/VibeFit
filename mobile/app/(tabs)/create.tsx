import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Card, Chip, EmptyState, ErrorState, LoadingState, SectionHeader, Swatch, Txt } from '../../components/ds';
import { OCCASIONS } from '../../constants/experiences';
import { RADIUS, SPACE } from '../../constants/theme';
import { useBeautyProfile, useColorReport, usePassport, useSaveLook } from '../../hooks/useBeauty';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Create My Look, honest edition.
 *
 * The full Look Builder is Phase 5. What exists now assembles a look from what
 * the passport actually holds — palette, face shape, hair, styling profile —
 * names the parts it cannot fill, and saves the result as a real SavedLook.
 * Nothing on this screen is invented to fill a slot.
 */
export default function CreateScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { occasion: initialOccasion } = useLocalSearchParams<{ occasion?: string }>();
  const [occasion, setOccasion] = useState<string | null>(initialOccasion ?? null);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  const passport = usePassport();
  const report = useColorReport();
  const profile = useBeautyProfile();
  const saveLook = useSaveLook();

  const attrs = useMemo(
    () => Object.fromEntries((passport.data?.attributes ?? []).map((a) => [a.key, a])),
    [passport.data],
  );

  const parts = useMemo(() => {
    const rows: { slot: string; value: string | null; missing?: { label: string; route: string } }[] = [];

    rows.push({
      slot: 'Outfit colours',
      value: report.data ? report.data.palettes.best.slice(0, 3).map((s) => s.name).join(', ') : null,
      missing: { label: 'Run a colour analysis', route: '/(tabs)/scan' },
    });
    rows.push({
      slot: 'Lipstick',
      value: report.data ? report.data.palettes.lipstick[0].name : null,
      missing: { label: 'Run a colour analysis', route: '/(tabs)/scan' },
    });
    rows.push({
      slot: 'Blush and eyes',
      value: report.data
        ? `${report.data.palettes.blush[0].name} · ${report.data.palettes.eyeshadow[0].name}`
        : null,
      missing: { label: 'Run a colour analysis', route: '/(tabs)/scan' },
    });
    rows.push({
      slot: 'Jewellery',
      value: report.data ? report.data.metals.join(' or ') : null,
      missing: { label: 'Run a colour analysis', route: '/(tabs)/scan' },
    });
    rows.push({
      slot: 'Hairstyle',
      value: attrs.face_shape?.status === 'present' ? `Cuts for a ${attrs.face_shape.value} face` : null,
      missing: { label: 'Scan your face', route: '/(tabs)/scan' },
    });
    rows.push({
      slot: 'Silhouette',
      value: profile.data?.bodyType && profile.data.bodyType !== 'uncategorised'
        ? `Shapes for your ${profile.data.bodyType.replace('_', ' ')} selection`
        : null,
      missing: { label: 'Set your styling profile', route: '/style/body' },
    });

    const garments = occasion && report.data
      ? (['wedding', 'indian_wedding', 'festival'].includes(occasion)
        ? report.data.garments.indian
        : report.data.garments.global)
      : null;
    rows.push({
      slot: 'Outfit ideas',
      value: garments ? garments.join(' · ') : null,
      missing: { label: 'Run a colour analysis', route: '/(tabs)/scan' },
    });

    return rows;
  }, [report.data, attrs, profile.data, occasion]);

  const ready = parts.filter((p) => p.value).length;

  const handleSave = async () => {
    if (!occasion) return;
    const label = OCCASIONS.find((o) => o.key === occasion)?.label ?? occasion;
    const look = await saveLook.mutateAsync({
      name: name.trim() || `${label} look`,
      kind: 'complete',
      occasion,
      payload: Object.fromEntries(parts.filter((p) => p.value).map((p) => [p.slot, p.value as string])),
    });
    setSaved(look.name);
    setName('');
  };

  if (passport.isLoading) return <LoadingState label="Reading your passport…" />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Txt variant="display" serif>Create My Look</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: SPACE.xs, marginBottom: SPACE.xl }}>
        Choose an occasion. Everything below is drawn from your passport — never invented to fill a gap.
      </Txt>

      <SectionHeader title="Occasion" />
      <View style={styles.wrap}>
        {OCCASIONS.map((o) => (
          <Chip
            key={o.key}
            label={o.label}
            accent="peach"
            selected={occasion === o.key}
            onPress={() => setOccasion(o.key)}
          />
        ))}
      </View>

      {report.data ? (
        <View style={{ marginTop: SPACE.xxl }}>
          <SectionHeader title="Your colours for it" action="Report" onAction={() => router.push('/colors/report' as never)} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {report.data.palettes.best.map((s) => (
              <Swatch key={s.hex} hex={s.hex} name={s.name} size={50} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={{ marginTop: SPACE.xxl }}>
        <SectionHeader title={`The look (${ready} of ${parts.length} ready)`} />
        {parts.map((part) => (
          <Card key={part.slot} style={{ marginBottom: SPACE.sm }}>
            <Txt variant="overline" tone="muted">{part.slot}</Txt>
            {part.value ? (
              <Txt variant="body" style={{ marginTop: SPACE.xs }}>{part.value}</Txt>
            ) : (
              <View style={styles.missingRow}>
                <Txt variant="bodySm" tone="subtle">Not enough in your passport yet</Txt>
                {part.missing ? (
                  <Txt
                    variant="bodySm"
                    tone="accent"
                    weight="semibold"
                    onPress={() => router.push(part.missing!.route as never)}
                  >
                    {part.missing.label}
                  </Txt>
                ) : null}
              </View>
            )}
          </Card>
        ))}
      </View>

      {ready === 0 ? (
        <EmptyState
          title="Nothing to build from yet"
          body="A colour analysis fills most of this in one step."
          actionLabel="Run an analysis"
          onAction={() => router.push('/(tabs)/scan' as never)}
        />
      ) : (
        <View style={{ marginTop: SPACE.xl }}>
          <SectionHeader title="Save it" />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name this look"
            placeholderTextColor={colors.textSubtle}
            accessibilityLabel="Look name"
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          />
          <Button
            label={occasion ? 'Save to my looks' : 'Choose an occasion first'}
            disabled={!occasion}
            loading={saveLook.isPending}
            onPress={handleSave}
            style={{ marginTop: SPACE.md }}
          />
          {saved ? (
            <Card variant="tinted" accent="sage" style={{ marginTop: SPACE.md }}>
              <Txt variant="bodySm" tone="success" weight="semibold">Saved “{saved}”</Txt>
              <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>
                It is in your passport, and on your timeline.
              </Txt>
            </Card>
          ) : null}
          {saveLook.isError ? (
            <ErrorState message="Could not save that look." onRetry={handleSave} />
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  missingRow: { marginTop: SPACE.xs, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.md },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.lg,
  },
});
