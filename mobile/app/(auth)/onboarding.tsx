import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { GoldButton } from '../../components/ui/GoldButton';
import { Pill } from '../../components/ui/Pill';
import { C, GRADIENTS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { saveOnboarding } from '../../services/profileService';
import { OnboardingAnswers } from '../../types';

type Field = keyof OnboardingAnswers;

type Step =
  | { key: Field; kind: 'single'; title: string; subtitle?: string; options: { value: string; label: string }[]; required?: boolean }
  | { key: Field; kind: 'multi'; title: string; subtitle?: string; options: { value: string; label: string }[]; required?: boolean }
  | { key: Field; kind: 'text'; title: string; subtitle?: string; placeholder: string; required?: boolean }
  | { key: Field; kind: 'consent'; title: string; subtitle: string; then: { key: Field; options: { value: string; label: string }[] }; required?: boolean };

const STEPS: Step[] = [
  {
    key: 'primaryGoal', kind: 'single', required: true,
    title: 'What brings\nyou here?',
    subtitle: "We'll prioritize recommendations around this.",
    options: [
      { value: 'special_event', label: 'Prepping for an event' },
      { value: 'everyday_refresh', label: 'Everyday style refresh' },
      { value: 'new_look', label: 'Trying a new look' },
      { value: 'routine_help', label: 'Better skin/hair routine' },
      { value: 'just_curious', label: 'Just curious what suits me' },
    ],
  },
  {
    key: 'areasOfInterest', kind: 'multi',
    title: 'What should\nwe focus on?',
    subtitle: 'Pick as many as you like — skip to cover everything.',
    options: [
      { value: 'face', label: 'Face' },
      { value: 'color', label: 'Color' },
      { value: 'skin', label: 'Skin' },
      { value: 'hair', label: 'Hair' },
      { value: 'body', label: 'Body' },
    ],
  },
  {
    key: 'budgetRange', kind: 'single',
    title: 'Budget for\nproducts?',
    options: [
      { value: 'low', label: 'Keep it minimal' },
      { value: 'medium', label: 'Moderate' },
      { value: 'high', label: 'Open to spend more' },
    ],
  },
  {
    key: 'maintenanceTolerance', kind: 'single',
    title: 'How much upkeep\nfeels right?',
    options: [
      { value: 'low', label: 'Low — quick and simple' },
      { value: 'medium', label: 'Some effort is fine' },
      { value: 'high', label: 'Happy to invest time' },
    ],
  },
  {
    key: 'timeAvailable', kind: 'single',
    title: 'Time for a\nroutine?',
    options: [
      { value: 'under_5', label: 'Under 5 min' },
      { value: '5_15', label: '5–15 min' },
      { value: '15_plus', label: '15+ min' },
    ],
  },
  {
    key: 'stylePreferences', kind: 'multi',
    title: 'Any style\npreferences?',
    options: [
      { value: 'minimal', label: 'Minimal' },
      { value: 'classic', label: 'Classic' },
      { value: 'trendy', label: 'Trendy' },
      { value: 'bold', label: 'Bold' },
      { value: 'soft', label: 'Soft/romantic' },
    ],
  },
  {
    key: 'hairTextureReported', kind: 'single',
    title: 'Hair texture?',
    options: [
      { value: 'straight', label: 'Straight' },
      { value: 'wavy', label: 'Wavy' },
      { value: 'curly', label: 'Curly' },
      { value: 'coily', label: 'Coily' },
    ],
  },
  {
    key: 'declaredAllergies', kind: 'text',
    title: 'Any allergies or\nsensitivities we\nshould know?',
    subtitle: "We ask so we never suggest something that could irritate you. Skip if none.",
    placeholder: 'e.g. fragrance, retinol, nickel',
  },
  {
    key: 'currentRoutine', kind: 'text',
    title: "What's your current\nroutine?",
    subtitle: "So we can build on what already works, not replace it.",
    placeholder: 'e.g. cleanser + moisturizer daily',
  },
  {
    key: 'climate', kind: 'consent',
    title: 'Share your\nclimate?',
    subtitle: 'Helps tailor skin/hair advice to humidity and sun exposure. Optional.',
    then: {
      key: 'climate',
      options: [
        { value: 'humid', label: 'Humid' },
        { value: 'dry', label: 'Dry' },
        { value: 'temperate', label: 'Temperate' },
        { value: 'cold', label: 'Cold' },
      ],
    },
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [skipped, setSkipped] = useState<string[]>([]);
  const [climateConsent, setClimateConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const setAnswer = (key: Field, value: unknown) => setAnswers((a) => ({ ...a, [key]: value }));

  const finish = async (finalAnswers: OnboardingAnswers, skippedFields: string[]) => {
    setSaving(true);
    await saveOnboarding({ ...finalAnswers, skippedFields });
    setSaving(false);
    router.replace('/plan');
  };

  const goNext = async (nextAnswers: OnboardingAnswers = answers, nextSkipped = skipped) => {
    if (isLast) {
      await finish(nextAnswers, nextSkipped);
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    if (current.kind === 'single' && current.required) return; // primary goal can't be skipped
    const nextSkipped = [...skipped, current.key];
    setSkipped(nextSkipped);
    goNext(answers, nextSkipped);
  };

  const handleContinue = () => goNext();

  const canContinue =
    current.kind !== 'single' || !current.required || Boolean(answers[current.key]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={GRADIENTS.hero} style={styles.container}>
        <View style={styles.top}>
          {step > 0 ? (
            <TouchableOpacity onPress={() => setStep((s) => s - 1)} activeOpacity={0.7} style={styles.backHit}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backHit} />
          )}
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>
          {(!current.required) ? (
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.backHit}>
              <Text style={[styles.skipText, styles.rightAlign]}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backHit} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View key={step} entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)}>
            <Text style={styles.title}>{current.title}</Text>
            {current.subtitle && <Text style={styles.subtitle}>{current.subtitle}</Text>}

            {current.kind === 'single' && (
              <View style={styles.pillWrap}>
                {current.options.map((o) => (
                  <Pill
                    key={o.value}
                    active={answers[current.key] === o.value}
                    onPress={() => setAnswer(current.key, o.value)}
                    style={styles.pillItem}
                  >
                    {o.label}
                  </Pill>
                ))}
              </View>
            )}

            {current.kind === 'multi' && (
              <View style={styles.pillWrap}>
                {current.options.map((o) => {
                  const list = (answers[current.key] as string[] | undefined) ?? [];
                  const active = list.includes(o.value);
                  return (
                    <Pill
                      key={o.value}
                      active={active}
                      onPress={() => setAnswer(
                        current.key,
                        active ? list.filter((v) => v !== o.value) : [...list, o.value],
                      )}
                      style={styles.pillItem}
                    >
                      {o.label}
                    </Pill>
                  );
                })}
              </View>
            )}

            {current.kind === 'text' && (
              <TextInput
                style={styles.input}
                placeholder={current.placeholder}
                placeholderTextColor={C.textSubtle}
                value={(answers[current.key] as string) ?? ''}
                onChangeText={(t) => setAnswer(current.key, current.key === 'declaredAllergies' ? t.split(',').map((s) => s.trim()).filter(Boolean) : t)}
                multiline
              />
            )}

            {current.kind === 'consent' && (
              <View>
                <GoldButton
                  label={climateConsent ? 'Sharing climate' : 'Share my climate'}
                  variant={climateConsent ? 'primary' : 'outline'}
                  onPress={() => {
                    setClimateConsent(true);
                    setAnswer('climateConsent', true);
                  }}
                  style={{ marginBottom: 16 }}
                />
                {climateConsent && (
                  <View style={styles.pillWrap}>
                    {current.then.options.map((o) => (
                      <Pill
                        key={o.value}
                        active={answers.climate === o.value}
                        onPress={() => setAnswer('climate', o.value)}
                        style={styles.pillItem}
                      >
                        {o.label}
                      </Pill>
                    ))}
                  </View>
                )}
              </View>
            )}
          </Animated.View>
        </ScrollView>

        <View style={styles.actions}>
          <GoldButton
            label={isLast ? "Let's Start" : 'Continue'}
            onPress={handleContinue}
            loading={saving}
            disabled={!canContinue}
            style={styles.btn}
          />
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 28 },
  backHit: { width: 56 },
  backText: { fontFamily: FONTS.sansMedium, fontSize: 14, color: C.textMuted },
  skipText: { fontFamily: FONTS.sansMedium, fontSize: 14, color: C.textMuted },
  rightAlign: { textAlign: 'right' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  title: { fontFamily: FONTS.serif, fontSize: 36, color: C.text, lineHeight: 42, marginBottom: 10 },
  subtitle: { fontFamily: FONTS.sans, fontSize: 14, color: C.textMuted, lineHeight: 20, marginBottom: 22 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 8 },
  pillItem: { paddingVertical: 10, paddingHorizontal: 16 },
  input: {
    fontFamily: FONTS.sans, fontSize: 15, color: C.text, backgroundColor: C.surface,
    borderWidth: 0.5, borderColor: C.white08, borderRadius: 14, padding: 16, minHeight: 90,
    textAlignVertical: 'top', marginTop: 8,
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.textSubtle },
  dotActive: { width: 20, backgroundColor: C.gold },
  actions: { padding: 28, paddingBottom: 40 },
  btn: { width: '100%' },
});
