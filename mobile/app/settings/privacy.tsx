import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Button, Card, ErrorState, LoadingState, SectionHeader, Txt,
} from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';
import {
  deleteAllPhotos, deletePhoto, exportData, getConsent, listPhotos, setConsent,
  type PhotoConsent, type PhotoList,
} from '../../services/privacyService';

function whenTaken(iso: string | null): string {
  if (!iso) return 'Date unknown';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Date unknown';
  return date.toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function PrivacyScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [photos, setPhotos] = useState<PhotoList | null>(null);
  const [consent, setConsentState] = useState<PhotoConsent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [p, c] = await Promise.all([listPhotos(), getConsent()]);
    if (!p.success || !c.success) {
      setError(p.error || c.error || 'Could not load your privacy settings.');
    } else {
      setPhotos(p.data);
      setConsentState(c.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeConsent = async (body: {
    photoRetentionConsent?: boolean;
    photoReuseConsent?: boolean;
  }) => {
    setBusy('consent');
    const response = await setConsent(body);
    if (response.success) {
      setConsentState(response.data);
      // Withdrawing retention deletes what was kept, so the list is now stale.
      const refreshed = await listPhotos();
      if (refreshed.success) setPhotos(refreshed.data);
    } else {
      Alert.alert('That did not save', response.error || 'Please try again.');
    }
    setBusy(null);
  };

  const removeOne = (analysisId: string) => {
    Alert.alert(
      'Delete this photograph?',
      'The results of the analysis stay in your passport. Only the photograph goes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete photograph',
          style: 'destructive',
          onPress: async () => {
            setBusy(analysisId);
            const response = await deletePhoto(analysisId);
            if (response.success) await load();
            else Alert.alert('Not deleted', response.error || 'Please try again.');
            setBusy(null);
          },
        },
      ],
    );
  };

  const removeAll = () => {
    Alert.alert(
      'Delete every stored photograph?',
      'Your analyses and everything built from them stay. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: async () => {
            setBusy('all');
            const response = await deleteAllPhotos();
            if (response.success) await load();
            else Alert.alert('Not deleted', response.error || 'Please try again.');
            setBusy(null);
          },
        },
      ],
    );
  };

  const runExport = async () => {
    setBusy('export');
    const response = await exportData();
    setBusy(null);
    if (!response.success) {
      Alert.alert('Export failed', response.error || 'Please try again.');
      return;
    }
    const text = JSON.stringify(response.data, null, 2);
    try {
      await Share.share({ message: text, title: 'MyLookFit data export' });
    } catch {
      // Dismissing the share sheet is not a failure worth an alert.
    }
  };

  if (loading) return <LoadingState label="Loading your privacy settings…" />;

  const stored = photos?.photos.filter((p) => p.stored) ?? [];
  const removed = photos?.photos.filter((p) => !p.stored && p.deletedAt) ?? [];

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
    >
      <Txt variant="display" serif>Privacy</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        Your photographs, what we keep, and how to take it all back.
      </Txt>

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {/* ------------------------------------------------------------ consent */}
      <View style={styles.section}>
        <SectionHeader title="Photograph consent" />
        <Card>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Txt variant="body">Keep my photographs after an analysis</Txt>
              <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                Off by default. With it off, your photograph is deleted as soon as the
                analysis finishes — the results stay, the image does not.
              </Txt>
            </View>
            <Switch
              value={!!consent?.photoRetentionConsent}
              disabled={busy === 'consent'}
              onValueChange={(next) => changeConsent({ photoRetentionConsent: next })}
              accessibilityLabel="Keep my photographs after an analysis"
              trackColor={{ true: colors.sage, false: colors.surfaceAlt }}
            />
          </View>
        </Card>

        <Card style={{ marginTop: SPACE.md }}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Txt variant="body">Reuse a kept photograph for a new analysis</Txt>
              <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {consent?.photoRetentionConsent
                  ? 'Saves taking a new photograph each time.'
                  : 'Needs the setting above: with nothing kept, there is nothing to reuse.'}
              </Txt>
            </View>
            <Switch
              value={!!consent?.photoReuseConsent}
              disabled={busy === 'consent' || !consent?.photoRetentionConsent}
              onValueChange={(next) => changeConsent({ photoReuseConsent: next })}
              accessibilityLabel="Reuse a kept photograph for a new analysis"
              trackColor={{ true: colors.sage, false: colors.surfaceAlt }}
            />
          </View>
        </Card>

        <Card variant="outlined" style={{ marginTop: SPACE.md }}>
          <Txt variant="caption" tone="subtle">
            {consent?.retentionNote || photos?.retentionNote}
          </Txt>
          <Button
            label="Read the privacy policy"
            variant="ghost"
            style={{ marginTop: SPACE.sm }}
            onPress={() => router.push('/settings/legal?doc=privacy' as never)}
          />
        </Card>
      </View>

      {/* ---------------------------------------------------------- the photos */}
      <View style={styles.section}>
        <SectionHeader title="Your photographs" />
        <Txt variant="bodySm" tone="muted" style={{ marginBottom: SPACE.md }}>
          {stored.length === 0
            ? 'Nothing is stored right now.'
            : `${stored.length} stored`}
        </Txt>

        {stored.length === 0 ? (
          <Card variant="outlined">
            <Txt variant="bodySm" tone="muted">
              No photograph of yours is being kept. Analyses you have already run keep
              their results and appear in your passport.
            </Txt>
          </Card>
        ) : (
          stored.map((photo) => (
            <Card key={photo.analysisId} style={{ marginBottom: SPACE.md }}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Txt variant="body">{whenTaken(photo.createdAt)}</Txt>
                  <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                    {photo.analysisKept
                      ? 'Analysis complete — results stay if you delete this.'
                      : `Analysis ${photo.status}`}
                  </Txt>
                </View>
                <Button
                  label="Delete"
                  variant="secondary"
                  loading={busy === photo.analysisId}
                  onPress={() => removeOne(photo.analysisId)}
                />
              </View>
            </Card>
          ))
        )}

        {stored.length > 0 ? (
          <Button
            label="Delete every stored photograph"
            variant="secondary"
            loading={busy === 'all'}
            style={{ marginTop: SPACE.sm }}
            onPress={removeAll}
          />
        ) : null}

        {removed.length > 0 ? (
          <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.md }}>
            {removed.length} earlier {removed.length === 1 ? 'photograph has' : 'photographs have'}{' '}
            already been deleted. Their analyses are still in your passport.
          </Txt>
        ) : null}
      </View>

      {/* ------------------------------------------------------------- export */}
      <View style={styles.section}>
        <SectionHeader title="Your data" />
        <Card>
          <Txt variant="bodySm" tone="muted">
            A copy of everything on your account as a JSON file — profile, analyses,
            looks, collections, goals, journey and preferences. Photographs are listed,
            not included; manage those above.
          </Txt>
          <Button
            label="Export my data"
            style={{ marginTop: SPACE.md }}
            loading={busy === 'export'}
            onPress={runExport}
          />
        </Card>
      </View>

      {/* ----------------------------------------------------------- deletion */}
      <View style={styles.section}>
        <SectionHeader title="Delete account" />
        <Card variant="outlined">
          <Txt variant="bodySm" tone="muted">
            Removes your account and everything in it. There is no way to undo it and
            no way to recover a look afterwards.
          </Txt>
          <Button
            label="Delete my account"
            variant="secondary"
            style={{ marginTop: SPACE.md }}
            onPress={() => router.push('/settings/delete-account' as never)}
          />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  section: { marginTop: SPACE.xxl },
  rowBetween: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: SPACE.md,
  },
});
