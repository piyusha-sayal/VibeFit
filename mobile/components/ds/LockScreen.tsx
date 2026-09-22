import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Txt } from './index';
import { SPACE, RADIUS } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';
import { useLockStore } from '../../store/lockStore';
import { capability, labelFor, type BiometricKind } from '../../services/biometrics';

/**
 * The lock in front of an already-signed-in session.
 *
 * It prompts once by itself, because a user who turned this on expects the
 * sensor, not a button. If they dismiss it, the button is there — dismissing
 * must not strand them on a screen with nothing to press.
 */
export function LockScreen() {
  const { colors } = useTheme();
  const attempt = useLockStore((s) => s.attempt);
  const error = useLockStore((s) => s.error);
  const [kind, setKind] = useState<BiometricKind>('none');
  const [prompted, setPrompted] = useState(false);

  useEffect(() => {
    void capability().then((c) => setKind(c.kind));
  }, []);

  useEffect(() => {
    if (prompted) return;
    setPrompted(true);
    void attempt();
  }, [prompted, attempt]);

  return (
    <View
      style={{
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: SPACE.xl, backgroundColor: colors.bg,
      }}
    >
      <Txt variant="heading" serif accessibilityRole="header"
           style={{ textAlign: 'center' }}>
        MyLookFit is locked
      </Txt>
      <Txt variant="bodySm" tone="muted"
           style={{ marginTop: SPACE.sm, textAlign: 'center' }}>
        {`Use your ${labelFor(kind)} to continue.`}
      </Txt>

      {error ? (
        <Txt variant="bodySm" tone="danger" live="assertive"
             style={{ marginTop: SPACE.lg, textAlign: 'center' }}>
          {error}
        </Txt>
      ) : null}

      <Pressable
        onPress={() => { void attempt(); }}
        accessibilityRole="button"
        accessibilityLabel="Unlock MyLookFit"
        style={{
          marginTop: SPACE.xl, paddingVertical: SPACE.md,
          paddingHorizontal: SPACE.xl, borderRadius: RADIUS.md,
          borderWidth: 1, borderColor: colors.gold,
          // 44dp minimum, so it stays a real target on a small phone.
          minHeight: 48, justifyContent: 'center',
        }}
      >
        <Txt variant="bodySm" style={{ color: colors.gold }}>Unlock</Txt>
      </Pressable>
    </View>
  );
}
