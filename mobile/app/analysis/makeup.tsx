import React from 'react';
import { View } from 'react-native';

import { Card, PageHeader, Screen, Swatch, Txt } from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { useAnalysisStore } from '../../store/analysisStore';
import { useTheme } from '../../theme/ThemeProvider';
import type { ColorSwatch } from '../../types';

function SwatchSection({ title, swatches }: { title: string; swatches: ColorSwatch[] }) {
  if (!swatches?.length) return null;
  return (
    <Card style={{ marginBottom: SPACE.md }}>
      <Txt variant="heading" serif accessibilityRole="header" style={{ marginBottom: SPACE.md }}>{title}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
        {swatches.map((s, i) => (
          <Swatch key={`${s.hex}-${i}`} hex={s.hex} name={s.name} size={44} />
        ))}
      </View>
    </Card>
  );
}

export default function MakeupScreen() {
  const { colors } = useTheme();
  const makeup = useAnalysisStore((s) => s.currentAnalysis?.colorAnalysis?.makeup);
  const seasonal = useAnalysisStore((s) => s.currentAnalysis?.colorAnalysis?.seasonal);
  const notes = makeup?.notes ?? [];

  return (
    <Screen>
      <PageHeader
        eyebrow="Analysis"
        title="Makeup guide"
        subtitle={seasonal ? `Tailored for ${seasonal.label}` : undefined}
      />

      <SwatchSection title="Lip colours" swatches={makeup?.lipColors ?? []} />
      <SwatchSection title="Eye shadows" swatches={makeup?.eyeShadows ?? []} />
      <SwatchSection title="Blushes" swatches={makeup?.blushes ?? []} />

      {notes.length > 0 ? (
        <Card>
          <Txt variant="heading" serif accessibilityRole="header" style={{ marginBottom: SPACE.md }}>Application notes</Txt>
          {notes.map((n, i) => (
            <View key={n} style={{ flexDirection: 'row', gap: SPACE.sm, marginBottom: i === notes.length - 1 ? 0 : SPACE.sm }}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.gold, marginTop: 7 }} />
              <Txt variant="bodySm" tone="muted" style={{ flex: 1 }}>{n}</Txt>
            </View>
          ))}
        </Card>
      ) : null}

      {!makeup ? (
        <Card>
          <Txt variant="bodySm" tone="muted" style={{ textAlign: 'center' }}>
            Personalised makeup swatches will appear here after your colour analysis.
          </Txt>
        </Card>
      ) : null}
    </Screen>
  );
}
