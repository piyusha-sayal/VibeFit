/**
 * One editable component in the Look Builder.
 *
 * A label, what is currently chosen, why it is there, and one button that
 * opens the alternatives for that component alone.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '../ds';
import { HIT_SLOP, MIN_TOUCH, RADIUS, SPACE } from '../../constants/theme';
import type { Explanation, ExplanationBasis } from '../../services/lookService';
import { useTheme } from '../../theme/ThemeProvider';

/** Plain-language source of a recommendation. Never implied, always stated. */
export const BASIS_LABEL: Record<ExplanationBasis, string> = {
  personal_colour: 'From your colour analysis',
  face_shape: 'From your face shape',
  preference: 'From your saved preferences',
  occasion: 'From the occasion only',
  general: 'General styling',
};

interface Props {
  label: string;
  value: string | null;
  detail?: string | null;
  swatch?: string | null;
  explanations?: Explanation[];
  /** Absent means the component cannot be edited yet, and says why. */
  onChange?: () => void;
  changeLabel?: string;
  unavailableNote?: string | null;
}

export function ComponentRow({
  label, value, detail, swatch, explanations = [], onChange,
  changeLabel = 'Change', unavailableNote,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.main}>
        {swatch ? (
          <View style={[styles.swatch, { backgroundColor: swatch, borderColor: colors.border }]} />
        ) : null}
        <View style={styles.text}>
          <Txt variant="overline" tone="subtle">{label}</Txt>
          <Txt variant="body" weight="semibold" style={{ marginTop: 2 }}>
            {value ?? 'Not set'}
          </Txt>
          {detail ? (
            <Txt variant="bodySm" tone="muted" numberOfLines={2} style={{ marginTop: 2 }}>
              {detail}
            </Txt>
          ) : null}
        </View>
        {onChange ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${changeLabel} ${label.toLowerCase()}`}
            hitSlop={HIT_SLOP}
            onPress={onChange}
            style={styles.change}
          >
            <Txt variant="bodySm" tone="accent" weight="semibold">{changeLabel}</Txt>
          </Pressable>
        ) : null}
      </View>

      {explanations.map((explanation) => (
        <View key={explanation.text} style={styles.why}>
          <Txt variant="caption" tone="subtle">{BASIS_LABEL[explanation.basis]}</Txt>
          <Txt variant="bodySm" tone="muted">{explanation.text}</Txt>
        </View>
      ))}

      {unavailableNote ? (
        <Txt variant="caption" tone="danger" style={styles.why}>{unavailableNote}</Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACE.md,
    marginBottom: SPACE.sm,
  },
  main: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: MIN_TOUCH },
  text: { flex: 1 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  change: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingLeft: SPACE.sm },
  why: { marginTop: SPACE.sm },
});
