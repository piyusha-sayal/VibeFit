import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { GoldButton } from '../../components/ui/GoldButton';
import { GoogleButton } from '../../components/ui/GoogleButton';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { useLegacyTheme, type LegacyPalette } from '../../theme/legacy';
import { isGuestLoginEnabled } from '../../constants/flags';
import { FONTS } from '../../constants/fonts';
import { Logo } from '../../components/ds/Logo';

export default function LoginScreen() {
  const { C, GRADIENTS } = useLegacyTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { login, loginAsGuest, isLoading, error, clearError } = useAuth();
  const { signInWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    clearError();
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    try {
      await login(email.trim().toLowerCase(), password);
    } catch {
      // error shown via store
    }
  };

  const handleGuestLogin = async () => {
    clearError();
    try {
      await loginAsGuest();
    } catch {
      // error shown via store
    }
  };

  return (
    <LinearGradient colors={GRADIENTS.heroAlt} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* The supplied brand lockup, at its own aspect ratio. */}
          <View style={styles.logoRow}>
            <Logo variant="horizontal" width={240} showTagline />
          </View>

          <Text style={styles.headline}>Welcome back</Text>
          <Text style={styles.sub}>Sign in to your style profile</Text>

          {(error || googleError) ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error || googleError}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
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
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <PasswordInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
              />
            </View>

            <GoldButton
              label="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              style={styles.btn}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleButton onPress={signInWithGoogle} loading={googleLoading} />

            {isGuestLoginEnabled ? (
              <GoldButton
                label="Continue as guest"
                variant="outline"
                onPress={handleGuestLogin}
                loading={isLoading}
              />
            ) : null}

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>New to MyLookFit? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.registerLink}>Create account</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const makeStyles = (C: LegacyPalette) => StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 28, paddingTop: 80, flexGrow: 1 },
  logoRow: { alignItems: 'center', marginBottom: 40 },
  brand: { fontFamily: FONTS.serif, fontSize: 28, color: C.gold },
  brandLogo: { width: 160, height: 48, marginVertical: 4 },
  headline: { fontFamily: FONTS.serif, fontSize: 36, color: C.text, marginBottom: 8 },
  sub: { fontFamily: FONTS.sans, fontSize: 15, color: C.textMuted, marginBottom: 32 },
  errorBox: { backgroundColor: C.redDim, borderWidth: 0.5, borderColor: C.redBorder, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontFamily: FONTS.sans, fontSize: 13, color: C.red },
  form: { gap: 16 },
  field: { gap: 8 },
  label: { fontFamily: FONTS.sansBold, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: C.textMuted },
  input: {
    backgroundColor: C.surface2, borderWidth: 0.5, borderColor: C.white08,
    borderRadius: 12, padding: 14, fontFamily: FONTS.sans, fontSize: 15, color: C.text,
  },
  btn: { marginTop: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: C.white08 },
  dividerText: { fontFamily: FONTS.sansBold, fontSize: 11, color: C.textSubtle, letterSpacing: 1.2 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  registerText: { fontFamily: FONTS.sans, fontSize: 14, color: C.textMuted },
  registerLink: { fontFamily: FONTS.sansSemiBold, fontSize: 14, color: C.gold },
});
