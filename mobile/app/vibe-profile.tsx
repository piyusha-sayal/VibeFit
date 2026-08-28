import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Lbl } from '../components/ui/Lbl';
import { Tag } from '../components/ui/Tag';
import { GoldButton } from '../components/ui/GoldButton';
import { C } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getVibeProfile, saveCorrection } from '../services/profileService';
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
    <View style={styles.attrRow}>
      <View style={styles.attrHeader}>
        <Text style={styles.attrLabel}>{keyLabel(attrKey)}</Text>
        <View style={styles.attrHeaderRight}>
          <Tag>{CONFIDENCE_LABEL[attr.confidence] ?? attr.confidence}</Tag>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editBtn} activeOpacity={0.7}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {editing ? (
        <View>
          <TextInput
            style={styles.editInput}
            value={draft}
            onChangeText={setDraft}
            placeholderTextColor={C.textSubtle}
            autoFocus
          />
          <View style={styles.editActions}>
            <TouchableOpacity onPress={() => { setDraft(valueText(attr.value)); setEditing(false); }} style={styles.editCancelBtn}>
              <Text style={styles.editCancelText}>Cancel</Text>
            </TouchableOpacity>
            <GoldButton label={saving ? 'Saving…' : 'Save correction'} onPress={save} loading={saving} style={styles.editSaveBtn} />
          </View>
        </View>
      ) : (
        <View>
          <Text style={styles.attrValue}>{valueText(attr.value)}</Text>
          {attr.originalValue !== null && attr.originalValue !== undefined && (
            <Text style={styles.attrOriginal}>Original scan value: {valueText(attr.originalValue)}</Text>
          )}
          <Text style={styles.attrExplanation}>{attr.explanation}</Text>
          {attr.limitations && <Text style={styles.attrLimitations}>{attr.limitations}</Text>}
        </View>
      )}
    </View>
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

  useEffect(() => { load(); }, [load]);

  const handleCorrect = async (key: string, value: string) => {
    const res = await saveCorrection(key, value);
    if (res.success) await load();
  };

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={C.gold} size="large" />
      </Screen>
    );
  }

  if (error || !profile) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.emptyText}>{error ?? 'No profile yet.'}</Text>
        <GoldButton label="Retry" onPress={load} style={{ marginTop: 20 }} />
      </Screen>
    );
  }

  const attrEntries = Object.entries(profile.attributes);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="Vibe Profile" title={profile.goal ?? 'No goal set yet'} style={{ marginBottom: 6 }} />
        {profile.areasOfInterest.length > 0 && (
          <Text style={styles.areas}>Focused on {profile.areasOfInterest.join(', ')}</Text>
        )}

        <View style={styles.statusRow}>
          <Tag>{profile.hasOnboarding ? 'Onboarding complete' : 'Onboarding pending'}</Tag>
          <Tag>{profile.hasScan ? 'Scan on file' : 'No scan yet'}</Tag>
        </View>

        <Lbl style={styles.sectionLbl}>Your attributes</Lbl>
        {attrEntries.length === 0 ? (
          <Text style={styles.emptyInline}>
            Nothing recorded yet — complete onboarding and a scan to build your profile.
          </Text>
        ) : (
          attrEntries.map(([key, attr]) => (
            <AttributeRow key={key} attrKey={key} attr={attr} onCorrect={handleCorrect} />
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontFamily: FONTS.sans, fontSize: 14, color: C.textMuted, textAlign: 'center' },
  emptyInline: { fontFamily: FONTS.sans, fontSize: 13, color: C.textMuted, marginTop: 8, lineHeight: 19 },
  scroll: { padding: 20, paddingTop: 16 },
  areas: { fontFamily: FONTS.sans, fontSize: 13, color: C.textMuted },
  statusRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  sectionLbl: { marginTop: 26, marginBottom: 12 },
  attrRow: { backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.white06, borderRadius: 16, padding: 16, marginBottom: 12 },
  attrHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  attrHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attrLabel: { fontFamily: FONTS.sansSemiBold, fontSize: 14, color: C.text, flex: 1 },
  editBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 9999, backgroundColor: C.surface2, borderWidth: 0.5, borderColor: C.white08 },
  editBtnText: { fontFamily: FONTS.sansMedium, fontSize: 11, color: C.gold },
  attrValue: { fontFamily: FONTS.serif, fontSize: 19, color: C.gold, marginBottom: 6 },
  attrOriginal: { fontFamily: FONTS.sans, fontSize: 11, color: C.textSubtle, marginBottom: 4 },
  attrExplanation: { fontFamily: FONTS.sans, fontSize: 12, color: C.textMuted, lineHeight: 18 },
  attrLimitations: { fontFamily: FONTS.sans, fontSize: 11, color: C.textSubtle, marginTop: 4, fontStyle: 'italic' },
  editInput: {
    fontFamily: FONTS.sans, fontSize: 14, color: C.text, backgroundColor: C.surface2,
    borderWidth: 0.5, borderColor: C.goldBorder, borderRadius: 10, padding: 12,
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 10 },
  editCancelBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  editCancelText: { fontFamily: FONTS.sansMedium, fontSize: 13, color: C.textMuted },
  editSaveBtn: { paddingVertical: 10, paddingHorizontal: 18 },
});
