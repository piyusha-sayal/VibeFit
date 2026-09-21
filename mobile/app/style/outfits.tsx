import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, Chip, EmptyState, ErrorState, LoadingState, Swatch, Txt } from '../../components/ds';
import { GarmentFigure, INSPIRATION_NOTE } from '../../components/visual';
import { SPACE } from '../../constants/theme';
import { useSaveLook } from '../../hooks/useBeauty';
import { useOutfits } from '../../hooks/useStyle';
import { useTheme } from '../../theme/ThemeProvider';

const OCCASIONS = ['everyday', 'work', 'college', 'date', 'party', 'wedding',
                   'indian_wedding', 'festival', 'interview', 'vacation'];

export default function OutfitRecommendationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [occasion, setOccasion] = useState<string | undefined>();
  const query = useOutfits(occasion);
  const saveLook = useSaveLook();
  const [savedKey, setSavedKey] = useState<string | null>(null);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Outfits</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        Built from what you have told us. Nothing here needs a photograph of you.
      </Txt>

      <Txt variant="overline" tone="muted" style={{ marginTop: SPACE.xl }}>Occasion</Txt>
      <View style={styles.chips}>
        {OCCASIONS.map((o) => (
          <Chip
            key={o}
            label={o.replace('_', ' ')}
            accent="peach"
            selected={occasion === o}
            onPress={() => setOccasion(occasion === o ? undefined : o)}
          />
        ))}
      </View>

      {query.isLoading ? (
        <LoadingState label="Putting outfits together…" />
      ) : query.error ? (
        <ErrorState message="We could not load outfits." onRetry={() => { void query.refetch(); }} />
      ) : (query.data?.outfits.length ?? 0) === 0 ? (
        <EmptyState
          title="Nothing for that occasion yet"
          body="Try another occasion — the library is still growing."
        />
      ) : (
        <View style={{ marginTop: SPACE.xl }}>
          {query.data!.couldImproveWith.length ? (
            <Card
              variant="tinted"
              accent="lavender"
              style={{ marginBottom: SPACE.lg }}
              onPress={() => router.push('/style/questionnaire' as never)}
            >
              <Txt variant="body">
                These work now, and get sharper with your{' '}
                {query.data!.couldImproveWith.join(', ')}.
              </Txt>
              <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>
                Add them whenever you like →
              </Txt>
            </Card>
          ) : null}

          {query.data!.outfits.map((outfit) => (
            <Card key={outfit.key} style={{ marginBottom: SPACE.lg }}>
              <View style={styles.rowBetween}>
                <Txt variant="heading">{outfit.name}</Txt>
                <Txt variant="caption" tone="muted">{outfit.formality.replace('_', ' ')}</Txt>
              </View>
              <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{outfit.summary}</Txt>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                          style={{ marginTop: SPACE.md }}>
                {outfit.pieces.map((piece, index) => (
                  <View key={piece.key} style={{ alignItems: 'center', marginRight: SPACE.md }}>
                    <GarmentFigure
                      silhouette={piece.silhouette}
                      seed={`${outfit.key}-${piece.key}`}
                      colour={outfit.colours.main[index % Math.max(outfit.colours.main.length, 1)]?.hex}
                      width={72}
                    />
                    <Txt variant="caption" style={{ marginTop: SPACE.xs, maxWidth: 80 }}>
                      {piece.name}
                    </Txt>
                  </View>
                ))}
              </ScrollView>

              {outfit.colours.main.length ? (
                <View style={{ marginTop: SPACE.md }}>
                  <Txt variant="overline" tone="muted">
                    Colours from your {outfit.colours.seasonLabel}
                  </Txt>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                              style={{ marginTop: SPACE.sm }}>
                    {[...outfit.colours.main, ...outfit.colours.neutral, ...outfit.colours.accent]
                      .map((s) => <Swatch key={s.hex} hex={s.hex} name={s.name} size={44} />)}
                  </ScrollView>
                </View>
              ) : null}

              {outfit.why.length ? (
                <View style={{ marginTop: SPACE.md }}>
                  {outfit.why.map((line) => (
                    <Txt key={line} variant="bodySm" style={{ marginBottom: 2 }}>• {line}</Txt>
                  ))}
                </View>
              ) : null}

              {outfit.alternatives.length ? (
                <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.sm }}>
                  Swap ideas: {outfit.alternatives.map((a) => a.swapFor).join(', ')}
                </Txt>
              ) : null}

              <Txt
                variant="caption"
                tone="accent"
                weight="semibold"
                style={{ marginTop: SPACE.md }}
                onPress={() => {
                  saveLook.mutate({
                    name: outfit.name,
                    kind: 'outfit',
                    status: 'want_to_try',
                    occasion: outfit.occasion ?? undefined,
                    payload: {
                      outfit: outfit.key,
                      pieces: outfit.pieces.map((p) => p.key),
                      season: outfit.colours.season,
                    },
                  });
                  setSavedKey(outfit.key);
                }}
              >
                {savedKey === outfit.key && saveLook.isSuccess
                  ? 'Saved to your Passport'
                  : 'Save to my Passport'}
              </Txt>
            </Card>
          ))}
        </View>
      )}

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.lg }}>
        {INSPIRATION_NOTE}
      </Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
});
