import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Txt } from '../ds';
import { PressScale } from '../ds/PressScale';
import { RADIUS, SPACE, accentPair } from '../../constants/theme';
import { TOOLS } from '../../constants/tools';
import { useTheme } from '../../theme/ThemeProvider';

/** Four across: a colourful icon tile per feature. */
export function ToolGrid() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={styles.grid}>
      {TOOLS.map((tool) => {
        const tint = accentPair(colors, tool.accent);
        return (
          <PressScale
            key={tool.key}
            onPress={() => router.push(tool.route as never)}
            accessibilityLabel={tool.label}
            containerStyle={styles.cell}
            style={styles.inner}
          >
            <View style={[styles.icon, { backgroundColor: tint.bg, borderColor: tint.fg }]}>
              <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
                {tool.emoji}
              </Text>
            </View>
            <Txt variant="caption" weight="semibold" numberOfLines={1} style={styles.label}>
              {tool.label}
            </Txt>
          </PressScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: SPACE.lg },
  cell: { width: '25%' },
  inner: { alignItems: 'center' },
  icon: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 28 },
  label: { marginTop: SPACE.xs, textAlign: 'center' },
});
