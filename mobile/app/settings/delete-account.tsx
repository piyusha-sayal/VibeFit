import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, SectionHeader, Txt } from '../../components/ds';
import { RADIUS, SPACE } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/authStore';
import { DELETE_CONFIRMATION, deleteAccount } from '../../services/privacyService';

/** Everything that goes. Listed plainly, because "your data" tells nobody anything. */
const GOES = [
  'Your profile and sign-in',
  'Every analysis and its results',
  'Any photograph still stored',
  'Saved looks, drafts and collections',
  'Beauty goals and your Beauty Journey',
  'Guide progress and preferences',
  'Feedback you have given on items',
];

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const logout = useAuthStore((s) => s.logout);

  const [phrase, setPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const phraseMatches = phrase.trim() === DELETE_CONFIRMATION;
  const ready = phraseMatches && password.length > 0;

  const confirm = () => {
    Alert.alert(
      'Delete your account?',
      'This cannot be undone. Everything listed on this screen goes.',
      [
        { text: 'Keep my account', style: 'cancel' },
        { text: 'Delete for ever', style: 'destructive', onPress: () => void run() },
      ],
    );
  };

  const run = async () => {
    setBusy(true);
    const response = await deleteAccount({ confirmation: phrase.trim(), password });
    setBusy(false);

    if (!response.success) {
      Alert.alert('Not deleted', response.error || 'Please check your password and try again.');
      return;
    }

    const { photographsAttempted = 0, photographsRemoved = 0 } = response.data ?? {};
    const photoNote =
      photographsAttempted > photographsRemoved
        ? `\n\n${photographsAttempted - photographsRemoved} stored photograph(s) could not be reached and will be removed by our cleanup. Everything else is gone.`
        : '';

    Alert.alert(
      'Your account is deleted',
      `Thank you for trying MyLookFit.${photoNote}`,
      [{ text: 'Close', onPress: () => { logout(); router.replace('/' as never); } }],
    );
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Delete account</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        This is permanent. Nothing here can be restored afterwards.
      </Txt>

      <View style={styles.section}>
        <SectionHeader title="What gets deleted" />
        <Card>
          {GOES.map((line) => (
            <Txt key={line} variant="bodySm" style={{ marginBottom: SPACE.xs }}>
              •  {line}
            </Txt>
          ))}
        </Card>
        <Card variant="outlined" style={{ marginTop: SPACE.md }}>
          <Txt variant="caption" tone="subtle">
            If you would rather keep your account and only remove your photographs, go back
            and use Privacy → Your photographs instead.
          </Txt>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Confirm" />
        <Txt variant="bodySm" tone="muted">
          Type {DELETE_CONFIRMATION} and enter your password.
        </Txt>
        <TextInput
          value={phrase}
          onChangeText={setPhrase}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={DELETE_CONFIRMATION}
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel={`Type ${DELETE_CONFIRMATION} to confirm`}
          style={[styles.input, {
            borderColor: phrase.length === 0 || phraseMatches ? colors.border : colors.danger,
            color: colors.text,
            backgroundColor: colors.surfaceAlt,
          }]}
        />
        {phrase.length > 0 && !phraseMatches ? (
          <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.xs }}>
            That does not match yet. It has to read exactly {DELETE_CONFIRMATION}.
          </Txt>
        ) : null}

        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Your password"
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel="Your password"
          style={[styles.input, {
            marginTop: SPACE.md,
            borderColor: colors.border,
            color: colors.text,
            backgroundColor: colors.surfaceAlt,
          }]}
        />

        <Button
          label="Delete my account"
          variant="secondary"
          disabled={!ready}
          loading={busy}
          style={{ marginTop: SPACE.xl }}
          onPress={confirm}
        />
        <Button
          label="Keep my account"
          variant="ghost"
          style={{ marginTop: SPACE.sm }}
          onPress={() => router.back()}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  section: { marginTop: SPACE.xxl },
  input: {
    minHeight: 48,
    marginTop: SPACE.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.lg,
  },
});
