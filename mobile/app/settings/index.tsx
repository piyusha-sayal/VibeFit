import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Card, ErrorState, ListGroup, ListRow, LoadingState, OptionRow, PageHeader, Screen, Txt,
} from '../../components/ds';
import { RADIUS, SPACE } from '../../constants/theme';
import { useSettings, useUpdateSettings } from '../../hooks/useBeauty';
import { useAuthStore } from '../../store/authStore';
import { useTheme, ThemePreference } from '../../theme/ThemeProvider';
import { getConsent, type PhotoConsent } from '../../services/privacyService';
import { retentionStatus } from '../../utils/retention';
import * as biometrics from '../../services/biometrics';
import { useBiometricLock } from '../../hooks/useBiometricLock';

const THEMES: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, preference, setPreference, reducedMotion, setReducedMotion } = useTheme();

  const userId = useAuthStore((s) => s.user?.id) ?? null;
  const {
    enabled: lockOn, capability: lockable, error: lockError, busy: lockBusy, toggle,
  } = useBiometricLock();
  const toggleLock = async (next: boolean) => { await toggle(next); };
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

  const confirmSignOut = () => Alert.alert(
    'Sign out?',
    'Your saved looks and analyses stay on your account.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ],
  );

  if (settings.isLoading) return <LoadingState label="Loading settings…" />;

  return (
    <Screen>
      <PageHeader title="Settings" />

      {settings.isError ? (
        <ErrorState message="Could not load your settings." onRetry={() => settings.refetch()} />
      ) : null}

      {/* ---------------------------------------------------------- appearance */}
      <ListGroup label="Appearance">
        {THEMES.map((t) => (
          <OptionRow
            key={t.key}
            label={t.label}
            selected={preference === t.key}
            onPress={() => chooseTheme(t.key)}
          />
        ))}
      </ListGroup>
      <ListGroup>
        <ListRow
          title="Reduce motion"
          subtitle="Removes screen transitions and press animations. Follows your system setting too."
          right={(
            <Switch
              value={reducedMotion}
              onValueChange={toggleMotion}
              accessibilityLabel="Reduce motion"
              trackColor={{ true: colors.sage, false: colors.surfaceAlt }}
            />
          )}
        />
        <ListRow
          title={`Unlock with ${biometrics.labelFor(lockable?.kind ?? 'none')}`}
          subtitle={lockable?.available
            ? 'Asks for it each time the app starts. Your session stays signed in; '
              + 'this keeps another person from opening it.'
            : lockable?.reason ?? 'Checking what this device supports…'}
          last
          right={(
            <Switch
              value={lockOn}
              onValueChange={(next) => { void toggleLock(next); }}
              disabled={!lockable?.available || lockBusy || !userId}
              accessibilityLabel={`Unlock with ${biometrics.labelFor(lockable?.kind ?? 'none')}`}
              trackColor={{ true: colors.sage, false: colors.surfaceAlt }}
            />
          )}
        />
      </ListGroup>
      {lockError ? <ErrorState message={lockError} /> : null}

      {/* ------------------------------------------------------ personalisation */}
      <View style={styles.section}>
        <Card>
          <View style={{ marginBottom: SPACE.sm }}>
            <TextInput
              value={country}
              onChangeText={setCountry}
              onBlur={() => update.mutate({ country: country.trim() || null })}
              placeholder="Country or region — used only to order wardrobe suggestions"
              placeholderTextColor={colors.textSubtle}
              accessibilityLabel="Country or region"
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
            />
          </View>
        </Card>
      </View>
      <ListGroup>
        <ListRow
          title="Styling preferences"
          onPress={() => router.push('/style' as never)}
          last
        />
      </ListGroup>

      {/* -------------------------------------------------------------- account */}
      <ListGroup label="Account">
        <ListRow
          title={user?.email || user?.name || 'Guest session'}
          subtitle={!user?.email
            ? 'Stored on this device only. Create an account to keep your passport.'
            : 'Signed in'}
        />
        <ListRow title="Profile and password" onPress={() => router.push('/settings/account' as never)} />
        <ListRow title="Sign out" onPress={confirmSignOut} />
        <ListRow title="Delete account" danger last onPress={() => router.push('/settings/delete-account' as never)} />
      </ListGroup>

      {/* -------------------------------------------------------------- privacy */}
      <ListGroup label="Privacy">
        <ListRow
          title="Reuse my photo for new analyses"
          subtitle={retention.storageAvailable
            ? 'Off by default. Every analysis needs a fresh photo unless this is on.'
            : 'Unavailable on this version — no photograph is ever kept.'}
          right={(
            <Switch
              value={retention.reuseOn}
              disabled={!retention.reuseEnabled}
              onValueChange={(next) => update.mutate({ photoReuseConsent: next })}
              accessibilityLabel="Reuse my photo for new analyses"
              accessibilityHint={retention.reuseEnabled ? undefined
                : 'Unavailable because no photograph is stored'}
              trackColor={{ true: colors.sage, false: colors.surfaceAlt }}
            />
          )}
        />
        <ListRow title="Photographs, consent and your data" onPress={() => router.push('/settings/privacy' as never)} />
        <ListRow title="Manage analyses" onPress={() => router.push('/(tabs)/results' as never)} last />
      </ListGroup>
      <Card variant="outlined" style={styles.notice}>
        <Txt variant="bodySm" tone="muted">
          MyLookFit does not request body photographs, does not infer ethnicity, nationality or any
          other personal attribute from a photo, and does not score appearance.
        </Txt>
      </Card>

      {/* ------------------------------------------------------------ help/legal */}
      <ListGroup label="Help">
        <ListRow title="Photo guidelines and FAQ" onPress={() => router.push('/settings/help' as never)} last />
      </ListGroup>
      <ListGroup label="Legal">
        <ListRow title="Privacy policy" onPress={() => router.push('/settings/legal?doc=privacy' as never)} />
        <ListRow title="Terms of service" onPress={() => router.push('/settings/legal?doc=terms' as never)} last />
      </ListGroup>

      {update.isError ? (
        <ErrorState message="That change did not save. It is still applied on this device." />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: SPACE.xl },
  notice: { marginBottom: SPACE.xl },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.lg,
  },
});
