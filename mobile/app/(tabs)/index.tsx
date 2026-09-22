import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Chip, EmptyState, ErrorState, LoadingState, ProgressBar, SectionHeader, Swatch, Txt } from '../../components/ds';
import { RADIUS, SPACE } from '../../constants/theme';
import { useColorReport, usePassport } from '../../hooks/useBeauty';
import { useDrafts } from '../../hooks/useLook';
import { LookSwatches } from '../../components/look';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import { EXPERIENCES, OCCASIONS, SMALL_TOOLS, tipOfTheDay } from '../../constants/experiences';
import { orderExperiences, recommendedStart } from '../../constants/onboarding';
import { useOnboardingStore } from '../../store/onboardingStore';
import { ACADEMY_GUIDES } from '../../constants/academy';
import { INSPIRATION } from '../../constants/inspiration';
import { Logo } from '../../components/ds/Logo';
import { WakingBanner } from '../../components/ds/WakingBanner';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const passport = usePassport();
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
  const experiences = useMemo(
    () => orderExperiences(EXPERIENCES, interests), [interests],
  );

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

  if (passport.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <LoadingState label="Opening your passport…" />
      </View>
    );
  }

  const data = passport.data;
  const isNew = !data || data.completed === 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ------------------------------------------------- A. brand + hero */}
      {/* The mark appears once, here. Repeating it on every screen would
          clutter navigation without telling anyone anything new. */}
      <Logo variant="horizontal" width={150} style={{ marginBottom: SPACE.lg }} />

      <WakingBanner />

      <View style={[styles.hero, { backgroundColor: colors.goldSoft }]}>
        {isNew ? (
          <>
            <Txt variant="display" serif>Discover Your Colors.</Txt>
            <Txt variant="display" serif style={{ marginBottom: SPACE.md }}>Define Your Style.</Txt>
            <Txt variant="body" tone="muted" style={{ marginBottom: SPACE.xl }}>
              {firstStep
                ? `You said you wanted to explore ${firstStep.eyebrow.toLowerCase()}. Start there.`
                : 'Your personal beauty and styling journey starts here.'}
            </Txt>
            <Button
              label={firstStep ? firstStep.title : 'Start Exploring'}
              onPress={() => router.push((firstStep?.route ?? '/(tabs)/scan') as never)}
            />
          </>
        ) : (
          <>
            <Txt variant="title" serif>Welcome back{firstName ? `, ${firstName}` : ''}.</Txt>
            <Txt variant="body" tone="muted" style={{ marginTop: SPACE.sm, marginBottom: SPACE.xl }}>
              {data?.nextAction
                ? `Next: ${data.nextAction.label.toLowerCase()}.`
                : 'Your passport is complete. Build a look with it.'}
            </Txt>
            <Button
              label={data?.nextAction ? data.nextAction.label : 'Create a look'}
              onPress={() => router.push((data?.nextAction?.route ?? '/(tabs)/create') as never)}
            />
          </>
        )}
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

      {/* ------------------------------------------ C. beauty passport preview */}
      {passport.isError ? (
        <View style={styles.section}>
          <ErrorState message="Could not load your passport." onRetry={() => passport.refetch()} />
        </View>
      ) : data ? (
        <View style={styles.section}>
          <SectionHeader title="My Beauty Passport" action="Open" onAction={() => router.push('/(tabs)/passport' as never)} />
          <Card>
            <View style={styles.rowBetween}>
              <Txt variant="bodySm" tone="muted">
                {data.completed} of {data.total} {data.completionOf ?? 'attributes'}
              </Txt>
              <Txt variant="bodySm" weight="semibold">{Math.round(data.completion * 100)}%</Txt>
            </View>
            <View style={{ marginTop: SPACE.sm, marginBottom: SPACE.lg }}>
              <ProgressBar value={data.completion} label="Profile completion" />
            </View>
            {data.attributes.slice(0, 5).map((attr) => (
              <View key={attr.key} style={[styles.attrRow, { borderColor: colors.border }]}>
                <Txt variant="bodySm" tone="muted">{attr.label}</Txt>
                {attr.status === 'present' ? (
                  <Txt variant="bodySm" weight="semibold">
                    {Array.isArray(attr.value) ? attr.value.slice(0, 2).join(', ') : attr.value}
                  </Txt>
                ) : (
                  <Txt variant="bodySm" tone="accent" weight="semibold">Not yet</Txt>
                )}
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {/* ------------------------------------------- C. flagship experiences */}
      <View style={styles.section}>
        <SectionHeader title="Five ways in" />
        {experiences.map((exp, i) => {
          // Deliberately not five identical cards: the first is a wide feature
          // card, the rest alternate between split rows and compact tiles.
          const wide = i === 0;
          return (
            <Card
              key={exp.key}
              accent={exp.accent}
              variant="tinted"
              onPress={() => router.push(exp.route as never)}
              accessibilityLabel={exp.title}
              style={wide ? styles.featureCard : styles.rowCard}
            >
              <View style={wide ? undefined : { flex: 1, paddingRight: SPACE.md }}>
                <Txt variant="overline" tone="muted">{exp.eyebrow}</Txt>
                <Txt variant={wide ? 'title' : 'heading'} serif style={{ marginTop: SPACE.xs }}>
                  {exp.title}
                </Txt>
                <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.sm }}>{exp.body}</Txt>
              </View>
              <View style={[styles.expSwatches, wide && { marginTop: SPACE.lg }]}>
                {exp.swatches.map((hex) => (
                  <View key={hex} style={[styles.expDot, { backgroundColor: hex }]} />
                ))}
              </View>
            </Card>
          );
        })}
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

      {/* -------------------------------- E. explore more (only real tools) */}
      <View style={styles.section}>
        <SectionHeader title="Explore more" />
        <View style={styles.wrap}>
          {SMALL_TOOLS.filter((t) => t.available).map((tool) => (
            <Chip key={tool.label} label={tool.label} accent={tool.accent} onPress={() => router.push(tool.route as never)} />
          ))}
        </View>
      </View>

      {/* --------------------------------------------- G. your beauty journey */}
      {data ? (
        <View style={styles.section}>
          <SectionHeader title="Your beauty journey" />
          <View style={styles.statRow}>
            {[
              { label: 'Analyses', value: data.journey.analyses },
              { label: 'Looks saved', value: data.journey.savedLooks },
              { label: 'Tried', value: data.journey.triedLooks },
              { label: 'Goals', value: data.journey.activeGoals },
            ].map((stat) => (
              <Card key={stat.label} style={styles.statCard}>
                <Txt variant="title" serif>{stat.value}</Txt>
                <Txt variant="caption" tone="muted">{stat.label}</Txt>
              </Card>
            ))}
          </View>
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

      {/* ---------------------------------------------- J. tip + academy */}
      <View style={styles.section}>
        <Card variant="tinted" accent="sage">
          <Txt variant="overline" tone="muted">Beauty tip of the day</Txt>
          <Txt variant="body" style={{ marginTop: SPACE.sm }}>{tip}</Txt>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Beauty Academy" action="All guides" onAction={() => router.push('/(tabs)/more' as never)} />
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
  hero: {
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.xxxl + SPACE.lg,
    paddingBottom: SPACE.xxl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  section: { paddingHorizontal: SPACE.xl, marginTop: SPACE.xxl },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  attrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACE.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  featureCard: { marginBottom: SPACE.md, minHeight: 170, justifyContent: 'flex-end' },
  rowCard: { marginBottom: SPACE.md, flexDirection: 'row', alignItems: 'center' },
  expSwatches: { flexDirection: 'row', gap: SPACE.xs },
  expDot: { width: 18, height: 18, borderRadius: RADIUS.pill },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  statRow: { flexDirection: 'row', gap: SPACE.sm },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: SPACE.lg, paddingHorizontal: SPACE.xs },
  inspoCard: { width: 190 },
  inspoSwatches: { flexDirection: 'row', gap: SPACE.xs },
  inspoDot: { width: 26, height: 42, borderRadius: RADIUS.sm },
});
