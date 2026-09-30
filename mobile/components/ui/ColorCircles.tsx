import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  colors: string[];
  size?: number;
}

export function ColorCircles({ colors, size = 46 }: Props) {
  // The border and rim light come from the active theme, so a stack of
  // swatches reads as inset on either ground rather than always on black.
  const { colors: theme } = useTheme();
  const overlap = Math.round(size * 0.26);

  return (
    <View style={styles.row}>
      {colors.map((color, i) => (
        <View
          key={`${color}-${i}`}
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              borderColor: theme.bg,
              shadowColor: theme.gold,
              marginLeft: i > 0 ? -overlap : 0,
              zIndex: colors.length - i,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 0.5,
  },
});
