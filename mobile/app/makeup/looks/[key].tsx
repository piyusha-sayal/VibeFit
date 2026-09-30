import React from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  Button, Card, EmptyState, LoadingState, PageHeader, Screen, Section, StatusBanner, Swatch, Txt,
} from '../../../components/ds';
import { success } from '../../../utils/haptics';
import { NumberedSteps } from '../../../components/makeup/NumberedSteps';
import { SPACE } from '../../../constants/theme';
import { useMakeupLook } from '../../../hooks/useFace';
import { useSaveLook } from '../../../hooks/useBeauty';

const ATTRIBUTE_LABEL: Record<string, string> = {
  eye_shape: 'eye shape',
  brow_shape: 'brow shape',
  lip_shape: 'lip shape',
  cheek_contour: 'cheek shape',
  facial_contrast: 'facial contrast',
};

/** Which zone section a technique's steps belong under. */
const ZONE_BY_ATTRIBUTE: Record<string, string> = {
  eye_shape: 'Eyes',
  brow_shape: 'Brows',
  lip_shape: 'Lips',
  cheek_contour: 'Cheeks',
};

const ZONE_ORDER = ['Eyes', 'Brows', 'Cheeks', 'Lips'];

export default function MakeupLookScreen() {
  const { key, occasion } = useLocalSearchParams<{ key: string; occasion?: string }>();
  const router = useRouter();
  const query = useMakeupLook(key ?? null, occasion);
  const saveLook = useSaveLook();

  if (query.isLoading) return <LoadingState label="Building your look…" />;
  if (!query.data) return <EmptyState title="We do not have that look" body="Pick one from the studio." />;

  const look = query.data;
  const palette = look.palette;

  const zoneTechniques = ZONE_ORDER
    .map((zone) => ({
      zone,
      techniques: look.techniques.filter((t) => ZONE_BY_ATTRIBUTE[t.basedOn] === zone),
    }))
    .filter((z) => z.techniques.length > 0);

  const baseTechniques = look.techniques.filter((t) => t.basedOn === 'facial_contrast');

  const saveLabel = saveLook.isSuccess ? 'Saved to your Passport' : saveLook.isPending ? 'Saving…' : 'Save to my Passport';

  return (
    <Screen>
      <PageHeader
        eyebrow={`${look.occasion ? `${look.occasion} · ` : ''}${look.aesthetic.minutes} minutes`}
        title={look.aesthetic.name}
        subtitle={look.aesthetic.summary}
      />

      {look.missingAttributes.length > 0 && (
        <StatusBanner
          tone="info"
          title="Some technique is still missing"
          body={`We have no technique for your ${look.missingAttributes.map((a) => ATTRIBUTE_LABEL[a] ?? a).join(', ')} yet. A selfie scan fills it in.`}
          actionLabel="Scan"
          onAction={() => router.push('/(tabs)/scan' as never)}
        />
      )}

      <Section title="Technique">
        <Card>
          <NumberedSteps steps={look.steps} />
        </Card>
      </Section>

      {zoneTechniques.map(({ zone, techniques }) => (
        <Section key={zone} title={zone}>
          {techniques.map((technique) => (
            <Card key={technique.key} variant="tinted" accent="lavender" style={{ marginBottom: SPACE.md }}>
              <Txt variant="heading">{technique.name}</Txt>
              <Txt variant="caption" tone="muted" style={{ marginTop: 2, marginBottom: SPACE.md }}>
                Because you confirmed your {ATTRIBUTE_LABEL[technique.basedOn] ?? technique.basedOn} is {technique.basedOnValue.replace('_', ' ')}
              </Txt>
              <NumberedSteps steps={technique.steps} />
              {technique.note ? (
                <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.xs }}>{technique.note}</Txt>
              ) : null}
            </Card>
          ))}
        </Section>
      ))}

      <Section title="Base">
        <Card>
          {look.foundation.shadeFamily ? (
            <Txt variant="body" weight="semibold" style={{ marginBottom: SPACE.sm }}>{look.foundation.shadeFamily}</Txt>
          ) : null}
          <NumberedSteps steps={look.foundation.howTo} />
          <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.sm }}>
            {look.foundation.disclaimer}
          </Txt>
        </Card>

        {baseTechniques.map((technique) => (
          <Card key={technique.key} variant="tinted" accent="lavender" style={{ marginTop: SPACE.md }}>
            <Txt variant="heading">{technique.name}</Txt>
            <View style={{ marginTop: SPACE.md }}>
              <NumberedSteps steps={technique.steps} />
            </View>
            {technique.note ? (
              <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.xs }}>{technique.note}</Txt>
            ) : null}
          </Card>
        ))}
      </Section>

      <Section title="Palette">
        {palette.seasonLabel ? (
          <Txt variant="bodySm" tone="muted" style={{ marginBottom: SPACE.md }}>
            Drawn from your {palette.seasonLabel}.
          </Txt>
        ) : null}
        {palette.seasonLabel ? (
          ([['Lips', palette.lipstick], ['Cheeks', palette.blush], ['Eyes', palette.eyeshadow]] as const).map(
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
          )
        ) : (
          <Card onPress={() => router.push('/colors' as never)}>
            <Txt variant="body">No colour season yet.</Txt>
            <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>
              Run a colour analysis and this look comes with your own shades →
            </Txt>
          </Card>
        )}
      </Section>

      <Button
        label={saveLabel}
        variant={saveLook.isSuccess ? 'secondary' : 'primary'}
        loading={saveLook.isPending}
        disabled={saveLook.isSuccess}
        style={{ marginTop: SPACE.xl }}
        onPress={() => saveLook.mutate({
          name: look.aesthetic.name,
          kind: 'makeup',
          status: 'want_to_try',
          occasion: look.occasion ?? undefined,
          payload: { aesthetic: look.aesthetic.key, season: palette.season },
        }, { onSuccess: () => success() })}
      />
      {saveLook.isSuccess ? (
        <View style={{ marginTop: SPACE.md }}>
          <StatusBanner
            tone="success"
            title="Saved to your Beauty Passport"
            actionLabel="View"
            onAction={() => router.push('/(tabs)/passport' as never)}
          />
        </View>
      ) : null}
    </Screen>
  );
}
