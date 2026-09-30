import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Card, Chip, ErrorState, LoadingState, PageHeader, Screen, Section, StatusBanner, Txt,
} from '../../components/ds';
import { FaceFigure, INSPIRATION_NOTE } from '../../components/visual';
import type { BlushPlacement, LinerStyle } from '../../components/visual/shapes';
import { SPACE } from '../../constants/theme';
import { useAesthetics, useFaceProfile } from '../../hooks/useFace';
import { usePersona } from '../../hooks/usePersona';
import { makeupPicks, orderByPicks } from '../../constants/personalise';

/** Which zones an aesthetic actually emphasises, for the illustration. */
/** Where the blush sits, per aesthetic. A swatch shows the colour; it cannot
    show that a Korean gradient sits on the apples and full glam sits along the
    bone. */
const BLUSH: Record<string, BlushPlacement> = {
  natural: 'apples',
  clean_girl: 'apples',
  glass_skin: 'apples',
  korean_gradient: 'apples',
  soft_glam: 'cheekbone',
  full_glam: 'cheekbone',
  indian_bridal: 'draped',
  festive_indian: 'draped',
  monochrome: 'sunburst',
  editorial: 'draped',
};

/** The liner shape, which is the difference between smokey and soft glam. */
const LINER: Record<string, LinerStyle> = {
  no_makeup: 'none',
  natural: 'tightline',
  clean_girl: 'tightline',
  glass_skin: 'none',
  korean_gradient: 'tightline',
  soft_glam: 'winged',
  full_glam: 'winged',
  indian_bridal: 'winged',
  festive_indian: 'winged',
  smokey: 'smudged',
  editorial: 'graphic',
  monochrome: 'smudged',
};

const EMPHASIS: Record<string, ('eyes' | 'lips' | 'cheeks' | 'brows')[]> = {
  natural: ['cheeks'],
  no_makeup: ['brows'],
  clean_girl: ['cheeks', 'brows'],
  glass_skin: ['cheeks'],
  korean_gradient: ['lips', 'cheeks'],
  soft_glam: ['eyes', 'lips'],
  full_glam: ['eyes', 'lips', 'cheeks'],
  indian_bridal: ['eyes', 'lips', 'brows'],
  festive_indian: ['eyes', 'lips'],
  smokey: ['eyes'],
  monochrome: ['lips', 'cheeks'],
  editorial: ['eyes', 'brows'],
  vintage: ['eyes', 'lips'],
  office: ['brows', 'lips'],
};

const OCCASIONS = ['everyday', 'work', 'evening', 'wedding', 'festival', 'photography'] as const;
const TIMES = [5, 10, 20, 40] as const;

function prettify(value: string): string {
  return value.replace(/_/g, ' ');
}

export default function MakeupStudioScreen() {
  const router = useRouter();
  const [occasion, setOccasion] = useState<string | undefined>();
  const [minutes, setMinutes] = useState<number | undefined>();
  const query = useAesthetics(occasion, minutes);
  const profile = useFaceProfile();
  const persona = usePersona();
  const picks = makeupPicks(persona.ageRange, persona.genderPresentation);

  const unset = profile.data?.attributes.filter((a) => !a.value).length ?? 0;
  const season = profile.data?.context.season ?? null;

  return (
    <Screen>
      <PageHeader
        title="Makeup Studio"
        subtitle="Fourteen aesthetics, and technique drawn from the features you have confirmed."
      />

      {unset > 0 ? (
        <StatusBanner
          tone="info"
          title={`${unset} ${unset === 1 ? 'feature is' : 'features are'} still unset`}
          body="Take a selfie scan and they fill in automatically."
          actionLabel="Scan"
          onAction={() => router.push('/(tabs)/scan' as never)}
        />
      ) : null}

      <StatusBanner
        tone={season ? 'success' : 'info'}
        title={season ? `Palette ready: ${prettify(season)}` : 'No palette yet'}
        body={season
          ? 'Every look below can draw its lip, cheek and eye colours from your season.'
          : 'Run a colour analysis and looks come with your own lip, cheek and eye shades.'}
        actionLabel={season ? 'View palette' : 'Run analysis'}
        onAction={() => router.push('/colors' as never)}
      />

      <Section title="Occasion">
        <View style={styles.chips}>
          {OCCASIONS.map((o) => (
            <Chip
              key={o}
              label={o}
              accent="blush"
              selected={occasion === o}
              onPress={() => setOccasion(occasion === o ? undefined : o)}
            />
          ))}
        </View>

        <Txt variant="overline" tone="muted" style={{ marginTop: SPACE.lg }}>Time you have</Txt>
        <View style={styles.chips}>
          {TIMES.map((t) => (
            <Chip
              key={t}
              label={`${t} min`}
              accent="peach"
              selected={minutes === t}
              onPress={() => setMinutes(minutes === t ? undefined : t)}
            />
          ))}
        </View>
      </Section>

      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState message="We could not load the aesthetics." onRetry={() => { void query.refetch(); }} />
      ) : (
        <Section title={`${query.data!.count} looks`}>
          {orderByPicks(query.data!.aesthetics, picks).map((aesthetic) => (
            <Card
              key={aesthetic.key}
              style={{ marginBottom: SPACE.md }}
              onPress={() => router.push(
                `/makeup/looks/${aesthetic.key}${occasion ? `?occasion=${occasion}` : ''}` as never,
              )}
              accessibilityLabel={`${aesthetic.name}, ${aesthetic.minutes} minutes`}
            >
              <View style={styles.row}>
                <FaceFigure
                  seed={aesthetic.key}
                  size={76}
                  emphasis={EMPHASIS[aesthetic.key] ?? ['lips']}
                  blush={BLUSH[aesthetic.key] ?? 'none'}
                  liner={LINER[aesthetic.key] ?? 'none'}
                  label={`${aesthetic.name}, schematic illustration`}
                />
                <View style={{ flex: 1, marginLeft: SPACE.md }}>
                  <View style={styles.rowBetween}>
                    <Txt variant="heading">{aesthetic.name}</Txt>
                    <Txt variant="caption" tone="muted">{aesthetic.minutes} min</Txt>
                  </View>
                  <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>
                    {aesthetic.summary}
                  </Txt>
                  <View style={styles.chipsTight}>
                    {aesthetic.intensity ? <Chip label={prettify(aesthetic.intensity)} accent="sage" /> : null}
                    {aesthetic.occasions[0] ? <Chip label={prettify(aesthetic.occasions[0])} accent="lavender" /> : null}
                  </View>
                  {picks.includes(aesthetic.key) ? (
                    <Txt variant="caption" tone="accent" weight="semibold" style={{ marginTop: SPACE.xs }}>
                      ✨ Picked for you
                    </Txt>
                  ) : null}
                </View>
              </View>
              {aesthetic.reasons.slice(0, 1).map((reason) => (
                <Txt key={reason} variant="bodySm" style={{ marginTop: SPACE.sm }}>• {reason}</Txt>
              ))}
            </Card>
          ))}
          <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.md }}>
            {INSPIRATION_NOTE}
          </Txt>
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.sm },
  chipsTight: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs, marginTop: SPACE.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
});
