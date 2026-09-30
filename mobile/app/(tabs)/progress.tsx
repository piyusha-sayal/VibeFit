import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, SectionHeader, Txt } from '../../components/ds';
import { ProgressRing } from '../../components/ds/ProgressRing';
import { DailyQuiz } from '../../components/progress/DailyQuiz';
import { RADIUS, SPACE } from '../../constants/theme';
import { useProgress } from '../../hooks/useProgress';
import { useTheme } from '../../theme/ThemeProvider';

/** Level, streak, passport checklist, daily quiz and badges. */
export default function ProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { passport, activity, level, badges, game } = useProgress();
  const data = passport.data;
  const earned = badges.filter((b) => b.earned).length;
  const nextBadge = badges.find((b) => !b.earned) ?? null;

  const stats = [
    { emoji: '🔥', value: game.streak.count, label: 'Streak' },
    { emoji: '📸', value: activity.analyses, label: 'Scans' },
    { emoji: '💾', value: activity.savedLooks, label: 'Looks' },
    { emoji: '🏅', value: earned, label: 'Badges' },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + SPACE.xl }]}
      showsVerticalScrollIndicator={false}
    >
      <Txt variant="display" serif accessibilityRole="header">Your progress</Txt>

      {/* ------------------------------------------------------- level */}
      <Card variant="tinted" accent="gold" style={styles.levelCard}>
        <ProgressRing
          value={level.progress}
          size={112}
          accessibilityLabel={`Level ${level.level}, ${Math.round(level.progress * 100)} percent to the next level`}
        >
          <Txt variant="overline" tone="muted">Level</Txt>
          <Txt variant="display" serif>{level.level}</Txt>
        </ProgressRing>
        <View style={{ flex: 1 }}>
          <Txt variant="title" serif>{level.title}</Txt>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>{level.points} points</Txt>
          <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.xs }}>
            {level.next === null ? 'Top level reached ✨' : `${level.next - level.points} points to the next level`}
          </Txt>
        </View>
      </Card>

      {/* ------------------------------------------------------- stats */}
      <View style={styles.statRow}>
        {stats.map((s) => (
          <Card key={s.label} style={styles.statCard}>
            <Text style={styles.statEmoji} accessibilityElementsHidden importantForAccessibility="no">{s.emoji}</Text>
            <Txt variant="title" serif>{s.value}</Txt>
            <Txt variant="caption" tone="muted" numberOfLines={1}>{s.label}</Txt>
          </Card>
        ))}
      </View>
      {game.streak.best > game.streak.count ? (
        <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.sm }}>Best streak: {game.streak.best} days</Txt>
      ) : null}

      {/* ---------------------------------------------------- passport */}
      <View style={styles.section}>
        <SectionHeader title="Beauty passport" action="Open" onAction={() => router.push('/(tabs)/passport' as never)} />
        <Card>
          <View style={styles.passportRow}>
            <ProgressRing
              value={data?.completion ?? 0}
              size={84}
              stroke={8}
              color={colors.sage}
              accessibilityLabel={`Passport ${Math.round((data?.completion ?? 0) * 100)} percent complete`}
            >
              <Txt variant="heading" weight="bold">{Math.round((data?.completion ?? 0) * 100)}%</Txt>
            </ProgressRing>
            <View style={{ flex: 1 }}>
              <Txt variant="body" weight="semibold">
                {data ? `${data.completed} of ${data.total} filled in` : 'Not started yet'}
              </Txt>
              <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                Each one makes your recommendations more personal.
              </Txt>
            </View>
          </View>
          {(data?.attributes ?? []).map((attr) => {
            const done = attr.status === 'present';
            return (
              <View key={attr.key} style={[styles.checkRow, { borderColor: colors.border }]}>
                <Txt variant="bodySm" tone={done ? 'success' : 'subtle'}>{done ? '✓' : '○'}</Txt>
                <Txt variant="bodySm" tone={done ? 'default' : 'muted'} style={{ flex: 1 }}>{attr.label}</Txt>
              </View>
            );
          })}
          {data?.nextAction ? (
            <Button
              label={data.nextAction.label}
              onPress={() => router.push(data.nextAction!.route as never)}
              style={{ marginTop: SPACE.md }}
            />
          ) : null}
        </Card>
      </View>

      {/* ------------------------------------------------------ badges */}
      <View style={styles.section}>
        <SectionHeader title={`Achievements · ${earned}/${badges.length}`} />
        <View style={styles.badgeGrid}>
          {badges.map((b) => (
            <View
              key={b.key}
              style={[
                styles.badge,
                {
                  backgroundColor: b.earned ? colors.goldSoft : colors.surface,
                  borderColor: b.earned ? colors.gold : colors.border,
                },
              ]}
              accessible
              accessibilityLabel={`${b.title}. ${b.earned ? 'Earned' : `Locked: ${b.hint}`}`}
            >
              <Text style={[styles.badgeEmoji, !b.earned && { opacity: 0.25 }]}>{b.emoji}</Text>
              <Txt variant="caption" weight="semibold" numberOfLines={1} tone={b.earned ? 'default' : 'subtle'}>
                {b.title}
              </Txt>
              {!b.earned ? (
                <Txt variant="caption" tone="subtle" numberOfLines={2} style={styles.badgeHint}>{b.hint}</Txt>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      {/* -------------------------------------------------------- quiz */}
      <View style={styles.section}>
        <DailyQuiz />
      </View>

      {/* ------------------------------------------------ next milestone */}
      <View style={styles.section}>
        <SectionHeader title="Next milestone" />
        {nextBadge ? (
          <Card variant="tinted" accent="lavender">
            <Text style={styles.badgeEmoji} accessibilityElementsHidden importantForAccessibility="no">{nextBadge.emoji}</Text>
            <Txt variant="body" weight="semibold" style={{ marginTop: SPACE.xs }}>{nextBadge.title}</Txt>
            <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{nextBadge.hint}</Txt>
          </Card>
        ) : (
          <Card variant="tinted" accent="gold">
            <Txt variant="body" weight="semibold">Every badge earned ✨</Txt>
            <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>
              You have completed the full collection. New milestones arrive as new features do.
            </Txt>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SPACE.xl, paddingBottom: SPACE.xxxl },
  section: { marginTop: SPACE.xxl },
  levelCard: { marginTop: SPACE.xl, flexDirection: 'row', alignItems: 'center', gap: SPACE.lg },
  statRow: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.lg },
  statCard: { flex: 1, alignItems: 'center', paddingHorizontal: SPACE.xs, paddingVertical: SPACE.md },
  statEmoji: { fontSize: 22 },
  passportRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.lg, marginBottom: SPACE.md },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
    paddingVertical: SPACE.sm, borderTopWidth: StyleSheet.hairlineWidth,
  },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  badge: {
    width: '31.5%',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.xs,
    minHeight: 104,
  },
  badgeEmoji: { fontSize: 30, marginBottom: SPACE.xs },
  badgeHint: { textAlign: 'center', marginTop: 2 },
});
