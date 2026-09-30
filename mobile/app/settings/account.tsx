import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, PageHeader, SectionHeader, Txt } from '../../components/ds';
import { RADIUS, SPACE } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/authStore';
import { MAX_NAME_LENGTH, updateAccountName } from '../../services/accountService';
import { MIN_PASSWORD_LENGTH, canChangePassword, changePassword } from '../../services/authService';

type Notice = { tone: 'success' | 'danger'; text: string } | null;

/** Your name and, for email accounts, your password. */
export default function AccountScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const hasPassword = canChangePassword();

  const [name, setName] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameNotice, setNameNotice] = useState<Notice>(null);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmNext, setConfirmNext] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);

  const inputStyle = [styles.input, {
    borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt,
  }];

  const saveName = async () => {
    setSavingName(true);
    setNameNotice(null);
    const res = await updateAccountName(name);
    setSavingName(false);
    if (!res.success || !res.data) {
      setNameNotice({ tone: 'danger', text: res.error ?? 'Could not save your name. Please try again.' });
      return;
    }
    if (user) useAuthStore.setState({ user: { ...user, name: res.data } });
    setNameNotice({ tone: 'success', text: 'Name saved.' });
  };

  const savePassword = async () => {
    setPasswordNotice(null);
    if (next !== confirmNext) {
      setPasswordNotice({ tone: 'danger', text: 'The new passwords do not match.' });
      return;
    }
    setSavingPassword(true);
    const res = await changePassword(current, next);
    setSavingPassword(false);
    if (!res.success) {
      setPasswordNotice({ tone: 'danger', text: res.error ?? 'Could not change your password.' });
      return;
    }
    setCurrent('');
    setNext('');
    setConfirmNext('');
    setPasswordNotice({ tone: 'success', text: 'Password changed.' });
  };

  const notice = (n: Notice) => (n ? (
    <Txt variant="bodySm" tone={n.tone} live="polite" style={{ marginTop: SPACE.sm }}>{n.text}</Txt>
  ) : null);

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + SPACE.lg }]}
      keyboardShouldPersistTaps="handled"
    >
      <PageHeader
        title="Profile and password"
        subtitle={user?.email ? `Signed in as ${user.email}` : 'Guest session'}
      />

      <View style={styles.section}>
        <SectionHeader title="Your name" />
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={MAX_NAME_LENGTH}
          autoCapitalize="words"
          placeholder="Your name"
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel="Your name"
          style={inputStyle}
        />
        <Button
          label="Save name"
          loading={savingName}
          disabled={!name.trim() || name.trim() === user?.name}
          style={{ marginTop: SPACE.md }}
          onPress={() => { void saveName(); }}
        />
        {notice(nameNotice)}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Password" />
        {hasPassword ? (
          <>
            <TextInput
              value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none"
              placeholder="Current password" placeholderTextColor={colors.textSubtle}
              accessibilityLabel="Current password" style={inputStyle}
            />
            <TextInput
              value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none"
              placeholder={`New password (at least ${MIN_PASSWORD_LENGTH} characters)`}
              placeholderTextColor={colors.textSubtle}
              accessibilityLabel="New password" style={inputStyle}
            />
            <TextInput
              value={confirmNext} onChangeText={setConfirmNext} secureTextEntry autoCapitalize="none"
              placeholder="Repeat new password" placeholderTextColor={colors.textSubtle}
              accessibilityLabel="Repeat new password" style={inputStyle}
            />
            <Button
              label="Change password"
              variant="secondary"
              loading={savingPassword}
              disabled={!current || !next || !confirmNext}
              style={{ marginTop: SPACE.md }}
              onPress={() => { void savePassword(); }}
            />
            {notice(passwordNotice)}
          </>
        ) : (
          <Card variant="outlined">
            <Txt variant="bodySm" tone="muted">
              {user?.email
                ? 'You sign in with Google, so there is no MyLookFit password to change. Manage it in your Google account.'
                : 'Guest sessions have no password. Create an account to keep your passport.'}
            </Txt>
          </Card>
        )}
      </View>

      <Button label="Done" variant="ghost" style={{ marginTop: SPACE.xl }} onPress={() => router.back()} />

      <View style={styles.section}>
        <SectionHeader title="Leaving" />
        <Button
          label="Delete account"
          variant="destructive"
          style={{ marginTop: SPACE.sm }}
          onPress={() => router.push('/settings/delete-account' as never)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl * 2 },
  section: { marginTop: SPACE.xxl },
  input: {
    minHeight: 48,
    marginTop: SPACE.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.lg,
  },
});
