import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Chip, EmptyState, Hero, LoadingState, SectionHeader, Swatch, Txt } from '../../components/ds';
import { RADIUS, SPACE } from '../../constants/theme';
import { useColorReport, usePassport } from '../../hooks/useBeauty';
import { useDrafts } from '../../hooks/useLook';
import { LookSwatches } from '../../components/look';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { useTheme } from '../../theme/ThemeProvider';
import { EXPERIENCES, OCCASIONS, tipOfTheDay } from '../../constants/experiences';
import { localDay } from '../../constants/gamification';
import { recommendedStart } from '../../constants/onboarding';
import { useOnboardingStore } from '../../store/onboardingStore';
import { ACADEMY_GUIDES } from '../../constants/academy';
import { INSPIRATION } from '../../constants/inspiration';
import { PressScale } from '../../components/ds/PressScale';
import { ProgressRing } from '../../components/ds/ProgressRing';
import { BiometricOffer } from '../../components/home/BiometricOffer';
import { CoreExperiences } from '../../components/home/CoreExperiences';
import { SecondaryTools } from '../../components/home/SecondaryTools';
import { PassportSnapshot } from '../../components/home/PassportSnapshot';
import { useProgress } from '../../hooks/useProgress';
import { WakingBanner } from '../../components/ds/WakingBanner';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const passport = usePassport();
  const { level, game } = useProgress();
  const report = useColorReport();
  const drafts = useDrafts();
  const lastQuizDay = useGameStore((s) => s.lastQuizDay);
  // Onboarding interests order this list; nothing is ever removed from it, so
  // every experience stays one tap away whatever was or was not answered.
  const interests = useOnboardingStore((s) => s.interests);
  const provisional = useOnboardingStore((s) => s.provisional);
  const resolveOnboarding = useOnboardingStore((s) => s.resolve);
  const userId = user?.id;

  // Home was reached on a fallback because the network could not answer. Ask
  // once more now that the app is running; the answer may be "you never
  // finished onboarding", and it should not wait for the next cold start.
  React.useEffect(() => {
    if (provisional && userId) void resolveOnboarding(userId);
  }, [provisional, userId, resolveOnboarding]);

  // A first-timer who said they came for fashion should not be sent to a face
  // scan. The onboarding answer is the only thing we actually know yet.
  const firstStep = useMemo(() => {
    const pick = recommendedStart(interests);
    return EXPERIENCES.find((e) => e.key === pick?.experienceKey) ?? null;
  }, [interests]);

  const firstName = (user?.name ?? '').trim().split(' ')[0];
  const tip = useMemo(tipOfTheDay, []);
  const quizPlayedToday = lastQuizDay === localDay();

  const data = passport.data;
  const isNew = !data || data.completed === 0;

  // A. One line grounded in what is actually known, never a guess.
  const supportingLine = useMemo(() => {
    const season = data?.attributes.find((a) => a.key === 'personal_colour' && a.status === 'present')?.value;
    if (typeof season === 'string') return `Your ${season} palette is ready to explore.`;
    return 'Everything here comes from what you tell us — nothing is guessed.';
  }, [data]);

  // B. The one thing most worth doing right now.
  const heroAction = useMemo(() => {
    const colourDone = data?.attributes.find((a) => a.key === 'personal_colour')?.status === 'present';

    if (!colourDone) {
      if (isNew && firstStep) {
        return {
          eyebrow: 'Start here',
          title: firstStep.title,
          body: `You said you wanted to explore ${firstStep.eyebrow.toLowerCase()}. Start there.`,
          actionLabel: 'Start',
          route: firstStep.route,
        };
      }
      return {
        eyebrow: 'Start here',
        title: 'Discover your colours',
        body: 'One selfie unlocks your palette, undertone and more.',
        actionLabel: 'Scan now',
        route: '/(tabs)/scan',
      };
    }

    if (data?.nextAction) {
      return {
        eyebrow: 'Your next step',
        title: data.nextAction.label,
        body: `Passport ${Math.round(data.completion * 100)}% complete.`,
        actionLabel: 'Continue',
        route: data.nextAction.route,
      };
    }

    const draft = drafts.data?.drafts?.[0];
    if (draft) {
      return {
        eyebrow: 'Pick up where you left off',
        title: `Continue "${draft.name ?? 'your look'}"`,
        body: 'Your draft is saved and ready to finish.',
        actionLabel: 'Continue look',
        route: `/look/builder?draftId=${draft.id}`,
      };
    }

    return {
      eyebrow: 'Tonight',
      title: 'Create a look for tonight',
      body: 'Pick an occasion and let your passport do the styling.',
      actionLabel: 'Start a look',
      route: '/(tabs)/create',
    };
  }, [data, drafts.data, isNew, firstStep]);

  const recommendations = useMemo(() => {
    if (!data) return [];
    const by = Object.fromEntries(data.attributes.map((a) => [a.key, a]));
    const out: { title: string; body: string; route: string; accent: 'blush' | 'peach' | 'lavender' | 'sage' | 'gold' }[] = [];

    if (by.personal_colour?.status === 'present') {
      out.push({
        title: `Explore your ${by.personal_colour.value} palette`,
        body: 'The colours that sit well against your skin, ready to compare.',
        route: '/colors/palette',
        accent: 'blush',
      });
      out.push({
        title: 'Lipstick shades from your palette',
        body: 'Shades drawn from your season rather than a generic chart.',
        route: '/colors/lipstick',
        accent: 'peach',
      });
    }
    if (by.face_shape?.status === 'present') {
      out.push({
        title: `Hairstyles for a ${by.face_shape.value} face`,
        body: 'Cuts, lengths and partings that balance your proportions.',
        route: '/hair/cuts',
        accent: 'lavender',
      });
    }
    if (by.body_type?.status === 'present') {
      out.push({
        title: 'Silhouettes for your styling profile',
        body: 'Built from what you told us, never from a photograph.',
        route: '/style/body',
        accent: 'sage',
      });
    }
    // An incomplete profile gets the next real step instead of filler.
    if (out.length < 2 && data.nextAction) {
      out.push({
        title: data.nextAction.label,
        body: 'The quickest way to make everything else more personal.',
        route: data.nextAction.route,
        accent: 'gold',
      });
    }
    return out.slice(0, 4);
  }, [data]);

  const hasRecentWork = Boolean(
    (drafts.data?.drafts?.length ?? 0) > 0
    || (data?.recentLooks.length ?? 0) > 0
    || report.data
    || (data?.timeline.length ?? 0) > 0,
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ---------------------------------------------- A. greeting row */}
      <View style={[styles.header, { paddingTop: insets.top + SPACE.lg }]}>
        <View style={{ flex: 1 }}>
          <Txt variant="caption" tone="muted">{greeting()}</Txt>
          <Txt variant="title" serif numberOfLines={1} accessibilityRole="header">
            Hello{firstName ? `, ${firstName}` : ''}
          </Txt>
          <Txt variant="bodySm" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>{supportingLine}</Txt>
        </View>
        {/* Streak and level mean nothing on day one, so they wait for activity. */}
        {!isNew ? (
          <>
            <PressScale
              onPress={() => router.push('/(tabs)/progress' as never)}
              accessibilityLabel={`${game.streak.count} day streak. Open progress`}
              style={[styles.pill, { backgroundColor: colors.peachSoft }]}
            >
              <Txt variant="bodySm" weight="bold">🔥 {game.streak.count}</Txt>
            </PressScale>
            <PressScale
              onPress={() => router.push('/(tabs)/progress' as never)}
              accessibilityLabel={`Level ${level.level}. Open progress`}
            >
              <ProgressRing value={level.progress} size={44} stroke={4}>
                <Txt variant="caption" weight="bold">L{level.level}</Txt>
              </ProgressRing>
            </PressScale>
          </>
        ) : null}
      </View>

      <View style={styles.sectionTight}>
        <WakingBanner />
        {/* Home never waits on the passport: it shows now and fills in. */}
        {passport.isLoading ? <LoadingState label="Opening your passport…" /> : null}
      </View>

      {/* ---------------------------------------------------- B. hero */}
      {passport.isLoading ? null : (
        <View style={styles.sectionTight}>
          <Hero
            eyebrow={heroAction.eyebrow}
            title={heroAction.title}
            body={heroAction.body}
            actionLabel={heroAction.actionLabel}
            onAction={() => router.push(heroAction.route as never)}
          />
        </View>
      )}

      {/* New users learn what the app does before seeing any catalogue. */}
      {isNew ? (
        <View style={styles.section}>
          <EmptyState
            title="Nothing here is guessed"
            body="Every result you see comes from a scan you ran or a preference you set. Until then, sections stay empty on purpose."
          />
        </View>
      ) : null}
      {/* --------------------------------------------- C. passport snapshot */}
      {data ? (
        <View style={styles.sectionTight}>
          <PassportSnapshot attributes={data.attributes} />
        </View>
      ) : null}

      {/* --------------------------------------------- G. recent / continue */}
      {hasRecentWork ? (
        <View style={styles.section}>
          <SectionHeader
            title="Your recent work"
            action="Open studio"
            onAction={() => router.push('/(tabs)/create' as never)}
          />

          {/* Unfinished work first — it is the thing most likely to be wanted. */}
          {(drafts.data?.drafts ?? []).slice(0, 2).map((draft) => (
            <Card
              key={draft.id}
              variant="tinted"
              accent="peach"
              style={{ marginBottom: SPACE.sm }}
              onPress={() => router.push(`/look/builder?draftId=${draft.id}` as never)}
            >
              <Txt variant="overline" tone="muted">Continue</Txt>
              <Txt variant="body" weight="semibold">{draft.name ?? 'Unnamed look'}</Txt>
              <LookSwatches
                swatches={(draft.composition?.outfit?.pieces ?? [])
                  .map((piece) => piece.colour)
                  .filter(Boolean) as { hex: string; name: string }[]}
              />
            </Card>
          ))}

          <View style={styles.wrap}>
            {OCCASIONS.slice(0, 6).map((entry) => (
              <Chip
                key={entry.key}
                label={entry.label}
                accent="gold"
                onPress={() => router.push(`/look/new?occasion=${entry.key}` as never)}
              />
            ))}
          </View>

          {(data?.recentLooks ?? []).length ? (
            <View style={{ marginTop: SPACE.lg }}>
              {data!.recentLooks.slice(0, 2).map((look) => (
                <Card
                  key={look.id}
                  style={{ marginBottom: SPACE.sm }}
                  onPress={() => router.push(`/look/${look.id}` as never)}
                >
                  <Txt variant="overline" tone="muted">Recently saved</Txt>
                  <Txt variant="body" weight="semibold">{look.name}</Txt>
                  <LookSwatches swatches={look.swatches} />
                </Card>
              ))}
            </View>
          ) : null}

          {report.data ? (
            <Card style={{ marginTop: SPACE.lg }} onPress={() => router.push('/colors/report' as never)}>
              <Txt variant="overline" tone="muted">Your palette</Txt>
              <Txt variant="heading" serif style={{ marginTop: SPACE.xs }}>{report.data.label}</Txt>
              <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs, marginBottom: SPACE.lg }}>
                {report.data.summary}
              </Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {report.data.palettes.best.map((s) => (
                  <Swatch key={s.hex} hex={s.hex} name={s.name} size={52} />
                ))}
              </ScrollView>
            </Card>
          ) : null}

          {data && data.timeline.length ? (
            <>
              <Txt variant="overline" tone="muted" style={{ marginTop: SPACE.lg, marginBottom: SPACE.sm }}>
                Recent activity
              </Txt>
              {data.timeline.slice(0, 3).map((item) => (
                <Card key={item.id} style={{ marginBottom: SPACE.sm }}>
                  <Txt variant="bodySm">{item.summary}</Txt>
                  <Txt variant="caption" tone="subtle" style={{ marginTop: 2 }}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Txt>
                </Card>
              ))}
            </>
          ) : null}
        </View>
      ) : null}

      {/* ------------------------------------------- recommended for you */}
      {recommendations.length ? (
        <View style={styles.section}>
          <SectionHeader title="Recommended for you" />
          {recommendations.map((rec) => (
            <Card key={rec.title} onPress={() => router.push(rec.route as never)} style={{ marginBottom: SPACE.md }}>
              <Txt variant="heading" weight="semibold">{rec.title}</Txt>
              <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>{rec.body}</Txt>
            </Card>
          ))}
        </View>
      ) : null}

      {/* ---------------------------------------------- D. core experiences */}
      <View style={styles.section}>
        <SectionHeader title="Your core experiences" />
        <CoreExperiences />
      </View>

      {/* --------------------------------------------------- E. more tools */}
      <View style={styles.section}>
        <SectionHeader title="More to explore" />
        <SecondaryTools />
      </View>

      {/* ------------------------------------------- fingerprint offer */}
      <View style={styles.sectionTight}>
        <BiometricOffer />
      </View>

      {/* --------------------------------------------------- F. today */}
      <View style={styles.section}>
        <SectionHeader title="Today" />
        {quizPlayedToday ? (
          <Card variant="tinted" accent="sage">
            <Text style={styles.todayEmoji} accessibilityElementsHidden importantForAccessibility="no">💡</Text>
            <Txt variant="overline" tone="muted">Tip of the day</Txt>
            <Txt variant="bodySm" style={{ marginTop: SPACE.xs }}>{tip}</Txt>
          </Card>
        ) : (
          <Card
            variant="tinted"
            accent="gold"
            onPress={() => router.push('/(tabs)/progress' as never)}
            accessibilityLabel="Daily quiz. Open progress to play"
          >
            <Text style={styles.todayEmoji} accessibilityElementsHidden importantForAccessibility="no">🧠</Text>
            <Txt variant="overline" tone="muted">Daily quiz</Txt>
            <Txt variant="bodySm" weight="semibold" style={{ marginTop: SPACE.xs }}>
              3 quick questions. Earn points and badges.
            </Txt>
            <Txt variant="caption" tone="accent" weight="semibold" style={{ marginTop: SPACE.sm }}>Play →</Txt>
          </Card>
        )}
      </View>

      {/* --------------------------------------------------- inspiration */}
      <View style={styles.section}>
        <SectionHeader title="Beauty inspiration" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACE.md }}>
          {INSPIRATION.map((item) => (
            <Card key={item.title} variant="tinted" accent={item.accent} style={styles.inspoCard}>
              <View style={styles.inspoSwatches}>
                {item.palette.map((hex) => (
                  <View key={hex} style={[styles.inspoDot, { backgroundColor: hex }]} />
                ))}
              </View>
              <Txt variant="bodySm" weight="semibold" style={{ marginTop: SPACE.md }}>{item.title}</Txt>
              <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>{item.region}</Txt>
            </Card>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Beauty Academy" action="All guides" onAction={() => router.push('/academy' as never)} />
        {ACADEMY_GUIDES.slice(0, 3).map((guide) => (
          <Card key={guide.slug} onPress={() => router.push(`/academy/${guide.slug}` as never)} style={{ marginBottom: SPACE.sm }}>
            <Txt variant="bodySm" weight="semibold">{guide.title}</Txt>
            <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
              {guide.minutes} min · {guide.level}
            </Txt>
          </Card>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: SPACE.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.xl },
  pill: { paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, borderRadius: RADIUS.pill },
  sectionTight: { paddingHorizontal: SPACE.xl, marginTop: SPACE.lg },
  todayEmoji: { fontSize: 24, marginBottom: SPACE.xs },
  section: { paddingHorizontal: SPACE.xl, marginTop: SPACE.xxl },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.lg },
  inspoCard: { width: 190 },
  inspoSwatches: { flexDirection: 'row', gap: SPACE.xs },
  inspoDot: { width: 26, height: 42, borderRadius: RADIUS.sm },
});

function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
