import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONTS } from '../../constants/fonts';
import { MIN_TOUCH, RADIUS, SPACE, TYPE } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';
import { tap } from '../../utils/haptics';

type IconProps = { color: string };

const HomeIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    <Path d="M9 22V14h6v8" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
  </Svg>
);

const ProgressIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M4 20V13M10 20V8M16 20v-5M22 20H2" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    <Path d="M4 9l6-5 6 5 5-4" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const AnalyzeIcon = ({ color }: IconProps) => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Circle cx={12} cy={12} r={3.2} stroke={color} strokeWidth={2} />
  </Svg>
);

const PassportIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M5 3h11a3 3 0 013 3v15H5a1 1 0 01-1-1V4a1 1 0 011-1z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    <Circle cx={11.5} cy={10} r={2.6} stroke={color} strokeWidth={1.7} />
    <Path d="M8 15.5h7" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

const ProfileIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.7} />
    <Path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

/** Five tabs; the centre one is the raised "Analyze" action. */
const TABS = [
  { key: 'index', label: 'Home', href: '/(tabs)', Icon: HomeIcon },
  { key: 'progress', label: 'Progress', href: '/(tabs)/progress', Icon: ProgressIcon },
  { key: 'scan', label: 'Analyze', href: '/(tabs)/scan', Icon: AnalyzeIcon },
  { key: 'passport', label: 'Passport', href: '/(tabs)/passport', Icon: PassportIcon },
  { key: 'profile', label: 'Profile', href: '/(tabs)/profile', Icon: ProfileIcon },
] as const;

export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const activeKey = (() => {
    const match = TABS.slice(1).find((t) => pathname.startsWith(`/${t.key}`));
    return match ? match.key : 'index';
  })();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          paddingBottom: Math.max(insets.bottom, SPACE.sm),
        },
      ]}
    >
      {TABS.map(({ key, label, href, Icon }) => {
        const active = key === activeKey;
        const centre = key === 'scan';
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            onPress={() => { tap(); router.navigate(href as never); }}
            style={styles.tab}
          >
            {centre ? (
              <View style={[styles.centre, { backgroundColor: colors.gold, borderColor: colors.surface, shadowColor: colors.shadow }]}>
                <Icon color={colors.onAccent} />
              </View>
            ) : (
              <Icon color={active ? colors.gold : colors.textMuted} />
            )}
            <Text
              style={[
                TYPE.caption,
                {
                  fontFamily: active || centre ? FONTS.sansSemiBold : FONTS.sans,
                  color: active ? colors.gold : centre ? colors.text : colors.textMuted,
                  marginTop: 2,
                },
              ]}
            >
              {label}
            </Text>
            {active && !centre ? <View style={[styles.dot, { backgroundColor: colors.gold }]} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingTop: SPACE.sm,
    ...Platform.select({ web: { position: 'sticky' as never, bottom: 0 } }),
  },
  tab: { flex: 1, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  centre: {
    width: 58,
    height: 58,
    borderRadius: RADIUS.pill,
    borderWidth: 4,
    marginTop: -30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  dot: { width: 4, height: 4, borderRadius: RADIUS.pill, marginTop: 3 },
});
