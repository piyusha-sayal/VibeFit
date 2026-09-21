import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, LoadingState, SectionHeader, Txt } from '../../components/ds';
import { GarmentFigure } from '../../components/visual';
import { SPACE } from '../../constants/theme';
import {
  useAesthetics, useStyleProfile, useStyleQuiz, useSubmitQuiz, useUpdateStyleProfile,
} from '../../hooks/useStyle';
import { useTheme } from '../../theme/ThemeProvider';

export default function AestheticExplorerScreen() {
  const { colors } = useTheme();
  const aesthetics = useAesthetics();
  const profile = useStyleProfile();
  const quiz = useStyleQuiz();
  const submit = useSubmitQuiz();
  const update = useUpdateStyleProfile();

  const [quizOpen, setQuizOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string[] | string>>({});

  const chosen = profile.data?.aesthetics ?? [];

  const toggleAesthetic = (key: string) => {
    const next = chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key];
    update.mutate({ aesthetics: next });
  };

  const answerQuestion = (questionKey: string, optionKey: string, multi: boolean) => {
    setAnswers((prev) => {
      if (!multi) return { ...prev, [questionKey]: optionKey };
      const current = (prev[questionKey] as string[]) ?? [];
      return {
        ...prev,
        [questionKey]: current.includes(optionKey)
          ? current.filter((k) => k !== optionKey)
          : [...current, optionKey],
      };
    });
  };

  const isPicked = (questionKey: string, optionKey: string) => {
    const value = answers[questionKey];
    return Array.isArray(value) ? value.includes(optionKey) : value === optionKey;
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Your aesthetic</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        Choose as many as fit. Nobody is one aesthetic, and none of these is
        assumed from where you live or how you look.
      </Txt>

      {/* ------------------------------------------------------------- quiz */}
      <Card variant="tinted" accent="lavender" style={{ marginTop: SPACE.xl }}>
        <Txt variant="heading">Not sure where to start?</Txt>
        <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>
          {quiz.data?.note ?? 'A short optional quiz that suggests a few to try.'}
        </Txt>
        <Button
          label={quizOpen ? 'Hide the quiz' : 'Take the quiz'}
          variant="secondary"
          style={{ marginTop: SPACE.md }}
          onPress={() => setQuizOpen((v) => !v)}
        />
      </Card>

      {quizOpen && quiz.data ? (
        <View style={{ marginTop: SPACE.lg }}>
          {quiz.data.questions.map((question) => (
            <Card key={question.key} style={{ marginBottom: SPACE.md }}>
              <Txt variant="heading">{question.prompt}</Txt>
              <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>{question.helpText}</Txt>
              <View style={styles.chips}>
                {question.options.map((option) => (
                  <Chip
                    key={option.key}
                    label={option.label}
                    accent="lavender"
                    selected={isPicked(question.key, option.key)}
                    onPress={() => answerQuestion(question.key, option.key, question.multi)}
                  />
                ))}
              </View>
            </Card>
          ))}

          <Button
            label={submit.isPending ? 'Scoring…' : 'See my results'}
            onPress={() => submit.mutate({ answers })}
          />

          {submit.data ? (
            <Card variant="tinted" accent="gold" style={{ marginTop: SPACE.lg }}>
              <Txt variant="heading">
                {submit.data.suggested.length
                  ? 'Worth trying'
                  : 'Not enough answers to suggest anything'}
              </Txt>
              <View style={styles.chips}>
                {submit.data.ranked
                  .filter((r) => (r.score ?? 0) > 0)
                  .slice(0, 5)
                  .map((r) => (
                    <Chip key={r.key} label={r.name} accent="gold" />
                  ))}
              </View>
              <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.sm }}>
                {submit.data.note}
              </Txt>
            </Card>
          ) : null}
        </View>
      ) : null}

      {/* ------------------------------------------------------ the library */}
      <SectionHeader title="All sixteen" style={{ marginTop: SPACE.xxl }} />
      {aesthetics.isLoading ? (
        <LoadingState />
      ) : (
        (aesthetics.data?.aesthetics ?? []).map((aesthetic) => {
          const selected = chosen.includes(aesthetic.key);
          return (
            <Card
              key={aesthetic.key}
              variant={selected ? 'tinted' : 'plain'}
              accent="gold"
              style={{ marginBottom: SPACE.md }}
              onPress={() => toggleAesthetic(aesthetic.key)}
              accessibilityLabel={aesthetic.name}
            >
              <View style={styles.rowBetween}>
                <Txt variant="heading">{aesthetic.name}</Txt>
                <Txt variant="caption" tone="muted">{aesthetic.effort} effort</Txt>
              </View>
              <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{aesthetic.summary}</Txt>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                          style={{ marginTop: SPACE.md }}>
                {aesthetic.heroGarments.map((key, index) => (
                  <GarmentFigure
                    key={key}
                    silhouette={['a_line', 'straight', 'wide_leg', 'column'][index % 4]}
                    seed={`${aesthetic.key}-${key}`}
                    width={56}
                  />
                ))}
              </ScrollView>

              <View style={{ marginTop: SPACE.sm }}>
                {aesthetic.signature.slice(0, 3).map((line) => (
                  <Txt key={line} variant="bodySm" style={{ marginBottom: 2 }}>• {line}</Txt>
                ))}
              </View>

              <Txt variant="caption" tone="accent" weight="semibold" style={{ marginTop: SPACE.sm }}>
                {selected ? 'In your profile — tap to remove' : 'Tap to add to your profile'}
              </Txt>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
});
