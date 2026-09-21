import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, SectionHeader, Txt } from '../../components/ds';
import { SPACE } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';

const SECTIONS = [
  {
    title: 'Getting a good photo',
    items: [
      'Daylight beats indoor light. A window at midday is the single biggest improvement you can make.',
      'No filter, no beauty mode. Both change the colours the analysis reads.',
      'Hair back from your face, camera at eye level, neutral expression.',
      'No makeup on the cheeks — that is where skin tone is sampled.',
    ],
  },
  {
    title: 'Understanding your results',
    items: [
      'A season is an estimate with a confidence, not a measurement.',
      'The runner-up season exists because photographs are unreliable. Compare both.',
      'The "compare against these" palette is not a list of colours to avoid.',
      'MyLookFit gives no scores, no ratings and no ranking of appearance.',
    ],
  },
  {
    title: 'Photos and privacy',
    items: [
      'Photos are analysed and not kept, unless you turn on photo reuse in Settings.',
      'MyLookFit never asks for body photographs and never estimates body shape from an image.',
      'Nothing about your ethnicity, nationality or background is inferred from a photo.',
      'Deleting an analysis removes its results from your passport.',
    ],
  },
  {
    title: 'When something is wrong',
    items: [
      'A scan that finds no face returns nothing rather than a guess — retake it in better light.',
      'The first request after a quiet period can take up to a minute while the server wakes.',
      'If a result looks wrong, correct it in your Vibe Profile; corrections override the scan.',
    ],
  },
];

export default function HelpScreen() {
  const { colors } = useTheme();
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Help</Txt>
      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <SectionHeader title={section.title} />
          {section.items.map((item) => (
            <Card key={item} style={{ marginBottom: SPACE.sm }}>
              <Txt variant="bodySm">{item}</Txt>
            </Card>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  section: { marginTop: SPACE.xxl },
});
