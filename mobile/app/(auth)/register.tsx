import React, { useState } from 'react';
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
import { C, GRADIENTS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

export default function RegisterScreen() {
  const { register, isLoading, error, clearError } = useAuth();
  const { signInWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleRegister = async () => {
    clearError();
    if (!name.trim() || !email.trim() || !password || !confirm) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords differ', 'Please make sure your passwords match.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    try {
      await register(email.trim().toLowerCase(), password, name.trim());
    } catch {
      // error shown via store
    }
  };

  return (
    <LinearGradient colors={GRADIENTS.heroAlt} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.headline}>Create account</Text>
          <Text style={styles.sub}>Start your style journey</Text>

          {(error || googleError) ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error || googleError}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={C.textSubtle}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

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

            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password</Text>
              <PasswordInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
              />
            </View>

            <GoldButton label="Create Account" onPress={handleRegister} loading={isLoading} style={styles.btn} />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleButton onPress={signInWithGoogle} loading={googleLoading} />

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.loginLink}>Sign in</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 28, paddingTop: 80, flexGrow: 1 },
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
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  loginText: { fontFamily: FONTS.sans, fontSize: 14, color: C.textMuted },
  loginLink: { fontFamily: FONTS.sansSemiBold, fontSize: 14, color: C.gold },
});
