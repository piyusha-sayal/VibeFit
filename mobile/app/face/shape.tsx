import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Button, Card, EmptyState, ErrorState, LoadingState, PageHeader, Screen, SectionHeader,
  SelectCard, Sheet, Txt,
} from '../../components/ds';
import { FaceFigure, faceShapeFor } from '../../components/visual';
import { SPACE } from '../../constants/theme';
import { NotFoundError } from '../../hooks/useBeauty';
import { useFaceProfile, useSetFaceShape } from '../../hooks/useFace';

const MEASUREMENT_LABELS: Record<string, string> = {
  lengthToWidth: 'Length to width',
  jawToCheek: 'Jaw to cheekbone',
  foreheadToCheek: 'Forehead to cheekbone',
  chinToJaw: 'Chin to jaw',
};

function confidenceWords(value: number | null): string {
  if (value === null) return 'Not measured';
  if (value >= 0.75) return 'Clear reading';
  if (value >= 0.55) return 'Reasonably clear';
  return 'Borderline — two shapes are close';
}

/** A row of shape options, three per row, each shown against its own illustration. */
function ShapeGrid({
  options, selected, onSelect,
}: { options: string[]; selected?: string | null; onSelect: (value: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
      {options.map((option) => (
        <SelectCard
          key={option}
          title={option.replace('_', ' ')}
          selected={option === selected}
          onPress={() => onSelect(option)}
          art={<FaceFigure faceShape={faceShapeFor(option) ?? 'oval'} hairLength="short" seed="shape" size={64} />}
          style={{ flexBasis: '31%', flexGrow: 0, alignItems: 'center' }}
        />
      ))}
    </View>
  );
}

export default function FaceShapeReportScreen() {
  const router = useRouter();
  const profile = useFaceProfile();
  const setShape = useSetFaceShape();
  const [picking, setPicking] = useState(false);

  if (profile.isLoading) return <LoadingState label="Loading your report…" />;
  if (profile.error && !(profile.error instanceof NotFoundError)) {
    return <ErrorState message="We could not load your face profile." onRetry={() => { void profile.refetch(); }} />;
  }

  const shape = profile.data?.faceShape;
  const guide = shape?.guide;

  if (!shape?.value) {
    return (
      <Screen>
        <PageHeader title="Face shape" />
        <EmptyState
          title="No shape yet"
          body="Run an analysis and we will measure it, or choose the shape you recognise below. We will not guess one for you."
          actionLabel="Run an analysis"
          onAction={() => router.push('/(tabs)/scan' as never)}
        />
        <SectionHeader title="Or choose your own" style={{ marginTop: SPACE.xxl }} />
        <ShapeGrid options={shape?.options ?? []} selected={null} onSelect={(value) => setShape.mutate(value)} />
      </Screen>
    );
  }

  const measurements = Object.entries(shape.measurements ?? {});

  return (
    <Screen>
      <PageHeader title="Face shape report" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
        <View style={{ flex: 1 }}>
          <Txt variant="h1" serif style={{ textTransform: 'capitalize' }}>
            {shape.value.replace('_', ' ')}
          </Txt>
          <Txt variant="body" tone="muted" style={{ marginTop: SPACE.xs }}>{guide?.summary}</Txt>
        </View>
        <FaceFigure faceShape={faceShapeFor(shape.value) ?? 'oval'} hairLength="short" seed="shape" size={96} />
      </View>

      <Card variant="tinted" accent="gold" style={{ marginTop: SPACE.xl }}>
        <Txt variant="overline" tone="muted">How we got here</Txt>
        <Txt variant="body" style={{ marginTop: SPACE.xs }}>
          {shape.source === 'user' ? 'You chose this shape.' : confidenceWords(shape.confidence)}
        </Txt>
        {shape.alternate && shape.source !== 'user' && (
          <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
            Closest alternative: {shape.alternate.replace('_', ' ')}. Plenty of faces sit between two shapes.
          </Txt>
        )}
        {shape.overridden && (
          <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
            Your scan read {shape.scanValue?.replace('_', ' ')}. We kept that, and use your choice for recommendations.
          </Txt>
        )}
        {measurements.length > 0 && (
          <View style={{ marginTop: SPACE.lg }}>
            <Txt variant="label" tone="muted" weight="semibold">Your proportions</Txt>
            {measurements.map(([key, value]) => (
              <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACE.xs }}>
                <Txt variant="bodySm" tone="muted">{MEASUREMENT_LABELS[key] ?? key}</Txt>
                <Txt variant="bodySm">{value.toFixed(2)}</Txt>
              </View>
            ))}
            <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.sm }}>
              Lighting and head angle move these ratios, so treat them as approximate.
            </Txt>
          </View>
        )}
      </Card>

      {guide && (
        <>
          <SectionHeader title="What tends to balance it" style={{ marginTop: SPACE.xxl }} />
          <Card>
            {guide.goals.map((goal) => (
              <Txt key={goal} variant="body" style={{ marginBottom: SPACE.xs }}>• {goal}</Txt>
            ))}
          </Card>

          {([
            ['Hair', guide.hairstyles, '/hair'],
            ['Necklines', guide.necklines, null],
            ['Glasses', guide.glasses, '/accessories/glasses'],
            ['Earrings', guide.earrings, '/accessories/earrings'],
            ['Makeup', guide.makeup, '/makeup'],
            ['Facial hair', guide.beard, null],
          ] as const).map(([title, lines, route]) => (
            lines.length > 0 ? (
              <View key={title} style={{ marginTop: SPACE.xl }}>
                <SectionHeader title={title} />
                <Card onPress={route ? () => router.push(route as never) : undefined}>
                  {lines.map((line) => (
                    <Txt key={line} variant="bodySm" style={{ marginBottom: SPACE.xs }}>• {line}</Txt>
                  ))}
                  {route && (
                    <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.sm }}>
                      Open the studio →
                    </Txt>
                  )}
                </Card>
              </View>
            ) : null
          ))}
        </>
      )}

      <SectionHeader title="Not your shape?" style={{ marginTop: SPACE.xxl }} />
      <Button label="Choose a different shape" variant="secondary" onPress={() => setPicking(true)} />

      <Sheet visible={picking} onClose={() => setPicking(false)} title="Choose your face shape">
        <ShapeGrid
          options={shape.options}
          selected={shape.value}
          onSelect={(value) => {
            setShape.mutate(value);
            setPicking(false);
          }}
        />
      </Sheet>

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xl }}>
        {profile.data?.disclaimer}
      </Txt>
    </Screen>
  );
}
