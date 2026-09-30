import React, { useState } from 'react';
import { View } from 'react-native';

import {
  Card, Chip, LoadingState, PageHeader, Screen, SectionHeader, Sheet, Txt,
} from '../../components/ds';
import { FaceFigure } from '../../components/visual';
import { SPACE } from '../../constants/theme';
import type { FaceAttribute } from '../../services/faceService';
import { useFaceProfile, useSetFaceAttribute } from '../../hooks/useFace';

const SOURCE_LABEL: Record<FaceAttribute['source'], string> = {
  scan: 'From your scan',
  user: 'Set by you',
  unset: 'Not set yet',
};

/** Which zone of the illustration this attribute lights up, if any. */
function emphasisFor(key: string): 'eyes' | 'brows' | 'lips' | 'cheeks' | undefined {
  const k = key.toLowerCase();
  if (k.includes('eye')) return 'eyes';
  if (k.includes('brow')) return 'brows';
  if (k.includes('lip')) return 'lips';
  if (k.includes('cheek') || k.includes('contrast')) return 'cheeks';
  return undefined;
}

function AttributeCard({ attribute }: { attribute: FaceAttribute }) {
  const setAttribute = useSetFaceAttribute();
  const [open, setOpen] = useState(false);
  const pending = setAttribute.isPending && setAttribute.variables?.key === attribute.key;
  const zone = emphasisFor(attribute.key);

  return (
    <Card style={{ marginBottom: SPACE.md }}>
      <View style={{ flexDirection: 'row', gap: SPACE.md }}>
        {zone ? (
          <FaceFigure
            emphasis={[zone]}
            seed={attribute.key}
            size={56}
            label={`${attribute.label}, illustrated`}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm }}>
            <Txt variant="heading" style={{ flexShrink: 1 }}>{attribute.label}</Txt>
            <Txt variant="caption" tone={attribute.source === 'unset' ? 'subtle' : 'muted'}>
              {SOURCE_LABEL[attribute.source]}
            </Txt>
          </View>
          <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>{attribute.intro}</Txt>
          {attribute.valueLabel && (
            <Txt variant="title" serif style={{ marginTop: SPACE.sm }}>{attribute.valueLabel}</Txt>
          )}
        </View>
      </View>

      {attribute.overridden && (
        <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.sm }}>
          Your scan read “{attribute.scanValue}”. We kept that reading and use your choice instead.
        </Txt>
      )}

      {attribute.styling.length > 0 && (
        <View style={{ marginTop: SPACE.md }}>
          {attribute.styling.map((line) => (
            <Txt key={line} variant="bodySm" style={{ marginBottom: SPACE.xs }}>• {line}</Txt>
          ))}
        </View>
      )}

      <Txt
        variant="bodySm"
        tone="accent"
        weight="semibold"
        onPress={() => setOpen(true)}
        style={{ marginTop: SPACE.md }}
      >
        {attribute.value ? 'Change this' : 'Choose yours'}
      </Txt>

      <Sheet visible={open} onClose={() => setOpen(false)} title={attribute.label}>
        <Txt variant="caption" tone="subtle" style={{ marginBottom: SPACE.md }}>{attribute.method}</Txt>
        {attribute.options.map((option) => (
          <Card
            key={option.key}
            variant={option.key === attribute.value ? 'tinted' : 'plain'}
            accent="gold"
            style={{ marginBottom: SPACE.sm }}
            onPress={() => {
              setAttribute.mutate({ key: attribute.key, value: option.key });
              setOpen(false);
            }}
            accessibilityLabel={`${attribute.label}: ${option.label}`}
          >
            <Txt variant="body" weight="semibold">{option.label}</Txt>
            <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{option.description}</Txt>
          </Card>
        ))}
        {pending && <LoadingState label="Saving…" />}
      </Sheet>
    </Card>
  );
}

export default function FeatureExplorerScreen() {
  const profile = useFaceProfile();

  if (profile.isLoading) return <LoadingState label="Loading your features…" />;

  const attributes = profile.data?.attributes ?? [];
  const measured = attributes.filter((a) => a.source === 'scan');
  const yours = attributes.filter((a) => a.source !== 'scan');

  return (
    <Screen>
      <PageHeader
        title="Your features"
        subtitle="Some of these we can measure. The rest you tell us — a photo cannot reliably separate a hooded lid from a deep-set one, and we would rather ask than invent an answer."
      />

      {measured.length > 0 && (
        <>
          <SectionHeader title="From your scan" />
          {measured.map((attribute) => (
            <AttributeCard key={attribute.key} attribute={attribute} />
          ))}
        </>
      )}

      <SectionHeader title="Yours to confirm" style={{ marginTop: SPACE.xl }} />
      {yours.map((attribute) => (
        <AttributeCard key={attribute.key} attribute={attribute} />
      ))}

      <Chip
        label={`${profile.data?.known ?? 0} of ${profile.data?.total ?? 0} known`}
        accent="gold"
      />
      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.lg }}>
        Every studio uses what you confirm here. Nothing here rates a face.
      </Txt>
    </Screen>
  );
}
