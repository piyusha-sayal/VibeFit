import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, Chip, ErrorState, LoadingState, SectionHeader, Txt } from '../../components/ds';
import { FaceFigure, INSPIRATION_NOTE } from '../../components/visual';
import type { BlushPlacement, LinerStyle } from '../../components/visual/shapes';
import { SPACE } from '../../constants/theme';
import { useAesthetics, useFaceProfile } from '../../hooks/useFace';
import { useTheme } from '../../theme/ThemeProvider';

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

export default function MakeupStudioScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [occasion, setOccasion] = useState<string | undefined>();
  const [minutes, setMinutes] = useState<number | undefined>();
  const query = useAesthetics(occasion, minutes);
  const profile = useFaceProfile();

  const unset = profile.data?.attributes.filter((a) => !a.value).length ?? 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Makeup Studio</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        Fourteen aesthetics, and technique drawn from the features you have confirmed.
      </Txt>

      {unset > 0 && (
        <Card
          variant="tinted"
          accent="lavender"
          style={{ marginTop: SPACE.lg }}
          onPress={() => router.push('/face/features' as never)}
        >
          <Txt variant="body">
            {unset} {unset === 1 ? 'feature is' : 'features are'} still unset.
          </Txt>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>
            Confirm them and every look below gets technique specific to you →
          </Txt>
        </Card>
      )}

      <Txt variant="overline" tone="muted" style={{ marginTop: SPACE.xl }}>Occasion</Txt>
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

      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState message="We could not load the aesthetics." onRetry={() => { void query.refetch(); }} />
      ) : (
        <View style={{ marginTop: SPACE.xl }}>
          <SectionHeader title={`${query.data!.count} looks`} />
          {query.data!.aesthetics.map((aesthetic) => (
            <Card
              key={aesthetic.key}
              style={{ marginBottom: SPACE.md }}
              onPress={() => router.push(
                `/makeup/looks/${aesthetic.key}${occasion ? `?occasion=${occasion}` : ''}` as never,
              )}
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
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
});
