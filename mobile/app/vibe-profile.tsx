import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import {
  Button, Card, Chip, ErrorState, LoadingState, PageHeader, Screen, SectionHeader, Txt,
} from '../components/ds';
import { RADIUS, SPACE } from '../constants/theme';
import { getVibeProfile, saveCorrection } from '../services/profileService';
import { useTheme } from '../theme/ThemeProvider';
import { VibeProfile, VibeAttribute } from '../types';

const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'High confidence',
  usable_with_caution: 'Usable with caution',
  retake_recommended: 'Retake recommended',
  self_reported: 'From your answers',
  user_corrected: 'Your correction',
  unknown: 'Limited confidence',
};

function keyLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function valueText(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (Array.isArray(v)) return v.join(', ') || '—';
  return String(v);
}

function AttributeRow({
  attrKey, attr, onCorrect,
}: { attrKey: string; attr: VibeAttribute; onCorrect: (key: string, value: string) => Promise<void> }) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(valueText(attr.value));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onCorrect(attrKey, draft);
    setSaving(false);
    setEditing(false);
  };

  return (
    <Card style={{ marginBottom: SPACE.sm }}>
      <View style={styles.rowBetween}>
        <Txt variant="body" weight="semibold" style={{ flex: 1 }}>{keyLabel(attrKey)}</Txt>
        <View style={styles.rowBetween}>
          <Chip label={CONFIDENCE_LABEL[attr.confidence] ?? attr.confidence} accent="gold" />
          {!editing ? (
            <Txt
              variant="bodySm"
              tone="accent"
              weight="semibold"
              onPress={() => setEditing(true)}
              accessibilityLabel={`Edit ${keyLabel(attrKey)}`}
            >
              Edit
            </Txt>
          ) : null}
        </View>
      </View>

      {editing ? (
        <View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholderTextColor={colors.textSubtle}
            autoFocus
            accessibilityLabel={`New value for ${keyLabel(attrKey)}`}
            style={[styles.input, { borderColor: colors.gold, color: colors.text, backgroundColor: colors.surfaceAlt }]}
          />
          <View style={[styles.rowBetween, { justifyContent: 'flex-end', marginTop: SPACE.sm }]}>
            <Button
              label="Cancel"
              variant="tertiary"
              onPress={() => { setDraft(valueText(attr.value)); setEditing(false); }}
            />
            <Button label="Save correction" loading={saving} onPress={() => { void save(); }} />
          </View>
        </View>
      ) : (
        <View style={{ marginTop: SPACE.sm }}>
          <Txt variant="heading" serif tone="accent">{valueText(attr.value)}</Txt>
          {attr.originalValue !== null && attr.originalValue !== undefined ? (
            <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xs }}>
              Original scan value: {valueText(attr.originalValue)}
            </Txt>
          ) : null}
          <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>{attr.explanation}</Txt>
          {attr.limitations ? (
            <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xs }}>{attr.limitations}</Txt>
          ) : null}
        </View>
      )}
    </Card>
  );
}

export default function VibeProfileScreen() {
  const [profile, setProfile] = useState<VibeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getVibeProfile();
    if (res.success && res.data) setProfile(res.data);
    else setError(res.error ?? 'Could not load your profile');
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCorrect = async (key: string, value: string) => {
    const res = await saveCorrection(key, value);
    if (res.success) await load();
  };

  if (loading) return <LoadingState label="Opening your profile…" />;
  if (error || !profile) {
    return <ErrorState message={error ?? 'No profile yet.'} onRetry={() => { void load(); }} />;
  }

  const attrEntries = Object.entries(profile.attributes);

  return (
    <Screen>
      <PageHeader eyebrow="Vibe Profile" title={profile.goal ?? 'No goal set yet'} />

      {profile.areasOfInterest.length > 0 ? (
        <Txt variant="bodySm" tone="muted">Focused on {profile.areasOfInterest.join(', ')}</Txt>
      ) : null}

      <View style={[styles.rowBetween, { marginTop: SPACE.md, justifyContent: 'flex-start' }]}>
        <Chip label={profile.hasOnboarding ? 'Onboarding complete' : 'Onboarding pending'} accent="sage" />
        <Chip label={profile.hasScan ? 'Scan on file' : 'No scan yet'} accent="lavender" />
      </View>

      <SectionHeader title="Your attributes" style={{ marginTop: SPACE.xl }} />
      {attrEntries.length === 0 ? (
        <Txt variant="bodySm" tone="muted">
          Nothing recorded yet — complete onboarding and a scan to build your profile.
        </Txt>
      ) : (
        attrEntries.map(([key, attr]) => (
          <AttributeRow key={key} attrKey={key} attr={attr} onCorrect={handleCorrect} />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
  input: {
    minHeight: 48,
    marginTop: SPACE.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.lg,
  },
});
