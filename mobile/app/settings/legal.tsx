import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Chip, PageHeader, SectionHeader, Txt } from '../../components/ds';
import { SPACE } from '../../constants/theme';
import {
  LEGAL_REVIEW_NOTE, PRIVACY_POLICY, TERMS_OF_SERVICE, type LegalDocument,
} from '../../constants/legal';
import { useTheme } from '../../theme/ThemeProvider';

const DOCUMENTS: LegalDocument[] = [PRIVACY_POLICY, TERMS_OF_SERVICE];

export default function LegalScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ doc?: string }>();
  const [slug, setSlug] = useState<string>(
    params.doc === 'terms' ? 'terms' : 'privacy',
  );

  const document = DOCUMENTS.find((d) => d.slug === slug) ?? PRIVACY_POLICY;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + SPACE.lg }]}
    >
      <PageHeader title={document.title} subtitle={`Last updated ${document.updated}`} />

      <View style={styles.tabs}>
        {DOCUMENTS.map((d) => (
          <Chip
            key={d.slug}
            label={d.title}
            accent="lavender"
            selected={d.slug === slug}
            onPress={() => setSlug(d.slug)}
          />
        ))}
      </View>

      <Card variant="outlined" style={{ marginTop: SPACE.lg }}>
        <Txt variant="caption" tone="subtle">{LEGAL_REVIEW_NOTE}</Txt>
      </Card>

      <Txt variant="body" style={{ marginTop: SPACE.xl }}>{document.intro}</Txt>

      {document.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <SectionHeader title={section.heading} />
          {section.body.map((paragraph, index) => (
            <Txt
              key={index}
              variant="bodySm"
              tone="muted"
              style={{ marginBottom: SPACE.sm }}
            >
              {paragraph}
            </Txt>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl * 2 },
  tabs: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.lg },
  section: { marginTop: SPACE.xl },
});
