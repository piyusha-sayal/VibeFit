import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Txt } from '../ds';
import { PressScale } from '../ds/PressScale';
import { QUIZ_LENGTH, dailyQuiz, localDay } from '../../constants/gamification';
import { RADIUS, SPACE } from '../../constants/theme';
import { useGameStore } from '../../store/gameStore';
import { useTheme } from '../../theme/ThemeProvider';
import { success, warn } from '../../utils/haptics';

/** Three quick colour-and-style questions a day. Played once; the score counts towards badges. */
export function DailyQuiz() {
  const { colors } = useTheme();
  const questions = useMemo(() => dailyQuiz(), []);
  const lastQuizDay = useGameStore((s) => s.lastQuizDay);
  const lastQuizScore = useGameStore((s) => s.lastQuizScore);
  const submitQuiz = useGameStore((s) => s.submitQuiz);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);

  const playedToday = lastQuizDay === localDay();

  if (playedToday && !started) {
    return (
      <Card variant="tinted" accent="gold">
        <Txt variant="overline" tone="muted">Daily quiz</Txt>
        <Txt variant="heading" serif style={{ marginTop: SPACE.xs }}>
          {lastQuizScore === QUIZ_LENGTH ? 'Perfect score! 🏆' : `You scored ${lastQuizScore ?? 0}/${QUIZ_LENGTH}`}
        </Txt>
        <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>New questions tomorrow. Keep your streak going.</Txt>
      </Card>
    );
  }

  if (!started) {
    return (
      <Card variant="tinted" accent="gold">
        <Txt variant="overline" tone="muted">Daily quiz · {QUIZ_LENGTH} questions</Txt>
        <Txt variant="heading" serif style={{ marginTop: SPACE.xs }}>How well do you know colour? 🧠</Txt>
        <Button label="Play now" onPress={() => setStarted(true)} style={{ marginTop: SPACE.md }} />
      </Card>
    );
  }

  const finished = index >= questions.length;
  if (finished) {
    return (
      <Card variant="tinted" accent="gold">
        <Txt variant="heading" serif live="polite">
          {score === QUIZ_LENGTH ? 'Perfect! Colour Genius 🏆' : `${score}/${QUIZ_LENGTH} — nice work!`}
        </Txt>
        <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>Points added. Come back tomorrow for more.</Txt>
      </Card>
    );
  }

  const q = questions[index];
  const answered = picked !== null;

  const choose = (option: number) => {
    if (answered) return;
    setPicked(option);
    if (option === q.answer) { setScore((s) => s + 1); success(); } else warn();
  };

  const next = () => {
    const last = index === questions.length - 1;
    if (last) void submitQuiz(score);
    setPicked(null);
    setIndex(index + 1);
  };

  return (
    <Card variant="tinted" accent="gold">
      <Txt variant="overline" tone="muted">Question {index + 1} of {questions.length}</Txt>
      <Txt variant="body" weight="semibold" style={{ marginTop: SPACE.xs }}>{q.question}</Txt>
      <View style={{ marginTop: SPACE.md, gap: SPACE.sm }}>
        {q.options.map((option, i) => {
          const isAnswer = i === q.answer;
          const isPicked = i === picked;
          const bg = !answered ? colors.surface
            : isAnswer ? colors.successSoft : isPicked ? colors.dangerSoft : colors.surface;
          const border = !answered ? colors.border
            : isAnswer ? colors.success : isPicked ? colors.danger : colors.border;
          return (
            <PressScale key={option} onPress={() => choose(i)} accessibilityLabel={option} scaleTo={0.97}>
              <View style={[styles.option, { backgroundColor: bg, borderColor: border }]}>
                <Txt variant="bodySm" weight={isPicked ? 'semibold' : 'regular'}>
                  {answered && isAnswer ? '✓ ' : answered && isPicked ? '✗ ' : ''}{option}
                </Txt>
              </View>
            </PressScale>
          );
        })}
      </View>
      {answered ? (
        <>
          <Txt variant="caption" tone="muted" live="polite" style={{ marginTop: SPACE.md }}>{q.why}</Txt>
          <Button
            label={index === questions.length - 1 ? 'See score' : 'Next'}
            onPress={next}
            style={{ marginTop: SPACE.md }}
          />
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  option: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RADIUS.md,
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.lg,
  },
});
