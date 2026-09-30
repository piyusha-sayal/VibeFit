import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Chip, SectionHeader, Txt } from '../../components/ds';
import { FaceFigure } from '../../components/visual';
import { AGE_RANGES, PRESENTATION_OPTIONS } from '../../constants/onboarding';
import { usePersona } from '../../hooks/usePersona';
import { PressScale } from '../../components/ds/PressScale';
import { RADIUS, SPACE } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useBiometricLock } from '../../hooks/useBiometricLock';
import { useProgress } from '../../hooks/useProgress';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import { success } from '../../utils/haptics';

const LINKS = [
  { emoji: '✏️', label: 'Name and password', route: '/settings/account' },
  { emoji: '🌈', label: 'Vibe profile', route: '/vibe-profile' },
  { emoji: '🗓️', label: 'Action plan', route: '/plan' },
  { emoji: '📖', label: 'Beauty guides', route: '/academy' },
  { emoji: '🧰', label: 'All tools', route: '/(tabs)/more' },
  { emoji: '⚙️', label: 'Settings and privacy', route: '/settings' },
  { emoji: '🛟', label: 'Help', route: '/settings/help' },
] as const;

/** Who you are, how the app unlocks, and everything account-shaped. */
export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();
  const lock = useBiometricLock();
  const { level, game } = useProgress();
  const persona = usePersona();

  const name = user?.name?.trim() || 'Guest';
  const initial = name.charAt(0).toUpperCase();

  const toggleLock = async (next: boolean) => {
    if (await lock.toggle(next)) success();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + SPACE.xl }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ------------------------------------------------------ header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.goldSoft, borderColor: colors.gold }]}>
          <Txt variant="display" serif>{initial}</Txt>
        </View>
        <Txt variant="title" serif style={{ marginTop: SPACE.md }}>{name}</Txt>
        <Txt variant="bodySm" tone="muted">{user?.email ?? 'Guest session'}</Txt>
        <View style={styles.chips}>
          <View style={[styles.chip, { backgroundColor: colors.goldSoft }]}>
            <Txt variant="caption" weight="semibold">⭐ Level {level.level} · {level.title}</Txt>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.peachSoft }]}>
            <Txt variant="caption" weight="semibold">🔥 {game.streak.count} day streak</Txt>
          </View>
        </View>
      </View>

      {/* --------------------------------------------------- about you */}
      <View style={styles.section}>
        <SectionHeader title="About you" />
        <Card>
          <Txt variant="bodySm" tone="muted">Show me styles for</Txt>
          <View style={styles.personaRow}>
            {PRESENTATION_OPTIONS.map((option) => {
              const selected = persona.genderPresentation === option.value;
              return (
                <PressScale
                  key={option.value}
                  onPress={() => { void persona.update({ genderPresentation: selected ? null : option.value }); }}
                  accessibilityLabel={`${option.label}${selected ? ', selected' : ''}`}
                  containerStyle={{ flex: 1 }}
                  style={[styles.personaCard, {
                    borderColor: selected ? colors.gold : colors.border,
                    backgroundColor: selected ? colors.goldSoft : 'transparent',
                  }]}
                >
                  <FaceFigure
                presentation={option.value === 'masculine' ? 'male' : 'female'}
                hairLength={option.value === 'masculine' ? 'short' : 'long'}
                hairTexture={option.value === 'masculine' ? 'straight' : 'wavy'}
                seed={option.value}
                size={56}
                label={option.label}
              />
                  <Txt variant="bodySm" weight="semibold">{selected ? '✓ ' : ''}{option.label}</Txt>
                </PressScale>
              );
            })}
          </View>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.lg }}>Age</Txt>
          <View style={styles.ageRow}>
            {AGE_RANGES.map((range) => (
              <Chip
                key={range}
                label={range}
                accent="lavender"
                selected={persona.ageRange === range}
                onPress={() => { void persona.update({ ageRange: persona.ageRange === range ? null : range }); }}
              />
            ))}
          </View>
        </Card>
      </View>

      {/* ------------------------------------------------------ unlock */}
      <View style={styles.section}>
        <SectionHeader title="Security" />
        <Card>
          <View style={styles.row}>
            <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">🔐</Text>
            <View style={{ flex: 1 }}>
              <Txt variant="body" weight="semibold">Unlock with {lock.label}</Txt>
              <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {lock.capability && !lock.capability.available
                  ? lock.capability.reason
                  : 'Ask for your fingerprint or face each time the app opens.'}
              </Txt>
            </View>
            <Switch
              value={lock.enabled}
              onValueChange={(next) => { void toggleLock(next); }}
              disabled={!lock.capability?.available || lock.busy || !user}
              accessibilityLabel={`Unlock with ${lock.label}`}
              trackColor={{ true: colors.gold, false: colors.border }}
            />
          </View>
          {lock.error ? (
            <Txt variant="caption" tone="danger" live="polite" style={{ marginTop: SPACE.sm }}>{lock.error}</Txt>
          ) : null}
        </Card>
      </View>

      {/* ------------------------------------------------------- links */}
      <View style={styles.section}>
        <SectionHeader title="Your account" />
        <Card style={{ paddingVertical: SPACE.xs }}>
          {LINKS.map((link, i) => (
            <PressScale
              key={link.route}
              onPress={() => router.push(link.route as never)}
              accessibilityLabel={link.label}
              scaleTo={0.98}
            >
              <View style={[styles.linkRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
                <Text style={styles.linkEmoji} accessibilityElementsHidden importantForAccessibility="no">{link.emoji}</Text>
                <Txt variant="body" style={{ flex: 1 }}>{link.label}</Txt>
                <Txt variant="body" tone="subtle">›</Txt>
              </View>
            </PressScale>
          ))}
        </Card>
      </View>

      <Button
        label="Sign out"
        variant="secondary"
        style={{ marginTop: SPACE.xxl }}
        onPress={() =>
          Alert.alert('Sign out?', 'Your saved looks and analyses stay on your account.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: () => { void logout(); } },
          ])
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SPACE.xl, paddingBottom: SPACE.xxxl },
  header: { alignItems: 'center' },
  avatar: {
    width: 88, height: 88, borderRadius: RADIUS.pill, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACE.sm, marginTop: SPACE.md },
  chip: { paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs, borderRadius: RADIUS.pill },
  section: { marginTop: SPACE.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  personaRow: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm },
  personaCard: {
    alignItems: 'center', borderWidth: 2, borderRadius: RADIUS.lg, paddingVertical: SPACE.sm,
  },
  ageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.sm },
  emoji: { fontSize: 26 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 52 },
  linkEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
});
