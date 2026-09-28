import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GoldButton } from '../../components/ui/GoldButton';
import { useLegacyTheme, type LegacyPalette } from '../../theme/legacy';
import { FONTS } from '../../constants/fonts';
import { sendPasswordReset } from '../../services/authService';

/** Email a reset link. The confirmation reads the same whether or not the account exists. */
export default function ForgotPasswordScreen() {
  const { C, GRADIENTS } = useLegacyTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setError(null);
    setSending(true);
    const res = await sendPasswordReset(email);
    setSending(false);
    if (!res.success) {
      setError(res.error ?? 'Could not send the email. Please try again.');
      return;
    }
    setSent(true);
  };

  return (
    <LinearGradient colors={GRADIENTS.heroAlt} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.headline} accessibilityRole="header">Reset password</Text>

          {sent ? (
            <Text style={styles.sub} accessibilityLiveRegion="polite">
              If an account exists for {email.trim()}, we have sent a link to reset its password.
              Check your inbox and spam folder, then sign in with your new password.
            </Text>
          ) : (
            <>
              <Text style={styles.sub}>
                Enter the email you signed up with and we will send you a reset link.
              </Text>
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText} accessibilityLiveRegion="assertive">{error}</Text>
                </View>
              ) : null}
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={C.textSubtle}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Email"
                />
              </View>
              <GoldButton label="Send reset link" onPress={() => { void send(); }} loading={sending} style={styles.btn} />
            </>
          )}

          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" style={styles.back}>
            <Text style={styles.backText}>Back to sign in</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const makeStyles = (C: LegacyPalette) => StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 28, paddingTop: 100, flexGrow: 1 },
  headline: { fontFamily: FONTS.serif, fontSize: 36, color: C.text, marginBottom: 8 },
  sub: { fontFamily: FONTS.sans, fontSize: 15, color: C.textMuted, marginBottom: 24, lineHeight: 22 },
  errorBox: { backgroundColor: C.redDim, borderWidth: 0.5, borderColor: C.redBorder, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontFamily: FONTS.sans, fontSize: 13, color: C.red },
  field: { gap: 8 },
  label: { fontFamily: FONTS.sansBold, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: C.textMuted },
  input: {
    backgroundColor: C.surface2, borderWidth: 0.5, borderColor: C.white08,
    borderRadius: 12, padding: 14, fontFamily: FONTS.sans, fontSize: 15, color: C.text,
  },
  btn: { marginTop: 24 },
  back: { alignItems: 'center', marginTop: 24, minHeight: 48, justifyContent: 'center' },
  backText: { fontFamily: FONTS.sansSemiBold, fontSize: 14, color: C.gold },
});
