import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, Chip, ErrorState, LoadingState, SectionHeader, Txt } from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { useAesthetics, useFaceProfile } from '../../hooks/useFace';
import { useTheme } from '../../theme/ThemeProvider';

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
              <View style={styles.rowBetween}>
                <Txt variant="heading">{aesthetic.name}</Txt>
                <Txt variant="caption" tone="muted">{aesthetic.minutes} min</Txt>
              </View>
              <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{aesthetic.summary}</Txt>
              {aesthetic.reasons.slice(0, 1).map((reason) => (
                <Txt key={reason} variant="bodySm" style={{ marginTop: SPACE.sm }}>• {reason}</Txt>
              ))}
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
});
