import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Chip, ErrorState, LoadingState, SectionHeader, Txt } from '../../components/ds';
import { RADIUS, SPACE } from '../../constants/theme';
import { useSettings, useUpdateSettings } from '../../hooks/useBeauty';
import { useAuthStore } from '../../store/authStore';
import { useTheme, ThemePreference } from '../../theme/ThemeProvider';

const THEMES: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, preference, setPreference, reducedMotion, setReducedMotion } = useTheme();
  const settings = useSettings();
  const update = useUpdateSettings();
  const user = useAuthStore((s) => s.user);
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
                Off by default. With it off, every analysis needs a fresh photo, which is never kept
                beyond the scan itself.
              </Txt>
            </View>
            <Switch
              value={!!settings.data?.photoReuseConsent}
              onValueChange={(next) => update.mutate({ photoReuseConsent: next })}
              accessibilityLabel="Reuse my photo"
              trackColor={{ true: colors.sage, false: colors.surfaceAlt }}
            />
          </View>
        </Card>
        <Card variant="outlined" style={{ marginTop: SPACE.md }}>
          <Txt variant="bodySm" tone="muted">
            VibeFit does not request body photographs, does not infer ethnicity, nationality or any
            other personal attribute from a photo, and does not score appearance.
          </Txt>
        </Card>
        <Button
          label="Manage analyses and photos"
          variant="secondary"
          style={{ marginTop: SPACE.md }}
          onPress={() => router.push('/(tabs)/results' as never)}
        />
      </View>

      {/* --------------------------------------------------------------- help */}
      <View style={styles.section}>
        <SectionHeader title="Help" />
        <Button label="Photo guidelines and FAQ" variant="secondary" onPress={() => router.push('/settings/help' as never)} />
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
