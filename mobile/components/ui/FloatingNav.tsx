import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter, usePathname } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { C } from '../../constants/colors';

const HomeIcon = ({ color }: { color: string }) => (
  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
    <Path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 22V14h6v8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ScanIcon = ({ color }: { color: string }) => (
  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
    <Path d="M2 8V5a2 2 0 012-2h3M2 16v3a2 2 0 002 2h3M22 8V5a2 2 0 00-2-2h-3M22 16v3a2 2 0 01-2 2h-3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Circle cx={12} cy={12} r={3.5} stroke={color} strokeWidth={1.8} />
  </Svg>
);

const ProfileIcon = ({ color }: { color: string }) => (
  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={1.8} />
    <Path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const ChatIcon = ({ color }: { color: string }) => (
  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TABS = [
  { route: '/(tabs)/', Icon: HomeIcon },
  { route: '/(tabs)/scan', Icon: ScanIcon },
  { route: '/(tabs)/results', Icon: ProfileIcon },
  { route: '/(tabs)/chat', Icon: ChatIcon },
] as const;

export function FloatingNav() {
  const router = useRouter();
  const pathname = usePathname();

  const activeIndex = TABS.findIndex((t) => {
    if (t.route === '/(tabs)/') return pathname === '/' || pathname === '/index';
    return pathname.includes(t.route.replace('/(tabs)/', ''));
  });

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <BlurView intensity={40} tint="dark" style={styles.nav}>
        {TABS.map(({ route, Icon }, i) => {
          const isActive = i === activeIndex || (i === 0 && activeIndex === -1);
          const color = isActive ? C.gold : C.textSubtle;
          return (
            <TouchableOpacity
              key={route}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => router.push(route as never)}
              activeOpacity={0.7}
            >
              <Icon color={color} />
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 44,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  nav: {
    flexDirection: 'row',
    borderRadius: 9999,
    padding: 7,
    paddingHorizontal: 8,
    gap: 4,
    borderWidth: 0.5,
    borderColor: C.goldBorder,
    overflow: 'hidden',
    backgroundColor: C.black92,
  },
  tab: {
    width: 48,
    height: 36,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: C.goldDim,
    borderWidth: 0.5,
    borderColor: C.goldBorder,
  },
});
