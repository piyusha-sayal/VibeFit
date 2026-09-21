/**
 * One look concept, as a card.
 *
 * Used on the Create landing page, in the generated-concepts list and for
 * saved looks, so the same look reads the same everywhere.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Txt } from '../ds';
import { LookComposition, LookSwatches } from './LookComposition';
import { SPACE } from '../../constants/theme';
import type { LookComposition as Composition } from '../../services/lookService';

/** How much of this look is actually the user's, in plain words. */
export const PERSONALISATION_LABEL: Record<string, string> = {
  quick: 'General styling',
  personalised: 'Personalised',
  full: 'Fully personalised',
};

interface Props {
  composition: Composition;
  onPress?: () => void;
  /** Show the illustration as well as the text summary. */
  visual?: boolean;
  footer?: React.ReactNode;
}

export function LookCard({ composition, onPress, visual = true, footer }: Props) {
  const pieces = composition.outfit.pieces;
  const swatches = pieces.map((p) => p.colour).filter(Boolean) as { hex: string; name: string }[];
  const primary = composition.explanations[0];

  return (
    <Card onPress={onPress} style={styles.card} accessibilityLabel={composition.name}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Txt variant="heading" serif numberOfLines={2}>{composition.name}</Txt>
          <Txt variant="caption" tone="subtle" style={{ marginTop: 2 }}>
            {composition.outfit.structureName} ·{' '}
            {PERSONALISATION_LABEL[composition.personalisation] ?? composition.personalisation}
          </Txt>
        </View>
      </View>

      {visual ? (
        <View style={{ marginTop: SPACE.md }}>
          <LookComposition composition={composition} compact />
        </View>
      ) : (
        <LookSwatches swatches={swatches} />
      )}

      <Txt variant="bodySm" tone="muted" numberOfLines={2} style={{ marginTop: SPACE.sm }}>
        {pieces.map((p) => p.name).join(' · ')}
      </Txt>

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xs }}>
        {composition.hair.styleName ?? 'Hair not set'}
        {composition.makeup.aestheticName ? ` · ${composition.makeup.aestheticName} makeup` : ''}
        {composition.jewellery.metalName ? ` · ${composition.jewellery.metalName}` : ''}
      </Txt>

      {primary ? (
        <Txt variant="bodySm" style={{ marginTop: SPACE.sm }}>• {primary.text}</Txt>
      ) : null}

      {footer}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACE.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACE.sm },
  headerText: { flex: 1 },
});
