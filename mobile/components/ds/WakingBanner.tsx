/**
 * Tells the user the server is waking, rather than leaving a screen blank.
 *
 * The production instance sleeps when idle and takes about a minute to return.
 * This does not make that faster — it explains it, so a slow first load does
 * not read as a broken app.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Txt } from './index';
import { RADIUS, SPACE } from '../../constants/theme';
import { subscribeToWaking } from '../../services/coldStart';
import { useTheme } from '../../theme/ThemeProvider';

export function WakingBanner() {
  const { colors } = useTheme();
  const [waking, setWaking] = useState(false);

  useEffect(() => subscribeToWaking(setWaking), []);

  if (!waking) return null;

  return (
    <View
      style={[styles.banner, { backgroundColor: colors.goldSoft, borderColor: colors.border }]}
      accessibilityRole="alert"
    >
      <ActivityIndicator size="small" color={colors.gold} />
      <Txt variant="bodySm" tone="muted" style={{ flex: 1, marginLeft: SPACE.md }}>
        Waking the server. The first request after a quiet spell takes about a
        minute.
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACE.lg,
  },
});
