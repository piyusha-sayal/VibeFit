/**
 * The bottom sheet that replaces one component of a look.
 *
 * It only ever knows about one component. Choosing from it hands a selection
 * back to the builder, which swaps that component and leaves everything else
 * exactly where it was — the sheet itself never rebuilds a look.
 *
 * Alternatives are browsed vertically rather than in a cramped horizontal
 * strip, because a list of thirty garments is a list, not a carousel.
 */
import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Chip, ErrorState, LoadingState, Txt } from '../ds';
import { HIT_SLOP, MIN_TOUCH, RADIUS, SPACE } from '../../constants/theme';
import type { LookOption, Verdict } from '../../services/lookService';
import { useTheme } from '../../theme/ThemeProvider';

export interface ComponentSheetProps {
  visible: boolean;
  title: string;
  /** Shown under the title — say what the choice actually affects. */
  subtitle?: string | null;
  options: LookOption[];
  currentKey?: string | null;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onSelect: (option: LookOption) => void;
  onFeedback?: (option: LookOption, verdict: Verdict) => void;
  onClose: () => void;
}

export function ComponentSheet({
  visible, title, subtitle, options, currentKey, loading, error,
  onRetry, onSelect, onFeedback, onClose,
}: ComponentSheetProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={[styles.scrim, { backgroundColor: colors.scrim }]}
        onPress={onClose}
      />
      <View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Txt variant="heading" serif accessibilityRole="header">{title}</Txt>
            {subtitle ? (
              <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{subtitle}</Txt>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={HIT_SLOP}
            onPress={onClose}
            style={styles.close}
          >
            <Txt variant="body" tone="muted">Done</Txt>
          </Pressable>
        </View>

        {loading ? (
          <LoadingState label="Finding alternatives…" />
        ) : error ? (
          <ErrorState message="We could not load the alternatives." onRetry={onRetry} />
        ) : options.length === 0 ? (
          <Txt variant="bodySm" tone="muted" style={styles.empty}>
            Nothing else to offer here yet.
          </Txt>
        ) : (
          <FlatList
            data={options}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <OptionRow
                option={item}
                selected={item.key === currentKey}
                onSelect={() => onSelect(item)}
                onFeedback={onFeedback}
              />
            )}
          />
        )}
      </View>
    </Modal>
  );
}

function OptionRow({ option, selected, onSelect, onFeedback }: {
  option: LookOption;
  selected: boolean;
  onSelect: () => void;
  onFeedback?: (option: LookOption, verdict: Verdict) => void;
}) {
  const { colors } = useTheme();
  const swatch = option.meta === 'colour' || option.meta === 'lipstick' ? option.key : null;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: selected ? colors.goldSoft : colors.surface,
          borderColor: selected ? colors.gold : colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={option.name}
        onPress={onSelect}
        style={styles.rowMain}
      >
        {swatch ? (
          <View style={[styles.swatch, { backgroundColor: swatch, borderColor: colors.border }]} />
        ) : null}
        <View style={styles.rowText}>
          <Txt variant="body" weight={selected ? 'semibold' : 'regular'}>{option.name}</Txt>
          {option.detail ? (
            <Txt variant="bodySm" tone="muted" numberOfLines={2} style={{ marginTop: 2 }}>
              {option.detail}
            </Txt>
          ) : null}
          {option.reasons?.length ? (
            <Txt variant="caption" tone="subtle" numberOfLines={1} style={{ marginTop: 2 }}>
              {option.reasons[0]}
            </Txt>
          ) : null}
        </View>
        {option.meta && !swatch ? (
          <Txt variant="caption" tone="subtle">{option.meta}</Txt>
        ) : null}
      </Pressable>

      {onFeedback ? (
        <View style={styles.verdicts}>
          <Chip
            label={option.verdict === 'love' ? '♥ Loved' : '♥'}
            accent="blush"
            selected={option.verdict === 'love'}
            onPress={() => onFeedback(option, 'love')}
          />
          <Chip
            label={option.verdict === 'not_my_style' ? 'Not my style' : 'Not for me'}
            accent="sage"
            selected={option.verdict === 'not_my_style'}
            onPress={() => onFeedback(option, 'not_my_style')}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1 },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: SPACE.xl,
  },
  grabber: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: SPACE.sm, marginBottom: SPACE.xs,
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: SPACE.xl, paddingTop: SPACE.sm, paddingBottom: SPACE.md, gap: SPACE.md,
  },
  headerText: { flex: 1 },
  close: { minHeight: MIN_TOUCH, justifyContent: 'center' },
  list: { paddingHorizontal: SPACE.xl, paddingBottom: SPACE.xl, gap: SPACE.sm },
  empty: { paddingHorizontal: SPACE.xl, paddingBottom: SPACE.xl },
  row: { borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  rowMain: {
    flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
    padding: SPACE.md, minHeight: MIN_TOUCH,
  },
  rowText: { flex: 1 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  verdicts: {
    flexDirection: 'row', gap: SPACE.sm,
    paddingHorizontal: SPACE.md, paddingBottom: SPACE.md,
  },
});
