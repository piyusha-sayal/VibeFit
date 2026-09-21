import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Card, EmptyState, LoadingState, SectionHeader, Swatch, Txt } from '../../../components/ds';
import { SPACE } from '../../../constants/theme';
import { useMakeupLook } from '../../../hooks/useFace';
import { useSaveLook } from '../../../hooks/useBeauty';
import { useTheme } from '../../../theme/ThemeProvider';

const ATTRIBUTE_LABEL: Record<string, string> = {
  eye_shape: 'eye shape',
  brow_shape: 'brow shape',
  lip_shape: 'lip shape',
  cheek_contour: 'cheek shape',
  facial_contrast: 'facial contrast',
};

export default function MakeupLookScreen() {
  const { key, occasion } = useLocalSearchParams<{ key: string; occasion?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const query = useMakeupLook(key ?? null, occasion);
  const saveLook = useSaveLook();

  if (query.isLoading) return <LoadingState label="Building your look…" />;
  if (!query.data) return <EmptyState title="We do not have that look" body="Pick one from the studio." />;

  const look = query.data;
  const palette = look.palette;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="overline" tone="muted">
        {look.occasion ? `${look.occasion} · ` : ''}{look.aesthetic.minutes} minutes
      </Txt>
      <Txt variant="display" serif style={{ marginTop: 2 }}>{look.aesthetic.name}</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: SPACE.xs }}>{look.aesthetic.summary}</Txt>

      <SectionHeader title="The look" style={{ marginTop: SPACE.xl }} />
      <Card>
        {look.steps.map((step) => (
          <Txt key={step} variant="body" style={{ marginBottom: SPACE.sm }}>• {step}</Txt>
        ))}
      </Card>

      {look.techniques.length > 0 && (
        <>
          <SectionHeader title="For your features" style={{ marginTop: SPACE.xl }} />
          {look.techniques.map((technique) => (
            <Card key={technique.key} variant="tinted" accent="lavender" style={{ marginBottom: SPACE.md }}>
              <Txt variant="heading">{technique.name}</Txt>
              <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                Because you confirmed your {ATTRIBUTE_LABEL[technique.basedOn] ?? technique.basedOn} is {technique.basedOnValue.replace('_', ' ')}
              </Txt>
              <View style={{ marginTop: SPACE.md }}>
                {technique.steps.map((step) => (
                  <Txt key={step} variant="bodySm" style={{ marginBottom: SPACE.xs }}>• {step}</Txt>
                ))}
              </View>
              {technique.note ? (
                <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.xs }}>{technique.note}</Txt>
              ) : null}
            </Card>
          ))}
        </>
      )}

      {look.missingAttributes.length > 0 && (
        <Card
          style={{ marginTop: SPACE.lg }}
          onPress={() => router.push('/face/features' as never)}
        >
          <Txt variant="body">
            We have no technique for your{' '}
            {look.missingAttributes.map((a) => ATTRIBUTE_LABEL[a] ?? a).join(', ')} yet.
          </Txt>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>
            Confirm them in the feature explorer and this look fills in →
          </Txt>
        </Card>
      )}

      {palette.seasonLabel ? (
        <>
          <SectionHeader title={`Colours from your ${palette.seasonLabel}`} style={{ marginTop: SPACE.xl }} />
          {([['Lips', palette.lipstick], ['Cheeks', palette.blush], ['Eyes', palette.eyeshadow]] as const).map(
            ([label, swatches]) => (
              swatches.length ? (
                <View key={label} style={{ marginBottom: SPACE.lg }}>
                  <Txt variant="overline" tone="muted">{label}</Txt>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SPACE.sm }}>
                    {swatches.map((s) => <Swatch key={s.hex} hex={s.hex} name={s.name} size={48} />)}
                  </ScrollView>
                </View>
              ) : null
            ),
          )}
        </>
      ) : (
        <Card style={{ marginTop: SPACE.xl }} onPress={() => router.push('/colors' as never)}>
          <Txt variant="body">No colour season yet.</Txt>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>
            Run a colour analysis and this look comes with your own shades →
          </Txt>
        </Card>
      )}

      <SectionHeader title="Base" style={{ marginTop: SPACE.xl }} />
      <Card>
        {look.foundation.shadeFamily ? (
          <Txt variant="body" style={{ marginBottom: SPACE.sm }}>{look.foundation.shadeFamily}</Txt>
        ) : null}
        {look.foundation.howTo.map((line) => (
          <Txt key={line} variant="bodySm" style={{ marginBottom: SPACE.xs }}>• {line}</Txt>
        ))}
        <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.sm }}>
          {look.foundation.disclaimer}
        </Txt>
      </Card>

      <Txt
        variant="body"
        tone="accent"
        weight="semibold"
        style={{ marginTop: SPACE.xl }}
        onPress={() => saveLook.mutate({
          name: look.aesthetic.name,
          kind: 'makeup',
          status: 'want_to_try',
          occasion: look.occasion ?? undefined,
          payload: { aesthetic: look.aesthetic.key, season: palette.season },
        })}
      >
        {saveLook.isSuccess ? 'Saved to your Passport' : saveLook.isPending ? 'Saving…' : 'Save to my Passport'}
      </Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
});
