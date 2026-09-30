import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Card, Chip, ErrorState, LoadingState, PageHeader, Screen, SectionHeader, Txt,
} from '../components/ds';
import { SPACE } from '../constants/theme';
import { getActionPlan, submitActionFeedback } from '../services/planService';
import { ActionPlan, PlanAction, ActionFeedbackType } from '../types';

const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'High confidence',
  usable_with_caution: 'Usable with caution',
  retake_recommended: 'Retake recommended',
  self_reported: 'From your answers',
  user_corrected: 'Your correction',
  unknown: 'Limited confidence',
};

const FEEDBACK_LABEL: Partial<Record<ActionFeedbackType, string>> = {
  saved: 'Save',
  completed: 'Done',
  not_relevant: 'Not for me',
};

const FEEDBACK_TYPES: ActionFeedbackType[] = ['saved', 'completed', 'not_relevant'];

function formatCheckIn(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ActionCard({ action, onFeedback }: {
  action: PlanAction;
  onFeedback: (id: string, type: ActionFeedbackType) => Promise<void>;
}) {
  const [sending, setSending] = useState<ActionFeedbackType | null>(null);

  const send = async (type: ActionFeedbackType) => {
    setSending(type);
    await onFeedback(action.id, type);
    setSending(null);
  };

  return (
    <Card style={{ marginBottom: SPACE.sm }}>
      <View style={styles.rowBetween}>
        <Txt variant="overline" tone="subtle">{action.category}</Txt>
        <Chip label={CONFIDENCE_LABEL[action.confidenceLabel] ?? action.confidenceLabel} accent="gold" />
      </View>
      <Txt variant="heading" serif style={{ marginTop: SPACE.xs }}>{action.title}</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>{action.why}</Txt>
      {action.limitations ? (
        <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xs }}>{action.limitations}</Txt>
      ) : null}

      <View style={styles.feedbackRow}>
        {FEEDBACK_TYPES.map((type) => (
          <Chip
            key={type}
            label={FEEDBACK_LABEL[type] ?? type}
            accent="sage"
            selected={action.feedback.includes(type) || sending === type}
            onPress={sending === null ? () => { void send(type); } : undefined}
          />
        ))}
      </View>
    </Card>
  );
}

export default function PlanScreen() {
  const router = useRouter();
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getActionPlan();
    if (res.success && res.data) {
      setPlan(res.data);
    } else {
      setError(res.error ?? 'Could not load your plan');
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleFeedback = async (actionId: string, type: ActionFeedbackType) => {
    const res = await submitActionFeedback(actionId, type);
    if (res.success) {
      setPlan((p) => p && ({
        ...p,
        topActions: p.topActions.map((a) => (a.id === actionId ? { ...a, feedback: [...a.feedback, type] } : a)),
        avoid: p.avoid.map((a) => (a.id === actionId ? { ...a, feedback: [...a.feedback, type] } : a)),
      }));
    }
  };

  if (loading) return <LoadingState label="Building your plan…" />;
  if (error || !plan) {
    return <ErrorState message={error ?? 'No plan yet.'} onRetry={() => { void load(); }} />;
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Your goal"
        title={plan.goal ?? 'Discover what suits you'}
        right={
          <Chip label="Vibe Profile" accent="gold" onPress={() => router.push('/vibe-profile' as never)} />
        }
      />

      {!plan.profileComplete ? (
        <Card variant="tinted" accent="gold" style={{ marginBottom: SPACE.lg }}>
          <Txt variant="bodySm">
            This plan improves as you finish onboarding and scan a photo.
          </Txt>
        </Card>
      ) : null}

      <SectionHeader title="Top actions for you" />
      {plan.topActions.length === 0 ? (
        <Txt variant="bodySm" tone="muted">
          No actions yet — complete onboarding and a scan to get started.
        </Txt>
      ) : (
        plan.topActions.map((a) => <ActionCard key={a.id} action={a} onFeedback={handleFeedback} />)
      )}

      {plan.avoid.length > 0 ? (
        <View style={{ marginTop: SPACE.xl }}>
          <SectionHeader title="Avoid or postpone" />
          {plan.avoid.map((a) => (
            <Card key={a.id} variant="tinted" accent="peach" style={{ marginBottom: SPACE.sm }}>
              <Txt variant="body" weight="semibold" tone="danger">{a.title}</Txt>
              <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>{a.why}</Txt>
            </Card>
          ))}
        </View>
      ) : null}

      {plan.limitationsSummary ? (
        <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.lg }}>
          {plan.limitationsSummary}
        </Txt>
      ) : null}

      <Card style={{ marginTop: SPACE.xl }}>
        <Txt variant="overline" tone="subtle">Check in</Txt>
        <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
          We'll suggest revisiting this around {formatCheckIn(plan.checkInAt)}.
        </Txt>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
  feedbackRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.md },
});
