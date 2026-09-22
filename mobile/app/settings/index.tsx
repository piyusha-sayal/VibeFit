import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Chip, ErrorState, LoadingState, SectionHeader, Txt } from '../../components/ds';
import { RADIUS, SPACE } from '../../constants/theme';
import { useSettings, useUpdateSettings } from '../../hooks/useBeauty';
import { useAuthStore } from '../../store/authStore';
import { useTheme, ThemePreference } from '../../theme/ThemeProvider';
import { getConsent, type PhotoConsent } from '../../services/privacyService';
import { retentionStatus } from '../../utils/retention';
import * as biometrics from '../../services/biometrics';

const THEMES: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, preference, setPreference, reducedMotion, setReducedMotion } = useTheme();

  // Biometric unlock. The capability is asked for fresh because a sensor can
  // be enrolled or cleared in device settings while the app is open.
  const userId = useAuthStore((s) => s.user?.id) ?? null;
  const [lockOn, setLockOn] = useState(false);
  const [lockable, setLockable] = useState<biometrics.BiometricCapability | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [lockBusy, setLockBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const capability = await biometrics.capability();
      const enabled = userId ? await biometrics.isEnabled(userId) : false;
      if (cancelled) return;
      setLockable(capability);
      setLockOn(enabled);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const toggleLock = async (next: boolean) => {
    if (!userId || lockBusy) return;
    setLockBusy(true);
    setLockError(null);
    // Both directions prove it is the same person first, so that a phone
    // handed over unlocked cannot quietly have the lock removed.
    const result = await biometrics.setEnabled(userId, next);
    if (result.ok) setLockOn(next);
    else if (result.error) setLockError(result.error);
    setLockBusy(false);
  };
  const settings = useSettings();
  const update = useUpdateSettings();
  const user = useAuthStore((s) => s.user);

  // The reuse switch lives on two screens. Both must describe the same thing,
  // and only the privacy endpoint knows whether storage can honour it.
  const [consent, setConsent] = useState<PhotoConsent | null>(null);
  useEffect(() => {
    void getConsent().then((response) => {
      if (response.success) setConsent(response.data);
    });
  }, []);
  const retention = retentionStatus(consent, null, update.isPending);
  const logout = useAuthStore((s) => s.logout);

  const [country, setCountry] = useState('');

  useEffect(() => {
    if (settings.data?.country) setCountry(settings.data.country);
  }, [settings.data?.country]);

  // The device is the source of truth for the first paint; the backend keeps
  // the choice so it follows the account to another device.
  const chooseTheme = (next: ThemePreference) => {
    setPreference(next);
    update.mutate({ theme: next });
  };

  const toggleMotion = (next: boolean) => {
    setReducedMotion(next);
    update.mutate({ reducedMotion: next });
  };

  if (settings.isLoading) return <LoadingState label="Loading settings…" />;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Settings</Txt>

      {settings.isError ? (
        <ErrorState message="Could not load your settings." onRetry={() => settings.refetch()} />
      ) : null}

      {/* ------------------------------------------------------------ account */}
      <View style={styles.section}>
        <SectionHeader title="Account" />
        <Card>
          <Txt variant="bodySm" tone="muted">Signed in as</Txt>
          <Txt variant="body" weight="semibold" style={{ marginTop: 2 }}>
            {user?.email || user?.name || 'Guest session'}
          </Txt>
          {!user?.email ? (
            <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xs }}>
              A guest session is stored on this device only. Create an account to keep your passport.
            </Txt>
          ) : null}
        </Card>
        <Button
          label="Sign out"
          variant="secondary"
          style={{ marginTop: SPACE.md }}
          onPress={() =>
            Alert.alert('Sign out?', 'Your saved looks and analyses stay on your account.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: () => logout() },
            ])
          }
        />
        <Button
          label="Delete account"
          variant="ghost"
          style={{ marginTop: SPACE.sm }}
          onPress={() => router.push('/settings/delete-account' as never)}
        />
      </View>

      {/* --------------------------------------------------------- appearance */}
      <View style={styles.section}>
        <SectionHeader title="Appearance" />
        <View style={styles.wrap}>
          {THEMES.map((t) => (
            <Chip
              key={t.key}
              label={t.label}
              accent="lavender"
              selected={preference === t.key}
              onPress={() => chooseTheme(t.key)}
            />
          ))}
        </View>
        <Card style={{ marginTop: SPACE.md }}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Txt variant="body">Reduce motion</Txt>
              <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                Removes screen transitions and press animations. Follows your system setting too.
              </Txt>
            </View>
            <Switch
              value={reducedMotion}
              onValueChange={toggleMotion}
              accessibilityLabel="Reduce motion"
              trackColor={{ true: colors.sage, false: colors.surfaceAlt }}
            />
          </View>
        </Card>
        <Card style={{ marginTop: SPACE.md }}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Txt variant="body">
                {`Unlock with ${biometrics.labelFor(lockable?.kind ?? 'none')}`}
              </Txt>
              <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {lockable?.available
                  ? 'Asks for it each time the app starts. Your session stays '
                    + 'signed in; this keeps another person from opening it.'
                  : lockable?.reason ?? 'Checking what this device supports…'}
              </Txt>
            </View>
            <Switch
              value={lockOn}
              onValueChange={(next) => { void toggleLock(next); }}
              disabled={!lockable?.available || lockBusy || !userId}
              accessibilityLabel={`Unlock with ${biometrics.labelFor(lockable?.kind ?? 'none')}`}
              trackColor={{ true: colors.sage, false: colors.surfaceAlt }}
            />
          </View>
          {lockError ? (
            <Txt variant="caption" tone="danger" live="assertive"
                 style={{ marginTop: SPACE.sm }}>
              {lockError}
            </Txt>
          ) : null}
        </Card>
      </View>

      {/* ------------------------------------------------------ personalisation */}
      <View style={styles.section}>
        <SectionHeader title="Personalisation" />
        <Card>
          <Txt variant="bodySm" tone="muted">Country or region</Txt>
          <TextInput
            value={country}
            onChangeText={setCountry}
            onBlur={() => update.mutate({ country: country.trim() || null })}
            placeholder="Used only to order wardrobe suggestions"
            placeholderTextColor={colors.textSubtle}
            accessibilityLabel="Country or region"
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
          />
          <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.sm }}>
            Every wardrobe stays available whatever you put here. Nothing is locked by region, and
            nothing about you is inferred from it.
          </Txt>
        </Card>
        <Button
          label="Styling preferences"
          variant="secondary"
          style={{ marginTop: SPACE.md }}
          onPress={() => router.push('/style' as never)}
        />
      </View>

      {/* ------------------------------------------------------------ privacy */}
      <View style={styles.section}>
        <SectionHeader title="Photos and privacy" />
        <Card>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Txt variant="body">Reuse my photo for new analyses</Txt>
              <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {retention.storageAvailable
                  ? 'Off by default. With it off, every analysis needs a fresh photo, which is '
                    + 'never kept beyond the scan itself.'
                  : 'Unavailable on this version: no photograph is kept, so there is nothing to '
                    + 'reuse. Every analysis uses a fresh photo, which is deleted when it finishes.'}
              </Txt>
            </View>
            <Switch
              // What is in effect, not what is stored. The server refuses to
              // let reuse outlive retention, so a switch reading the raw flag
              // could show "on" and then silently revert.
              value={retention.reuseOn}
              disabled={!retention.reuseEnabled}
              onValueChange={(next) => update.mutate({ photoReuseConsent: next })}
              accessibilityLabel="Reuse my photo for new analyses"
              accessibilityHint={retention.reuseEnabled ? undefined
                : 'Unavailable because no photograph is stored'}
              trackColor={{ true: colors.sage, false: colors.surfaceAlt }}
            />
          </View>
        </Card>
        <Card variant="outlined" style={{ marginTop: SPACE.md }}>
          <Txt variant="bodySm" tone="muted">
            MyLookFit does not request body photographs, does not infer ethnicity, nationality or any
            other personal attribute from a photo, and does not score appearance.
          </Txt>
        </Card>
        <Button
          label="Photographs, consent and your data"
          style={{ marginTop: SPACE.md }}
          onPress={() => router.push('/settings/privacy' as never)}
        />
        <Button
          label="Manage analyses"
          variant="secondary"
          style={{ marginTop: SPACE.sm }}
          onPress={() => router.push('/(tabs)/results' as never)}
        />
      </View>

      {/* --------------------------------------------------------------- help */}
      <View style={styles.section}>
        <SectionHeader title="Help" />
        <Button label="Photo guidelines and FAQ" variant="secondary" onPress={() => router.push('/settings/help' as never)} />
        <Button
          label="Privacy policy"
          variant="ghost"
          style={{ marginTop: SPACE.sm }}
          onPress={() => router.push('/settings/legal?doc=privacy' as never)}
        />
        <Button
          label="Terms of service"
          variant="ghost"
          style={{ marginTop: SPACE.xs }}
          onPress={() => router.push('/settings/legal?doc=terms' as never)}
        />
      </View>

      {update.isError ? (
        <ErrorState message="That change did not save. It is still applied on this device." />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  section: { marginTop: SPACE.xxl },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  input: {
    minHeight: 48,
    marginTop: SPACE.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.lg,
  },
});
