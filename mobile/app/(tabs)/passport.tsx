import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Button, Card, Chip, EmptyState, ErrorState, LoadingState, ProgressBar, SectionHeader, Txt,
} from '../../components/ds';
import { RADIUS, SPACE } from '../../constants/theme';
import {
  useCreateGoal, useDeleteLook, useGoals, useLooks, usePassport, useUpdateGoal, useUpdateLook,
} from '../../hooks/useBeauty';
import { useTheme } from '../../theme/ThemeProvider';

const LOOK_FILTERS = [
  { key: undefined, label: 'All' },
  { key: 'saved', label: 'Saved' },
  { key: 'want_to_try', label: 'Want to try' },
  { key: 'tried', label: 'Tried' },
] as const;

export default function PassportScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [lookFilter, setLookFilter] = useState<string | undefined>(undefined);
  const [goalTitle, setGoalTitle] = useState('');

  const passport = usePassport();
  const looks = useLooks(lookFilter ? { status: lookFilter } : undefined);
  const goals = useGoals();
  const updateLook = useUpdateLook();
  const deleteLook = useDeleteLook();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();

  if (passport.isLoading) return <LoadingState label="Opening your passport…" />;
  if (passport.isError || !passport.data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ErrorState message="Could not load your passport." onRetry={() => passport.refetch()} />
      </View>
    );
  }

  const data = passport.data;

  const confirmRemove = (id: string, name: string) => {
    Alert.alert('Remove this look?', `“${name}” will be deleted from your passport.`, [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteLook.mutate(id) },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Txt variant="display" serif>My Beauty Passport</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: SPACE.xs, marginBottom: SPACE.xl }}>
        Everything you have told us, and everything a scan has found. Nothing else.
      </Txt>

      {/* --------------------------------------------------------- completion */}
      <Card>
        <View style={styles.rowBetween}>
          <Txt variant="heading" serif>{Math.round(data.completion * 100)}% complete</Txt>
          <Txt variant="bodySm" tone="muted">{data.completed}/{data.total}</Txt>
        </View>
        <View style={{ marginTop: SPACE.md }}>
          <ProgressBar value={data.completion} label="Profile completion" />
        </View>
        {data.nextAction ? (
          <Button
            label={data.nextAction.label}
            variant="secondary"
            style={{ marginTop: SPACE.lg }}
            onPress={() => router.push(data.nextAction!.route as never)}
          />
        ) : null}
      </Card>

      {/* --------------------------------------------------------- attributes */}
      <View style={styles.section}>
        <SectionHeader title="Your profile" />
        {data.attributes.map((attr) => (
          <Card
            key={attr.key}
            style={{ marginBottom: SPACE.sm }}
            onPress={() => {
              const route = attr.status === 'present' ? attr.route : attr.action?.route;
              if (route) router.push(route as never);
            }}
            accessibilityLabel={`${attr.label}, ${attr.status === 'present' ? 'set' : 'not set'}`}
          >
            <View style={styles.rowBetween}>
              <Txt variant="bodySm" tone="muted">{attr.label}</Txt>
              {attr.status === 'present' ? (
                <Txt variant="bodySm" weight="semibold" style={{ flexShrink: 1, textAlign: 'right' }}>
                  {Array.isArray(attr.value) ? attr.value.slice(0, 3).join(', ') : attr.value}
                </Txt>
              ) : (
                <Txt variant="bodySm" tone="accent" weight="semibold">
                  {attr.action?.label ?? 'Add'}
                </Txt>
              )}
            </View>
            {attr.detail ? (
              <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xs }}>{attr.detail}</Txt>
            ) : null}
          </Card>
        ))}
      </View>

      {/* -------------------------------------------------------------- looks */}
      <View style={styles.section}>
        <SectionHeader title="Saved looks" action="Create one" onAction={() => router.push('/(tabs)/create' as never)} />
        <View style={styles.wrap}>
          {LOOK_FILTERS.map((f) => (
            <Chip
              key={f.label}
              label={f.label}
              accent="peach"
              selected={lookFilter === f.key}
              onPress={() => setLookFilter(f.key)}
            />
          ))}
        </View>

        {looks.isLoading ? (
          <LoadingState label="Loading looks…" />
        ) : looks.isError ? (
          <ErrorState message="Could not load your looks." onRetry={() => looks.refetch()} />
        ) : !looks.data?.length ? (
          <EmptyState
            title="No looks here yet"
            body="Build one in Create My Look and it will appear here with your timeline."
            actionLabel="Create a look"
            onAction={() => router.push('/(tabs)/create' as never)}
          />
        ) : (
          looks.data.map((look) => (
            <Card key={look.id} style={{ marginTop: SPACE.sm }}>
              <View style={styles.rowBetween}>
                <Txt variant="body" weight="semibold" style={{ flex: 1 }}>{look.name}</Txt>
                <Txt variant="caption" tone="subtle">{look.kind}</Txt>
              </View>
              {look.occasion ? (
                <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>{look.occasion}</Txt>
              ) : null}
              <View style={[styles.wrap, { marginTop: SPACE.md }]}>
                <Chip
                  label={look.status === 'tried' ? 'Tried' : 'Mark as tried'}
                  accent="sage"
                  selected={look.status === 'tried'}
                  onPress={() => updateLook.mutate({ id: look.id, status: 'tried' })}
                />
                <Chip
                  label="Want to try"
                  accent="lavender"
                  selected={look.status === 'want_to_try'}
                  onPress={() => updateLook.mutate({ id: look.id, status: 'want_to_try' })}
                />
                <Chip label="Remove" accent="blush" onPress={() => confirmRemove(look.id, look.name)} />
              </View>
            </Card>
          ))
        )}
      </View>

      {/* -------------------------------------------------------------- goals */}
      <View style={styles.section}>
        <SectionHeader title="Goals" />
        <Card>
          <TextInput
            value={goalTitle}
            onChangeText={setGoalTitle}
            placeholder="e.g. find a lipstick I wear daily"
            placeholderTextColor={colors.textSubtle}
            accessibilityLabel="New goal"
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
          />
          <Button
            label="Add goal"
            variant="secondary"
            disabled={!goalTitle.trim()}
            loading={createGoal.isPending}
            style={{ marginTop: SPACE.md }}
            onPress={async () => {
              await createGoal.mutateAsync({ title: goalTitle.trim() });
              setGoalTitle('');
            }}
          />
        </Card>

        {goals.data?.length ? (
          goals.data.map((goal) => (
            <Card key={goal.id} style={{ marginTop: SPACE.sm }}>
              <View style={styles.rowBetween}>
                <Txt
                  variant="body"
                  tone={goal.status === 'done' ? 'subtle' : 'default'}
                  style={{ flex: 1 }}
                >
                  {goal.title}
                </Txt>
                <Chip
                  label={goal.status === 'done' ? 'Done' : 'Mark done'}
                  accent="sage"
                  selected={goal.status === 'done'}
                  onPress={() => updateGoal.mutate({ id: goal.id, status: 'done' })}
                />
              </View>
            </Card>
          ))
        ) : (
          <Txt variant="bodySm" tone="subtle" style={{ marginTop: SPACE.md }}>
            No goals yet. They are private to you.
          </Txt>
        )}
      </View>

      {/* ----------------------------------------------------------- activity */}
      <View style={styles.section}>
        <SectionHeader title="Activity" />
        {data.timeline.length ? (
          data.timeline.map((item) => (
            <View key={item.id} style={[styles.timelineRow, { borderColor: colors.border }]}>
              <View style={[styles.timelineDot, { backgroundColor: colors.gold }]} />
              <View style={{ flex: 1 }}>
                <Txt variant="bodySm">{item.summary}</Txt>
                <Txt variant="caption" tone="subtle">
                  {new Date(item.createdAt).toLocaleString()}
                </Txt>
              </View>
            </View>
          ))
        ) : (
          <Txt variant="bodySm" tone="subtle">
            Your timeline fills in as you scan, save and try things. It is never pre-filled.
          </Txt>
        )}
      </View>

      <Button
        label="Settings and privacy"
        variant="secondary"
        style={{ marginTop: SPACE.xxl }}
        onPress={() => router.push('/settings' as never)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  center: { flex: 1, justifyContent: 'center' },
  section: { marginTop: SPACE.xxl },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.lg,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: SPACE.md,
    alignItems: 'flex-start',
    paddingVertical: SPACE.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  timelineDot: { width: 8, height: 8, borderRadius: RADIUS.pill, marginTop: 6 },
});
