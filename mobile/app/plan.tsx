import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Lbl } from '../components/ui/Lbl';
import { Tag } from '../components/ui/Tag';
import { GoldButton } from '../components/ui/GoldButton';
import { C } from '../constants/colors';
import { FONTS } from '../constants/fonts';
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

function formatCheckIn(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ActionCard({ action, onFeedback }: { action: PlanAction; onFeedback: (id: string, type: ActionFeedbackType) => void }) {
  const [sending, setSending] = useState<ActionFeedbackType | null>(null);

  const send = async (type: ActionFeedbackType) => {
    setSending(type);
    await onFeedback(action.id, type);
    setSending(null);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardCategory}>{action.category}</Text>
        <Tag>{CONFIDENCE_LABEL[action.confidenceLabel] ?? action.confidenceLabel}</Tag>
      </View>
      <Text style={styles.cardTitle}>{action.title}</Text>
      <Text style={styles.cardWhy}>{action.why}</Text>
      {action.limitations && <Text style={styles.cardLimitations}>{action.limitations}</Text>}

      <View style={styles.feedbackRow}>
        {(['saved', 'completed', 'not_relevant'] as ActionFeedbackType[]).map((type) => {
          const active = action.feedback.includes(type);
          const label = type === 'saved' ? 'Save' : type === 'completed' ? 'Done' : 'Not for me';
          return (
            <TouchableOpacity
              key={type}
              style={[styles.feedbackBtn, active && styles.feedbackBtnActive]}
              onPress={() => send(type)}
              disabled={sending !== null}
              activeOpacity={0.75}
            >
              {sending === type ? (
                <ActivityIndicator size="small" color={C.gold} />
              ) : (
                <Text style={[styles.feedbackBtnText, active && styles.feedbackBtnTextActive]}>{label}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
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

  useEffect(() => { load(); }, [load]);

  const handleFeedback = async (actionId: string, type: ActionFeedbackType) => {
    const res = await submitActionFeedback(actionId, type);
    if (res.success) {
      setPlan((p) => p && ({
        ...p,
        topActions: p.topActions.map((a) => a.id === actionId ? { ...a, feedback: [...a.feedback, type] } : a),
        avoid: p.avoid.map((a) => a.id === actionId ? { ...a, feedback: [...a.feedback, type] } : a),
      }));
    }
  };

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={C.gold} size="large" />
      </Screen>
    );
  }

  if (error || !plan) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.emptyText}>{error ?? 'No plan yet.'}</Text>
        <GoldButton label="Retry" onPress={load} style={{ marginTop: 20 }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow="Your goal"
          title={plan.goal ?? 'Discover what suits you'}
          right={
            <TouchableOpacity onPress={() => router.push('/vibe-profile')} style={styles.profileBtn} activeOpacity={0.75}>
              <Text style={styles.profileBtnText}>Vibe Profile</Text>
            </TouchableOpacity>
          }
        />

        {!plan.profileComplete && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              This plan improves as you finish onboarding and scan a photo.
            </Text>
          </View>
        )}

        <Lbl style={styles.sectionLbl}>Top actions for you</Lbl>
        {plan.topActions.length === 0 ? (
          <Text style={styles.emptyInline}>No actions yet — complete onboarding and a scan to get started.</Text>
        ) : (
          plan.topActions.map((a) => <ActionCard key={a.id} action={a} onFeedback={handleFeedback} />)
        )}

        {plan.avoid.length > 0 && (
          <>
            <Lbl style={styles.sectionLbl}>Avoid or postpone</Lbl>
            {plan.avoid.map((a) => (
              <View key={a.id} style={styles.avoidCard}>
                <Text style={styles.avoidTitle}>{a.title}</Text>
                <Text style={styles.cardWhy}>{a.why}</Text>
              </View>
            ))}
          </>
        )}

        {plan.limitationsSummary && (
          <Text style={styles.limitationsSummary}>{plan.limitationsSummary}</Text>
        )}

        <View style={styles.checkIn}>
          <Lbl style={{ marginBottom: 4 }}>Check in</Lbl>
          <Text style={styles.checkInText}>We'll suggest revisiting this around {formatCheckIn(plan.checkInAt)}.</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontFamily: FONTS.sans, fontSize: 14, color: C.textMuted, textAlign: 'center' },
  emptyInline: { fontFamily: FONTS.sans, fontSize: 13, color: C.textMuted, marginTop: 8, lineHeight: 19 },
  scroll: { padding: 20, paddingTop: 16 },
  profileBtn: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 9999, backgroundColor: C.goldDim, borderWidth: 0.5, borderColor: C.goldBorder },
  profileBtnText: { fontFamily: FONTS.sansSemiBold, fontSize: 11, color: C.gold },
  noticeBox: { backgroundColor: C.goldDim, borderWidth: 0.5, borderColor: C.goldBorder, borderRadius: 12, padding: 12, marginTop: 12 },
  noticeText: { fontFamily: FONTS.sans, fontSize: 12, color: C.textMuted, lineHeight: 17 },
  sectionLbl: { marginTop: 26, marginBottom: 12 },
  card: { backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.white06, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardCategory: { fontFamily: FONTS.sansBold, fontSize: 10, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  cardTitle: { fontFamily: FONTS.serif, fontSize: 20, color: C.text, marginBottom: 6 },
  cardWhy: { fontFamily: FONTS.sans, fontSize: 13, color: C.textMuted, lineHeight: 19 },
  cardLimitations: { fontFamily: FONTS.sans, fontSize: 11, color: C.textSubtle, marginTop: 6, fontStyle: 'italic' },
  feedbackRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  feedbackBtn: { flex: 1, paddingVertical: 9, borderRadius: 9999, borderWidth: 0.5, borderColor: C.white08, alignItems: 'center' },
  feedbackBtnActive: { backgroundColor: C.goldDim, borderColor: C.goldBorder },
  feedbackBtnText: { fontFamily: FONTS.sansMedium, fontSize: 12, color: C.textMuted },
  feedbackBtnTextActive: { color: C.gold },
  avoidCard: { backgroundColor: C.redDim, borderWidth: 0.5, borderColor: C.redBorder, borderRadius: 16, padding: 16, marginBottom: 10 },
  avoidTitle: { fontFamily: FONTS.sansSemiBold, fontSize: 15, color: C.red, marginBottom: 4 },
  limitationsSummary: { fontFamily: FONTS.sans, fontSize: 12, color: C.textSubtle, marginTop: 18, lineHeight: 18, fontStyle: 'italic' },
  checkIn: { marginTop: 26, backgroundColor: C.surface, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: C.white06 },
  checkInText: { fontFamily: FONTS.sans, fontSize: 13, color: C.textMuted, lineHeight: 19 },
});
