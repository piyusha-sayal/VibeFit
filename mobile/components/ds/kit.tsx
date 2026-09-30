/**
 * Layout and selection primitives shared by every redesigned screen.
 *
 * Each exists so a screen composes, rather than styles: one header, one hero,
 * one selectable card, one bottom sheet. Pressed states use onPressIn/Out
 * because NativeWind drops Pressable style callbacks on native.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Modal, Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HIT_SLOP, MIN_TOUCH, RADIUS, SPACE } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';
import { Button, Txt } from './index';

// ---------------------------------------------------------------- pressable

/** A Pressable with a theme-aware pressed state and no style callback. */
function Press({
  onPress, style, children, accessibilityLabel, accessibilityHint, accessibilityRole = 'button',
  accessibilityState, disabled,
}: {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'radio' | 'checkbox' | 'link';
  accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean };
  disabled?: boolean;
}) {
  const { reducedMotion } = useTheme();
  const [pressed, setPressed] = useState(false);
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[style, pressed && { opacity: 0.8, transform: reducedMotion ? [] : [{ scale: 0.985 }] }]}
    >
      {children}
    </Pressable>
  );
}

// -------------------------------------------------------------- icon button

export function IconButton({
  icon, onPress, accessibilityLabel, variant = 'surface', size = MIN_TOUCH,
}: {
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'surface' | 'gold' | 'plain';
  size?: number;
}) {
  const { colors } = useTheme();
  const bg = variant === 'gold' ? colors.gold : variant === 'surface' ? colors.surface : 'transparent';
  const fg = variant === 'gold' ? colors.onAccent : colors.text;
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: bg,
        borderWidth: variant === 'surface' ? StyleSheet.hairlineWidth * 2 : 0,
        borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Txt variant="h3" style={{ color: fg, lineHeight: size * 0.5 }}>{icon}</Txt>
    </Press>
  );
}

// ------------------------------------------------------------------ header

/** Back if there is history; otherwise Home, so a deep link never strands. */
function useGoBack() {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
}

/**
 * Back control for screens that draw their own title. Clears the status bar
 * on edge-to-edge Android, where those screens' scroll padding alone did not.
 */
export function BackBar() {
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: Math.max(insets.top - SPACE.xl, 0), marginLeft: -SPACE.md, marginBottom: SPACE.sm }}>
      <IconButton icon="‹" accessibilityLabel="Back" variant="plain" onPress={goBack} />
    </View>
  );
}

/** Screen header: back, eyebrow + serif title, optional right action. */
export function PageHeader({
  title, eyebrow, subtitle, right, back = true,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  right?: React.ReactNode;
  back?: boolean;
}) {
  const goBack = useGoBack();
  return (
    <View style={{ marginBottom: SPACE.xl }}>
      {back || right ? (
        <View style={styles.headerBar}>
          {back ? (
            <IconButton icon="‹" accessibilityLabel="Back" variant="plain" onPress={goBack} />
          ) : <View />}
          {right ?? null}
        </View>
      ) : null}
      {eyebrow ? <Txt variant="label" tone="accent" weight="semibold">{eyebrow}</Txt> : null}
      <Txt variant="h1" serif accessibilityRole="header" style={{ marginTop: eyebrow ? SPACE.xs : 0 }}>
        {title}
      </Txt>
      {subtitle ? <Txt variant="body" tone="muted" style={{ marginTop: SPACE.sm }}>{subtitle}</Txt> : null}
    </View>
  );
}

// -------------------------------------------------------------------- hero

/** Editorial feature card: the one thing a screen most wants you to see. */
export function Hero({
  eyebrow, title, body, actionLabel, onAction, art, style,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  art?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.gold }, style]}>
      <View style={{ flexDirection: 'row', gap: SPACE.lg, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          {eyebrow ? <Txt variant="label" tone="accent" weight="semibold">{eyebrow}</Txt> : null}
          <Txt variant="h2" serif accessibilityRole="header" style={{ marginTop: eyebrow ? SPACE.xs : 0 }}>
            {title}
          </Txt>
          {body ? <Txt variant="small" tone="muted" style={{ marginTop: SPACE.sm }}>{body}</Txt> : null}
        </View>
        {art ? <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{art}</View> : null}
      </View>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: SPACE.lg, alignSelf: 'flex-start' }} />
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------- feature card

/** A large entry to a studio. `wide` spans the row. */
export function FeatureCard({
  icon, title, subtitle, onPress, art, style,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  art?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={[styles.feature, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
    >
      {art ?? (icon ? (
        <View style={[styles.featureIcon, { backgroundColor: colors.goldSoft }]}>
          <Txt variant="h3">{icon}</Txt>
        </View>
      ) : null)}
      <Txt variant="body" weight="semibold" style={{ marginTop: SPACE.md }}>{title}</Txt>
      {subtitle ? <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>{subtitle}</Txt> : null}
    </Press>
  );
}

// ---------------------------------------------------------------- list row

export function ListRow({
  icon, title, subtitle, value, onPress, right, danger, last,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={[title, value, subtitle].filter(Boolean).join(', ')}
      style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
    >
      {icon ? <Txt variant="h3" style={{ width: 32 }}>{icon}</Txt> : null}
      <View style={{ flex: 1 }}>
        <Txt variant="body" weight="medium" tone={danger ? 'danger' : 'default'}>{title}</Txt>
        {subtitle ? <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>{subtitle}</Txt> : null}
      </View>
      {value ? <Txt variant="small" tone="muted" style={{ marginLeft: SPACE.sm }}>{value}</Txt> : null}
      {right ?? (onPress ? <Txt variant="h3" tone="subtle" style={{ marginLeft: SPACE.sm }}>›</Txt> : null)}
    </Press>
  );
}

/** A card that groups ListRows under an optional label. */
export function ListGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: SPACE.xl }}>
      {label ? (
        <Txt variant="label" tone="muted" weight="semibold" style={{ marginBottom: SPACE.sm }}>{label}</Txt>
      ) : null}
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

// ------------------------------------------------------------ select card

/**
 * A large selectable card. Selection shows as border, fill and a check mark,
 * so it never relies on colour alone.
 */
export function SelectCard({
  title, subtitle, art, selected, onPress, multi = false, style,
}: {
  title: string;
  subtitle?: string;
  art?: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Press
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={[
        styles.select,
        {
          backgroundColor: selected ? colors.goldSoft : colors.surface,
          borderColor: selected ? colors.gold : colors.border,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth * 2,
        },
        style,
      ]}
    >
      <View style={[styles.check, { borderColor: selected ? colors.gold : colors.borderStrong,
                                    backgroundColor: selected ? colors.gold : 'transparent' }]}>
        {selected ? <Txt variant="caption" weight="bold" style={{ color: colors.onAccent }}>✓</Txt> : null}
      </View>
      {art ? <View style={{ alignItems: 'center', marginBottom: SPACE.sm }}>{art}</View> : null}
      <Txt variant="body" weight="semibold">{title}</Txt>
      {subtitle ? <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>{subtitle}</Txt> : null}
    </Press>
  );
}

/** Row-style radio or checkbox for lists of short options. */
export function OptionRow({
  label, detail, selected, onPress, multi = false,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Press
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      style={styles.row}
    >
      <View style={[
        multi ? styles.box : styles.radio,
        { borderColor: selected ? colors.gold : colors.borderStrong },
        multi && selected && { backgroundColor: colors.gold },
      ]}>
        {selected ? (multi
          ? <Txt variant="caption" weight="bold" style={{ color: colors.onAccent }}>✓</Txt>
          : <View style={[styles.radioDot, { backgroundColor: colors.gold }]} />) : null}
      </View>
      <View style={{ flex: 1, marginLeft: SPACE.md }}>
        <Txt variant="body">{label}</Txt>
        {detail ? <Txt variant="caption" tone="muted">{detail}</Txt> : null}
      </View>
    </Press>
  );
}

// ---------------------------------------------------------------- stat tile

export function StatTile({ value, label, style }: { value: string | number; label: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
    >
      <Txt variant="h2" serif>{String(value)}</Txt>
      <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>{label}</Txt>
    </View>
  );
}

// ---------------------------------------------------------------- skeleton

/** Placeholder block that pulses, or holds still under reduced motion. */
export function Skeleton({ height = 16, width = '100%', radius = RADIUS.sm, style }: {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, reducedMotion } = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    if (reducedMotion) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse, reducedMotion]);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ height, width, borderRadius: radius, backgroundColor: colors.surfaceAlt, opacity: pulse }, style]}
    />
  );
}

/** A card-shaped loading placeholder with a spoken label. */
export function SkeletonCard({ lines = 3, label = 'Loading' }: { lines?: number; label?: string }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border, padding: SPACE.lg, gap: SPACE.sm }]}
    >
      <Skeleton height={22} width="60%" />
      {Array.from({ length: lines }, (_, i) => <Skeleton key={i} width={i === lines - 1 ? '40%' : '100%'} />)}
    </View>
  );
}

// ----------------------------------------------------------- status banner

type BannerTone = 'info' | 'success' | 'warning' | 'error' | 'offline' | 'waking';

const BANNER_ICON: Record<BannerTone, string> = {
  info: 'ℹ︎', success: '✓', warning: '!', error: '!', offline: '⌁', waking: '✦',
};

/** Inline status line. Waking reads as preparation, not failure. */
export function StatusBanner({ tone, title, body, actionLabel, onAction }: {
  tone: BannerTone;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  const palette = {
    info: [colors.goldSoft, colors.gold],
    waking: [colors.goldSoft, colors.gold],
    success: [colors.successSoft, colors.success],
    warning: [colors.warningSoft, colors.warning],
    error: [colors.dangerSoft, colors.danger],
    offline: [colors.surfaceAlt, colors.textMuted],
  }[tone];
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
      style={[styles.banner, { backgroundColor: palette[0] }]}
    >
      <Txt variant="body" weight="bold" style={{ color: palette[1], width: 22 }}>{BANNER_ICON[tone]}</Txt>
      <View style={{ flex: 1 }}>
        <Txt variant="small" weight="semibold">{title}</Txt>
        {body ? <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>{body}</Txt> : null}
      </View>
      {actionLabel && onAction ? (
        <Txt variant="small" weight="semibold" tone="accent" onPress={onAction}>{actionLabel}</Txt>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------------- sheet

/** Bottom sheet on a Modal: scrim tap and system back both close it. */
export function Sheet({ visible, onClose, title, children }: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const { colors, reducedMotion } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
                 onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised, paddingBottom: insets.bottom + SPACE.lg }]}>
        <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
        {title ? <Txt variant="h3" serif accessibilityRole="header" style={{ marginBottom: SPACE.md }}>{title}</Txt> : null}
        <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

// ----------------------------------------------------------- section block

/** A titled section with consistent spacing above the next one. */
export function Section({ title, action, onAction, children, style }: {
  title?: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ marginTop: SPACE.xxl }, style]}>
      {title ? (
        <View style={styles.sectionHead}>
          <Txt variant="h3" serif accessibilityRole="header" style={{ flex: 1 }}>{title}</Txt>
          {action && onAction ? (
            <Txt variant="small" weight="semibold" tone="accent" onPress={onAction}>{action}</Txt>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginLeft: -SPACE.md, marginBottom: SPACE.sm,
  },
  hero: { borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACE.xl },
  feature: {
    flex: 1, minHeight: 132, borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth * 2,
    padding: SPACE.lg,
  },
  featureIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: SPACE.md, paddingHorizontal: SPACE.lg },
  group: { borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
  select: { borderRadius: RADIUS.lg, padding: SPACE.lg, minHeight: MIN_TOUCH * 2 },
  check: {
    position: 'absolute', top: SPACE.sm, right: SPACE.sm, width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stat: { flex: 1, borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth * 2, padding: SPACE.lg },
  banner: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderRadius: RADIUS.md, padding: SPACE.md },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '85%',
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, paddingHorizontal: SPACE.xl, paddingTop: SPACE.sm,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: SPACE.lg },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', marginBottom: SPACE.md },
});
