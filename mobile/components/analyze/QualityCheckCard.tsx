/**
 * The photo-quality gate shown at the top of Results: three plain-language
 * statuses instead of one opaque verdict, with a Retake action only when
 * something actually needs it.
 */
import React from 'react';
import { View } from 'react-native';

import { Button, Card, Txt } from '../ds';
import { SPACE } from '../../constants/theme';
import type { ImageQuality } from '../../types';
import { deriveQualityChecks, QualityCheckItem } from './qualityChecks';

function CheckRow({ item, last }: { item: QualityCheckItem; last: boolean }) {
  const tone = item.status === 'good' ? 'success' : 'danger';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, marginBottom: last ? 0 : SPACE.md }}>
      <Txt variant="body" weight="bold" tone={tone} style={{ width: 20 }}>
        {item.status === 'good' ? '✓' : '!'}
      </Txt>
      <View style={{ flex: 1 }}>
        <Txt variant="bodySm" weight="semibold" tone={tone}>{item.label}</Txt>
        <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>{item.note}</Txt>
      </View>
    </View>
  );
}

export function QualityCheckCard({
  quality, onRetake,
}: {
  quality: ImageQuality;
  onRetake: () => void;
}) {
  const { items, acceptable } = deriveQualityChecks(quality);

  return (
    <Card style={{ marginBottom: SPACE.lg }}>
      <Txt variant="heading" serif accessibilityRole="header">Photo check</Txt>
      <View style={{ marginTop: SPACE.md }}>
        {items.map((item, i) => (
          <CheckRow key={item.key} item={item} last={i === items.length - 1} />
        ))}
      </View>
      {!acceptable ? (
        <Button
          label="Retake photo"
          variant="secondary"
          onPress={onRetake}
          style={{ marginTop: SPACE.lg, alignSelf: 'flex-start' }}
        />
      ) : null}
    </Card>
  );
}
