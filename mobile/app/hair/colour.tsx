import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, Chip, ErrorState, LoadingState, Swatch, Txt } from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { useHairColours } from '../../hooks/useFace';
import { useSaveLook } from '../../hooks/useBeauty';
import { useTheme } from '../../theme/ThemeProvider';

const LIFT_LABEL: Record<string, string> = {
  none: 'No lightening',
  low: 'A little lightening',
  medium: 'Moderate lightening',
  high: 'Heavy lightening',
};

export default function HairColourScreen() {
  const { colors } = useTheme();
  const [maxLift, setMaxLift] = useState<string | undefined>();
  const query = useHairColours(maxLift);
  const saveLook = useSaveLook();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Hair colour</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        {query.data?.seasonLabel
          ? `Ranked against your ${query.data.seasonLabel} colouring. Every shade stays listed.`
          : 'Run a colour analysis and these reorder around your season.'}
      </Txt>

      <Txt variant="overline" tone="muted" style={{ marginTop: SPACE.xl }}>
        How much processing are you willing to do?
      </Txt>
      <View style={styles.chips}>
        {(['none', 'low', 'medium'] as const).map((lift) => (
          <Chip
            key={lift}
            label={LIFT_LABEL[lift]}
            selected={maxLift === lift}
            onPress={() => setMaxLift(maxLift === lift ? undefined : lift)}
          />
        ))}
      </View>

      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState message="We could not load the colour library." onRetry={() => { void query.refetch(); }} />
      ) : (
        <View style={{ marginTop: SPACE.xl }}>
          {query.data!.colours.map((colour) => (
            <Card key={colour.key} style={{ marginBottom: SPACE.md }}>
              <View style={styles.row}>
                <Swatch hex={colour.hex} name={colour.name} size={56} />
                <View style={{ flex: 1, marginLeft: SPACE.lg }}>
                  <Txt variant="heading">{colour.name}</Txt>
                  <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                    {LIFT_LABEL[colour.liftRequired]} · {colour.maintenance} upkeep
                  </Txt>
                  {colour.seasonMatch && <Chip label="sits with your season" accent="gold" />}
                </View>
              </View>

              <Txt variant="bodySm" style={{ marginTop: SPACE.md }}>{colour.notes}</Txt>
              {colour.reasons.slice(0, 2).map((reason) => (
                <Txt key={reason} variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
                  • {reason}
                </Txt>
              ))}

              <Txt
                variant="caption"
                tone="accent"
                weight="semibold"
                style={{ marginTop: SPACE.md }}
                onPress={() => saveLook.mutate({
                  name: colour.name,
                  kind: 'hair',
                  status: 'want_to_try',
                  payload: { key: colour.key, hex: colour.hex, lift: colour.liftRequired },
                  notes: colour.notes,
                })}
              >
                {saveLook.isPending ? 'Saving…' : 'Save to my Passport'}
              </Txt>
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
  row: { flexDirection: 'row', alignItems: 'center' },
});
