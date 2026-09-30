import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Txt } from '../ds';
import { SPACE } from '../../constants/theme';
import { useBiometricLock } from '../../hooks/useBiometricLock';
import { useAuthStore } from '../../store/authStore';
import { success } from '../../utils/haptics';

const dismissedKey = (userId: string) => `mylookfit.biometricOffer.dismissed.${userId}`;

/**
 * A one-time offer to turn on fingerprint / face unlock, shown on Home until
 * it is accepted or dismissed. Hidden on devices that cannot do it.
 */
export function BiometricOffer() {
  const userId = useAuthStore((s) => s.user?.id) ?? null;
  const lock = useBiometricLock();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) return;
    AsyncStorage.getItem(dismissedKey(userId))
      .then((v) => setDismissed(v === '1'))
      .catch(() => setDismissed(false));
  }, [userId]);

  if (!userId || dismissed !== false || !lock.capability?.available || lock.enabled) return null;

  const dismiss = () => {
    setDismissed(true);
    AsyncStorage.setItem(dismissedKey(userId), '1').catch(() => undefined);
  };

  const enable = async () => {
    if (await lock.toggle(true)) success();
  };

  return (
    <Card variant="tinted" accent="lavender">
      <View style={styles.row}>
        <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">🔐</Text>
        <View style={{ flex: 1 }}>
          <Txt variant="body" weight="semibold">Unlock with {lock.label}</Txt>
          <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
            Stay signed in and open MyLookFit with a touch. You can change this in Profile.
          </Txt>
        </View>
      </View>
      {lock.error ? <Txt variant="caption" tone="danger" live="polite" style={{ marginTop: SPACE.sm }}>{lock.error}</Txt> : null}
      <View style={styles.actions}>
        <Button label="Not now" variant="ghost" onPress={dismiss} style={{ flex: 1 }} />
        <Button label="Turn on" loading={lock.busy} onPress={() => { void enable(); }} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  emoji: { fontSize: 30 },
  actions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md },
});
