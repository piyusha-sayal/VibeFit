/**
 * VibeFit design-system primitives.
 *
 * Everything here reads its colours from the active theme at render time, so a
 * theme switch repaints without a reload. Loading, empty and error states are
 * components rather than ad-hoc JSX because every data screen owes the user all
 * three.
 */
import React from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextStyle,
  TouchableOpacity, View, ViewStyle,
} from 'react-native';

import { FONTS } from '../../constants/fonts';
import { AccentKey, HIT_SLOP, MIN_TOUCH, RADIUS, SPACE, TYPE, accentPair } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';

// ---------------------------------------------------------------- typography

type TextTone = 'default' | 'muted' | 'subtle' | 'accent' | 'danger' | 'success';

interface TxtProps {
  children: React.ReactNode;
  variant?: keyof typeof TYPE;
  tone?: TextTone;
  serif?: boolean;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
  accessibilityRole?: 'header' | 'text' | 'link';
  onPress?: () => void;
}

export function Txt({
  children, variant = 'body', tone = 'default', serif = false,
  weight = 'regular', style, numberOfLines, accessibilityRole, onPress,
}: TxtProps) {
  const { colors } = useTheme();
  const toneColor = {
    default: colors.text,
    muted: colors.textMuted,
    subtle: colors.textSubtle,
    accent: colors.gold,
    danger: colors.danger,
    success: colors.success,
  }[tone];
  const family = serif
    ? FONTS.serif
    : { regular: FONTS.sans, medium: FONTS.sansMedium, semibold: FONTS.sansSemiBold, bold: FONTS.sansBold }[weight];

  return (
    <Text
      accessibilityRole={onPress ? 'link' : accessibilityRole}
      onPress={onPress}
      numberOfLines={numberOfLines}
      style={[TYPE[variant], { color: toneColor, fontFamily: family }, style]}
    >
      {children}
    </Text>
  );
}

// --------------------------------------------------------------------- cards

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  accent?: AccentKey;
  /** `tinted` washes the card in its accent; `plain` keeps it on surface. */
  variant?: 'plain' | 'tinted' | 'outlined';
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function Card({ children, onPress, accent, variant = 'plain', style, accessibilityLabel }: CardProps) {
  const { colors, reducedMotion } = useTheme();
  const tint = accent ? accentPair(colors, accent) : null;

  const base: ViewStyle = {
    backgroundColor: variant === 'tinted' && tint ? tint.bg : variant === 'outlined' ? 'transparent' : colors.surface,
    borderColor: variant === 'tinted' && tint ? 'transparent' : colors.border,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RADIUS.lg,
    padding: SPACE.lg,
  };

  if (!onPress) return <View style={[base, style]}>{children}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        base,
        style,
        pressed && { opacity: reducedMotion ? 0.9 : 0.75, transform: reducedMotion ? [] : [{ scale: 0.99 }] },
      ]}
    >
      {children}
    </Pressable>
  );
}

// ------------------------------------------------------------------- buttons

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

export function Button({
  label, onPress, variant = 'primary', loading, disabled, style, accessibilityHint,
}: ButtonProps) {
  const { colors, reducedMotion } = useTheme();
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      accessibilityHint={accessibilityHint}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isPrimary ? colors.text : isGhost ? 'transparent' : colors.surface,
          borderColor: isGhost ? 'transparent' : isPrimary ? colors.text : colors.borderStrong,
          opacity: inactive ? 0.5 : pressed && !reducedMotion ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isPrimary ? colors.bg : colors.text} />
      ) : (
        <Text
          style={[
            TYPE.body,
            { fontFamily: FONTS.sansSemiBold, color: isPrimary ? colors.bg : colors.text },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

// --------------------------------------------------------------------- chips

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  accent?: AccentKey;
}

export function Chip({ label, selected, onPress, accent = 'gold' }: ChipProps) {
  const { colors } = useTheme();
  const tint = accentPair(colors, accent);

  return (
    <TouchableOpacity
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!selected }}
      hitSlop={HIT_SLOP}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? tint.bg : colors.surface,
          borderColor: selected ? tint.fg : colors.border,
        },
      ]}
    >
      <Text
        style={[
          TYPE.bodySm,
          { fontFamily: selected ? FONTS.sansSemiBold : FONTS.sans, color: selected ? tint.fg : colors.textMuted },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ------------------------------------------------------------------ sections

export function SectionHeader({
  title, action, onAction, style,
}: { title: string; action?: string; onAction?: () => void; style?: ViewStyle }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Txt variant="heading" serif accessibilityRole="header">{title}</Txt>
      {action && onAction ? (
        <TouchableOpacity accessibilityRole="button" hitSlop={HIT_SLOP} onPress={onAction}>
          <Txt variant="bodySm" tone="accent" weight="semibold">{action}</Txt>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------------- states

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="progressbar" style={styles.state}>
      <ActivityIndicator color={colors.gold} />
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.md }}>{label}</Txt>
    </View>
  );
}

export function EmptyState({
  title, body, actionLabel, onAction,
}: { title: string; body: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.state}>
      <Txt variant="heading" serif style={{ textAlign: 'center' }}>{title}</Txt>
      <Txt variant="bodySm" tone="muted" style={{ textAlign: 'center', marginTop: SPACE.sm }}>{body}</Txt>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: SPACE.lg, alignSelf: 'center' }} />
      ) : null}
    </View>
  );
}

export function ErrorState({
  message, onRetry,
}: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.state, { backgroundColor: colors.dangerSoft, borderRadius: RADIUS.md }]}>
      <Txt variant="bodySm" tone="danger" style={{ textAlign: 'center' }}>{message}</Txt>
      {onRetry ? (
        <Button label="Try again" variant="secondary" onPress={onRetry} style={{ marginTop: SPACE.md }} />
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------------ progress

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      accessibilityLabel={label}
    >
      <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: colors.gold }]} />
      </View>
    </View>
  );
}

// -------------------------------------------------------------------- swatch

interface SwatchProps {
  hex: string;
  name?: string;
  size?: number;
  selected?: boolean;
  onPress?: () => void;
}

export function Swatch({ hex, name, size = 56, selected, onPress }: SwatchProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={name ? `${name}, ${hex}` : hex}
      accessibilityState={{ selected: !!selected }}
      disabled={!onPress}
      onPress={onPress}
      style={{ alignItems: 'center', width: size + SPACE.md }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: RADIUS.md,
          backgroundColor: hex,
          borderWidth: selected ? 2.5 : StyleSheet.hairlineWidth * 2,
          borderColor: selected ? colors.text : colors.borderStrong,
        }}
      />
      {name ? (
        <Txt variant="caption" tone="muted" numberOfLines={2} style={{ textAlign: 'center', marginTop: SPACE.xs }}>
          {name}
        </Txt>
      ) : null}
    </TouchableOpacity>
  );
}

// ------------------------------------------------------------------ screen

export function Screen({
  children, scroll = true, padded = true,
}: { children: React.ReactNode; scroll?: boolean; padded?: boolean }) {
  const { colors } = useTheme();
  const body = (
    <View style={padded ? { paddingHorizontal: SPACE.xl, paddingBottom: SPACE.xxxl * 2 } : undefined}>
      {children}
    </View>
  );
  if (!scroll) return <View style={{ flex: 1, backgroundColor: colors.bg }}>{body}</View>;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: SPACE.xxl }}
      showsVerticalScrollIndicator={false}
    >
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: SPACE.xl,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: SPACE.md,
  },
  state: { paddingVertical: SPACE.xxl, paddingHorizontal: SPACE.lg, alignItems: 'center' },
  track: { height: 6, borderRadius: RADIUS.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: RADIUS.pill },
});
