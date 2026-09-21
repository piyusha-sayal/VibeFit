import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONTS } from '../../constants/fonts';
import { MIN_TOUCH, RADIUS, SPACE, TYPE } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';

type IconProps = { color: string };

const HomeIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    <Path d="M9 22V14h6v8" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
  </Svg>
);

const DiscoverIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.7} />
    <Path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
  </Svg>
);

const CreateIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3v18M3 12h18" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.7} opacity={0.35} />
  </Svg>
);

const PassportIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M5 3h11a3 3 0 013 3v15H5a1 1 0 01-1-1V4a1 1 0 011-1z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    <Circle cx={11.5} cy={10} r={2.6} stroke={color} strokeWidth={1.7} />
    <Path d="M8 15.5h7" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

const MoreIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx={5} cy={12} r={1.6} fill={color} />
    <Circle cx={12} cy={12} r={1.6} fill={color} />
    <Circle cx={19} cy={12} r={1.6} fill={color} />
  </Svg>
);

/** One route per experience: no feature is reachable from two tabs. */
const TABS = [
  { key: 'index', label: 'Home', href: '/(tabs)', Icon: HomeIcon },
  { key: 'discover', label: 'Discover', href: '/(tabs)/discover', Icon: DiscoverIcon },
  { key: 'create', label: 'Create', href: '/(tabs)/create', Icon: CreateIcon },
  { key: 'passport', label: 'Passport', href: '/(tabs)/passport', Icon: PassportIcon },
  { key: 'more', label: 'More', href: '/(tabs)/more', Icon: MoreIcon },
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
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            onPress={() => router.navigate(href as never)}
            style={styles.tab}
          >
            <Icon color={active ? colors.text : colors.textSubtle} />
            <Text
              style={[
                TYPE.caption,
                {
                  fontFamily: active ? FONTS.sansSemiBold : FONTS.sans,
                  color: active ? colors.text : colors.textSubtle,
                  marginTop: 2,
                },
              ]}
            >
              {label}
            </Text>
            {active ? <View style={[styles.dot, { backgroundColor: colors.gold }]} /> : null}
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
  dot: { width: 4, height: 4, borderRadius: RADIUS.pill, marginTop: 3 },
});
