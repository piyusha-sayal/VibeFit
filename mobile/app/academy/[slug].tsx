import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Button, Card, EmptyState, SectionHeader, Txt } from '../../components/ds';
import { guideBySlug } from '../../constants/academy';
import { SPACE } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';

const STORAGE_KEY = 'vibefit.guidesCompleted';

/**
 * Guide progress is device-local for now. The `guide_progress` table exists,
 * but it has no endpoint yet, and storing progress locally is honest about
 * that: it survives restarts, and it does not pretend to sync.
 */
async function readCompleted(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export default function GuideScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const guide = slug ? guideBySlug(slug) : undefined;
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!slug) return;
    readCompleted().then((list) => setCompleted(list.includes(slug)));
  }, [slug]);

  if (!guide) {
    return (
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
        <EmptyState
          title="Guide not found"
          body="That guide does not exist yet."
          actionLabel="Back to the Academy"
          onAction={() => router.push('/academy' as never)}
        />
      </ScrollView>
    );
  }

  const toggleCompleted = async () => {
    const list = await readCompleted();
    const next = completed ? list.filter((s) => s !== guide.slug) : [...list, guide.slug];
    setCompleted(!completed);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Progress is a convenience; failing to store it must not break reading.
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="overline" tone="muted">{guide.level} · {guide.minutes} min</Txt>
      <Txt variant="title" serif style={{ marginTop: SPACE.xs }}>{guide.title}</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: SPACE.sm }}>{guide.summary}</Txt>

      {guide.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <SectionHeader title={section.heading} />
          <Txt variant="body" style={{ lineHeight: 24 }}>{section.body}</Txt>
        </View>
      ))}

      {guide.related?.length ? (
        <View style={styles.section}>
          <SectionHeader title="Put it to use" />
          {guide.related.map((link) => (
            <Card key={link.route} style={{ marginBottom: SPACE.sm }} onPress={() => router.push(link.route as never)}>
              <Txt variant="body" weight="semibold">{link.label}</Txt>
            </Card>
          ))}
        </View>
      ) : null}

      <Button
        label={completed ? 'Completed — tap to undo' : 'Mark as completed'}
        variant={completed ? 'secondary' : 'primary'}
        style={{ marginTop: SPACE.xxl }}
        onPress={toggleCompleted}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  section: { marginTop: SPACE.xxl },
});
