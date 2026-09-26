import { Pressable, View } from 'react-native';

import { Txt } from './index';
import { SPACE, RADIUS } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/authStore';
import { useEligibilityStore } from '../../store/eligibilityStore';

/**
 * The 18+ eligibility confirmation, asked once per account.
 *
 * No date of birth: a yes/no statement is all v1 needs. Copy is pending
 * legal review and must not be presented as age verification.
 */
export function AgeGate() {
  const { colors } = useTheme();
  const state = useEligibilityStore((s) => s.state);
  const confirm = useEligibilityStore((s) => s.confirm);
  const decline = useEligibilityStore((s) => s.decline);
  const logout = useAuthStore((s) => s.logout);
  const declined = state === 'declined';

  const button = (label: string, onPress: () => void, primary: boolean) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        marginTop: SPACE.md, paddingVertical: SPACE.md,
        paddingHorizontal: SPACE.xl, borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: primary ? colors.gold : colors.border,
        minHeight: 48, minWidth: 240, alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Txt variant="bodySm" style={{ color: primary ? colors.gold : colors.text }}>{label}</Txt>
    </Pressable>
  );

  return (
    <View
      style={{
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: SPACE.xl, backgroundColor: colors.bg,
      }}
    >
      <Txt variant="heading" serif accessibilityRole="header" style={{ textAlign: 'center' }}>
        {declined ? 'MyLookFit is for adults' : 'One quick check'}
      </Txt>
      <Txt variant="bodySm" tone="muted" live="polite"
           style={{ marginTop: SPACE.sm, textAlign: 'center' }}>
        {declined
          ? 'Sorry, MyLookFit is only available to people aged 18 and over.'
          : 'MyLookFit analyses face photos to suggest colours and styles, so it is '
            + 'for people aged 18 and over. Please confirm your age to continue.'}
      </Txt>

      {declined ? (
        button('Sign out', () => { void logout(); }, true)
      ) : (
        <>
          {button("I'm 18 or older", () => { void confirm(); }, true)}
          {button("I'm under 18", decline, false)}
          <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.lg, textAlign: 'center' }}>
            This confirms eligibility to use the app. It is not identity or age
            verification, and we do not ask for your date of birth.
          </Txt>
        </>
      )}
    </View>
  );
}
