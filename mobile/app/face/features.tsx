import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, Chip, LoadingState, SectionHeader, Txt } from '../../components/ds';
import { SPACE } from '../../constants/theme';
import type { FaceAttribute } from '../../services/faceService';
import { useFaceProfile, useSetFaceAttribute } from '../../hooks/useFace';
import { useTheme } from '../../theme/ThemeProvider';

const SOURCE_LABEL: Record<FaceAttribute['source'], string> = {
  scan: 'From your scan',
  user: 'You confirmed this',
  unset: 'Not set yet',
};

function AttributeCard({ attribute }: { attribute: FaceAttribute }) {
  const setAttribute = useSetFaceAttribute();
  const [open, setOpen] = useState(attribute.source === 'unset');
  const pending = setAttribute.isPending && setAttribute.variables?.key === attribute.key;

  return (
    <Card style={{ marginBottom: SPACE.md }}>
      <View style={styles.rowBetween}>
        <Txt variant="heading">{attribute.label}</Txt>
        <Txt variant="caption" tone={attribute.source === 'unset' ? 'subtle' : 'muted'}>
          {SOURCE_LABEL[attribute.source]}
        </Txt>
      </View>

      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        {attribute.intro}
      </Txt>

      {attribute.valueLabel && (
        <Txt variant="title" serif style={{ marginTop: SPACE.md }}>{attribute.valueLabel}</Txt>
      )}

      {attribute.overridden && (
        <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.xs }}>
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
        onPress={() => setOpen((v) => !v)}
        style={{ marginTop: SPACE.md }}
      >
        {open ? 'Close' : attribute.value ? 'Change this' : 'Choose yours'}
      </Txt>

      {open && (
        <View style={{ marginTop: SPACE.md }}>
          <Txt variant="caption" tone="subtle" style={{ marginBottom: SPACE.sm }}>
            {attribute.method}
          </Txt>
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
        </View>
      )}
    </Card>
  );
}

export default function FeatureExplorerScreen() {
  const { colors } = useTheme();
  const profile = useFaceProfile();

  if (profile.isLoading) return <LoadingState label="Loading your features…" />;

  const attributes = profile.data?.attributes ?? [];
  const measured = attributes.filter((a) => a.source === 'scan');
  const yours = attributes.filter((a) => a.source !== 'scan');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Your features</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: SPACE.xs }}>
        Some of these we can measure. The rest you tell us — a photo cannot
        reliably separate a hooded lid from a deep-set one, and we would rather
        ask than invent an answer.
      </Txt>

      {measured.length > 0 && (
        <>
          <SectionHeader title="From your scan" style={{ marginTop: SPACE.xxl }} />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
});
