/**
 * Five screens, in the order a consultation would take them.
 *
 * Welcome, what you want to explore, what your style feels like, anything else
 * you want to tell us, and where to start. Nothing here is required: every
 * screen after the first can be skipped, and skipping stores nothing rather
 * than storing a guess.
 *
 * The older eight-step questionnaire's detailed questions — budget, upkeep,
 * routine, hair treatments, allergies — are not deleted. They moved to the
 * experiences that use them, which is where someone can answer them knowing
 * what the answer is for. Anything already saved is still read and preserved.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Chip, Txt } from '../../components/ds';
import { Logo } from '../../components/ds/Logo';
import { EXPERIENCES } from '../../constants/experiences';
import {
  EVERYTHING, INTERESTS, OCCASIONS, REGIONS, STYLE_CHOICES, UNSURE,
  applyInterest, applyStyle, isEverythingSelected, recommendedStart,
} from '../../constants/onboarding';
import { MIN_TOUCH, SPACE } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useTheme } from '../../theme/ThemeProvider';

const STEPS = ['Welcome', 'Interests', 'Style', 'About you', 'Start'] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const draft = useOnboardingStore((s) => s.draft);
  const saveDraft = useOnboardingStore((s) => s.saveDraft);
  const complete = useOnboardingStore((s) => s.complete);

  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>([]);
  const [styles_, setStyles] = useState<string[]>([]);
  const [region, setRegion] = useState<string | null>(null);
  const [occasions, setOccasions] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Someone who left half way through comes back to what they had chosen.
  useEffect(() => {
    if (draft.areasOfInterest) setInterests(draft.areasOfInterest);
    if (draft.stylePreferences) setStyles(draft.stylePreferences);
    if (draft.market) setRegion(draft.market);
    if (draft.skippedFields) setSkipped(draft.skippedFields);
  }, [draft]);

  const recommendation = useMemo(() => recommendedStart(interests), [interests]);
  const firstExperience = EXPERIENCES.find((e) => e.key === recommendation?.experienceKey);

  const remember = (field: string, isSkip: boolean) => {
    // A skipped field is recorded as skipped, never as an answer.
    const next = isSkip
      ? [...new Set([...skipped, field])]
      : skipped.filter((f) => f !== field);
    setSkipped(next);
    return next;
  };

  const go = (to: number, skippedNow = skipped) => {
    void saveDraft({
      areasOfInterest: interests.length ? interests : null,
      stylePreferences: styles_.length ? styles_ : null,
      market: region,
      skippedFields: skippedNow.length ? skippedNow : null,
    });
    setStep(to);
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    const ok = await complete({
      areasOfInterest: interests.length ? interests : null,
      stylePreferences: styles_.length ? styles_ : null,
      market: region,
      // Occasions live with the style answers; there is no second store.
      keepUsingItems: draft.keepUsingItems ?? null,
      skippedFields: skipped.length ? skipped : null,
    });
    setSaving(false);
    if (!ok) {
      setError('We could not save that. You can try again, or explore now and '
        + 'set your preferences later in Settings.');
      return;
    }
    router.replace(firstExperience ? (firstExperience.route as never) : ('/(tabs)' as never));
  };

  const exploreAnyway = () => router.replace('/(tabs)' as never);

  return (
    <View style={[stylesheet.root, { backgroundColor: colors.bg }]}>
      <Progress step={step} />

      <ScrollView
        style={stylesheet.body}
        contentContainerStyle={stylesheet.bodyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 ? (
          <Welcome name={user?.name} />
        ) : step === 1 ? (
          <Interests selected={interests} onToggle={(v) => setInterests(applyInterest(interests, v))} />
        ) : step === 2 ? (
          <Style selected={styles_} onToggle={(v) => setStyles(applyStyle(styles_, v))} />
        ) : step === 3 ? (
          <About
            region={region}
            occasions={occasions}
            onRegion={(v) => setRegion(region === v ? null : v)}
            onOccasion={(v) => setOccasions(
              occasions.includes(v) ? occasions.filter((o) => o !== v) : [...occasions, v],
            )}
          />
        ) : (
          <Journey recommendation={recommendation} firstTitle={firstExperience?.title} />
        )}
      </ScrollView>

      {error ? (
        <Card variant="outlined" style={{ marginBottom: SPACE.md }}>
          <Txt variant="bodySm" tone="muted">{error}</Txt>
          <Button label="Explore anyway" variant="ghost" onPress={exploreAnyway}
                  style={{ marginTop: SPACE.sm }} />
        </Card>
      ) : null}

      <View style={stylesheet.actions}>
        <Button
          label={step === 0 ? 'Get Started'
            : step === STEPS.length - 1 ? 'Explore MyLookFit' : 'Continue'}
          loading={saving}
          onPress={() => (step === STEPS.length - 1 ? void finish() : go(step + 1))}
        />
        <View style={stylesheet.minor}>
          {step > 0 ? (
            <Button label="Back" variant="ghost" onPress={() => go(step - 1)} />
          ) : <View />}
          {step > 0 && step < STEPS.length - 1 ? (
            <Button
              label="Skip"
              variant="ghost"
              accessibilityHint="Moves on without saving an answer for this step"
              onPress={() => go(step + 1, remember(STEPS[step], true))}
            />
          ) : <View />}
        </View>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ screens

function Welcome({ name }: { name?: string }) {
  return (
    <View style={stylesheet.centred}>
      <Logo variant="horizontal" width={240} showTagline={false} />
      <Txt variant="display" serif style={{ marginTop: SPACE.xxl, textAlign: 'center' }}>
        Find what fits you.
      </Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: SPACE.md, textAlign: 'center' }}>
        Discover your colours, explore hairstyles and makeup, and create looks
        that reflect your personal style.
      </Txt>
      {name ? (
        <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xl }}>
          Welcome, {name}. This takes about a minute, and you can skip any of it.
        </Txt>
      ) : null}
    </View>
  );
}

function Interests({ selected, onToggle }: {
  selected: string[]; onToggle: (value: string) => void;
}) {
  return (
    <View>
      <Txt variant="display" serif>What would you like to explore?</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.sm }}>
        Pick as many as you like. This decides what we show you first — never
        what you can reach.
      </Txt>
      <View style={stylesheet.cards}>
        {INTERESTS.map((interest) => (
          <SelectCard
            key={interest.value}
            label={interest.label}
            blurb={interest.blurb}
            selected={selected.includes(interest.value)}
            onPress={() => onToggle(interest.value)}
          />
        ))}
        <SelectCard
          label="Everything"
          blurb="Show me all of it"
          selected={isEverythingSelected(selected)}
          onPress={() => onToggle(EVERYTHING)}
        />
      </View>
    </View>
  );
}

function Style({ selected, onToggle }: {
  selected: string[]; onToggle: (value: string) => void;
}) {
  return (
    <View>
      <Txt variant="display" serif>What feels like your style?</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.sm }}>
        More than one is normal, and you can change this any time.
      </Txt>
      <View style={stylesheet.chips}>
        {STYLE_CHOICES.map((choice) => (
          <Chip
            key={choice}
            label={choice}
            accent="gold"
            selected={selected.includes(choice)}
            onPress={() => onToggle(choice)}
          />
        ))}
        <Chip
          label={UNSURE}
          accent="lavender"
          selected={selected.includes(UNSURE)}
          onPress={() => onToggle(UNSURE)}
        />
      </View>
    </View>
  );
}

function About({ region, occasions, onRegion, onOccasion }: {
  region: string | null;
  occasions: string[];
  onRegion: (value: string) => void;
  onOccasion: (value: string) => void;
}) {
  return (
    <View>
      <Txt variant="display" serif>Anything else?</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.sm }}>
        All optional. Every category stays available wherever you are — this
        only changes what we put first.
      </Txt>

      <Txt variant="body" style={{ marginTop: SPACE.xl }}>Where are you?</Txt>
      <View style={stylesheet.chips}>
        {REGIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            accent="sage"
            selected={region === option.value}
            onPress={() => onRegion(option.value)}
          />
        ))}
      </View>

      <Txt variant="body" style={{ marginTop: SPACE.xl }}>What are you dressing for?</Txt>
      <View style={stylesheet.chips}>
        {OCCASIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            accent="peach"
            selected={occasions.includes(option.value)}
            onPress={() => onOccasion(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

function Journey({ recommendation, firstTitle }: {
  recommendation: { reason: string } | null; firstTitle?: string;
}) {
  return (
    <View>
      <Txt variant="display" serif>Your Style Journey Starts Here.</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.sm }}>
        {recommendation && firstTitle
          ? `${recommendation.reason}, so we will start you with ${firstTitle}.`
          : 'Five places to begin. Any of them is a good first one.'}
      </Txt>

      <View style={{ marginTop: SPACE.xl }}>
        {EXPERIENCES.map((experience) => (
          <Card key={experience.key} variant="outlined" style={{ marginBottom: SPACE.md }}>
            <Txt variant="caption" tone="subtle">{experience.eyebrow}</Txt>
            <Txt variant="body" style={{ marginTop: 2 }}>{experience.title}</Txt>
            <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.xs }}>
              {experience.body}
            </Txt>
          </Card>
        ))}
      </View>
    </View>
  );
}

// ------------------------------------------------------------------- pieces

function SelectCard({ label, blurb, selected, onPress }: {
  label: string; blurb: string; selected: boolean; onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Card
      onPress={onPress}
      variant={selected ? 'plain' : 'outlined'}
      accessibilityLabel={`${label}. ${blurb}`}
      style={{
        marginBottom: SPACE.md,
        minHeight: MIN_TOUCH,
        borderColor: selected ? colors.text : colors.border,
        borderWidth: selected ? 2 : StyleSheet.hairlineWidth * 2,
      }}
    >
      <View style={stylesheet.cardRow}>
        <View style={{ flex: 1 }}>
          <Txt variant="body">{label}</Txt>
          <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>{blurb}</Txt>
        </View>
        {/* A mark, not only a border: selection must not be colour alone. */}
        <Txt variant="body" style={{ opacity: selected ? 1 : 0.25 }}>
          {selected ? '✓' : '○'}
        </Txt>
      </View>
    </Card>
  );
}

function Progress({ step }: { step: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={stylesheet.progress}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
    >
      {STEPS.map((name, index) => (
        <View
          key={name}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            backgroundColor: index <= step ? colors.gold : colors.border,
          }}
        />
      ))}
    </View>
  );
}

const stylesheet = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xl },
  progress: { flexDirection: 'row', gap: SPACE.xs, marginBottom: SPACE.xl },
  body: { flex: 1 },
  bodyContent: { flexGrow: 1, paddingBottom: SPACE.xl },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cards: { marginTop: SPACE.xl },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.md },
  actions: { gap: SPACE.sm },
  minor: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
