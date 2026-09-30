import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Chip, EmptyState, LoadingState, SectionHeader, Swatch, Txt } from '../../components/ds';
import { RADIUS, SPACE } from '../../constants/theme';
import { useColorReport, usePassport } from '../../hooks/useBeauty';
import { useDrafts } from '../../hooks/useLook';
import { LookSwatches } from '../../components/look';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import { EXPERIENCES, OCCASIONS, tipOfTheDay } from '../../constants/experiences';
import { recommendedStart } from '../../constants/onboarding';
import { useOnboardingStore } from '../../store/onboardingStore';
import { ACADEMY_GUIDES } from '../../constants/academy';
import { INSPIRATION } from '../../constants/inspiration';
import { PressScale } from '../../components/ds/PressScale';
import { ProgressRing } from '../../components/ds/ProgressRing';
import { BiometricOffer } from '../../components/home/BiometricOffer';
import { ToolGrid } from '../../components/home/ToolGrid';
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

  const recommendations = useMemo(() => {
    const data = passport.data;
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
        route: '/analysis/hair',
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
  }, [passport.data]);

  const data = passport.data;
  const isNew = !data || data.completed === 0;

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
          <Txt variant="title" serif numberOfLines={1}>Hi{firstName ? `, ${firstName}` : ''} 👋</Txt>
        </View>
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
      </View>

      <View style={styles.sectionTight}>
        <WakingBanner />
        {/* Home never waits on the passport: it shows now and fills in. */}
        {passport.isLoading ? <LoadingState label="Opening your passport…" /> : null}
      </View>

      {/* ---------------------------------------------------- B. hero */}
      {passport.isLoading ? null : (
      <View style={styles.sectionTight}>
        <LinearGradient
          colors={[colors.goldSoft, colors.blushSoft, colors.lavenderSoft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {isNew ? (
            <>
              <Txt variant="overline" tone="muted">Start here ✨</Txt>
              <Txt variant="title" serif style={{ marginTop: SPACE.xs }}>Discover your colours.</Txt>
              <Txt variant="title" serif>Define your style.</Txt>
              <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.sm, marginBottom: SPACE.lg }}>
                {firstStep
                  ? `You said you wanted to explore ${firstStep.eyebrow.toLowerCase()}. Start there.`
                  : 'One selfie unlocks your palette, face shape and more.'}
              </Txt>
              <Button
                label={firstStep ? firstStep.title : 'Start my analysis'}
                onPress={() => router.push((firstStep?.route ?? '/(tabs)/scan') as never)}
              />
            </>
          ) : (
            <>
              <Txt variant="overline" tone="muted">Your next step</Txt>
              <Txt variant="title" serif style={{ marginTop: SPACE.xs }}>
                {data?.nextAction ? data.nextAction.label : 'Your passport is complete 🎉'}
              </Txt>
              <View style={styles.heroRow}>
                <Txt variant="bodySm" tone="muted" style={{ flex: 1 }}>
                  Passport {Math.round((data?.completion ?? 0) * 100)}% complete
                </Txt>
                <Button
                  label={data?.nextAction ? 'Go' : 'Create a look'}
                  onPress={() => router.push((data?.nextAction?.route ?? '/(tabs)/create') as never)}
                />
              </View>
            </>
          )}
        </LinearGradient>
      </View>
      )}

      {/* ------------------------------------------- C. fingerprint offer */}
      <View style={styles.sectionTight}>
        <BiometricOffer />
      </View>

      {/* --------------------------------------------------- D. tools */}
      <View style={styles.section}>
        <SectionHeader title="Your tools" />
        <ToolGrid />
      </View>

      {/* --------------------------------------------------- E. today */}
      <View style={styles.section}>
        <SectionHeader title="Today" />
        <View style={styles.todayRow}>
          <Card variant="tinted" accent="sage" style={{ flex: 1 }}>
            <Text style={styles.todayEmoji} accessibilityElementsHidden importantForAccessibility="no">💡</Text>
            <Txt variant="overline" tone="muted">Tip of the day</Txt>
            <Txt variant="bodySm" style={{ marginTop: SPACE.xs }}>{tip}</Txt>
          </Card>
          <Card
            variant="tinted"
            accent="gold"
            style={{ flex: 1 }}
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
        </View>
      </View>

      {/* ----------------------------------------- B. create your next look */}
      <View style={styles.section}>
        <SectionHeader
          title="Create your next look"
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
      </View>

      {/* ------------------------------------------- D. recommended for you */}
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

      {/* ------------------------------------ H. continue where you left off */}
      {data && data.timeline.length ? (
        <View style={styles.section}>
          <SectionHeader title="Continue where you left off" action="All activity" onAction={() => router.push('/(tabs)/passport' as never)} />
          {data.timeline.slice(0, 3).map((item) => (
            <Card key={item.id} style={{ marginBottom: SPACE.sm }}>
              <Txt variant="bodySm">{item.summary}</Txt>
              <Txt variant="caption" tone="subtle" style={{ marginTop: 2 }}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Txt>
            </Card>
          ))}
        </View>
      ) : null}

      {/* --------------------------------------- your colours, if analysed */}
      {report.data ? (
        <View style={styles.section}>
          <SectionHeader title="Your palette" action="Full report" onAction={() => router.push('/colors/report' as never)} />
          <Card>
            <Txt variant="heading" serif>{report.data.label}</Txt>
            <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs, marginBottom: SPACE.lg }}>
              {report.data.summary}
            </Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {report.data.palettes.best.map((s) => (
                <Swatch key={s.hex} hex={s.hex} name={s.name} size={52} />
              ))}
            </ScrollView>
          </Card>
        </View>
      ) : null}

      {/* --------------------------------------------------- I. inspiration */}
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

      {isNew ? (
        <View style={styles.section}>
          <EmptyState
            title="Nothing here is guessed"
            body="Every result you see comes from a scan you ran or a preference you set. Until then, sections stay empty on purpose."
            actionLabel="Run your first analysis"
            onAction={() => router.push('/(tabs)/scan' as never)}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: SPACE.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.xl },
  pill: { paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, borderRadius: RADIUS.pill },
  hero: { borderRadius: RADIUS.xl, padding: SPACE.xl },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.md },
  sectionTight: { paddingHorizontal: SPACE.xl, marginTop: SPACE.lg },
  todayRow: { flexDirection: 'row', gap: SPACE.sm },
  todayEmoji: { fontSize: 24, marginBottom: SPACE.xs },
  section: { paddingHorizontal: SPACE.xl, marginTop: SPACE.xxl },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
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
