import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Button, Card, EmptyState, SectionHeader, Txt } from '../../components/ds';
import { guideBySlug } from '../../constants/academy';
import { SPACE } from '../../constants/theme';
import { useGuideProgress, useUpdateGuideProgress } from '../../hooks/useFace';
import { useTheme } from '../../theme/ThemeProvider';

const STORAGE_KEY = 'vibefit.guidesCompleted';

/**
 * Progress now lives on the account, so it survives a reinstall and follows
 * the reader to a second device. The device-local list is still read once and
 * merged upward — anything finished before this existed is not thrown away —
 * and it stays as the offline fallback if the write fails.
 */
async function readLocalCompleted(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function writeLocalCompleted(next: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Progress is a convenience; failing to store it must not break reading.
  }
}

export default function GuideScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const guide = slug ? guideBySlug(slug) : undefined;

  const progress = useGuideProgress();
  const update = useUpdateGuideProgress();
  const [localCompleted, setLocalCompleted] = useState(false);

  useEffect(() => {
    if (!slug) return;
    void readLocalCompleted().then((list) => setLocalCompleted(list.includes(slug)));
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

  const serverRow = progress.data?.progress.find((row) => row.slug === guide.slug);
  // Server wins once it has an answer; the local flag covers the offline case
  // and anything completed before progress moved to the account.
  const completed = serverRow?.completed ?? localCompleted;

  const toggleCompleted = async () => {
    const next = !completed;
    setLocalCompleted(next);

    const list = await readLocalCompleted();
    await writeLocalCompleted(
      next ? Array.from(new Set([...list, guide.slug])) : list.filter((s) => s !== guide.slug),
    );

    update.mutate({ slug: guide.slug, completed: next });
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="overline" tone="muted">{guide.level} · {guide.minutes} min</Txt>
      <Txt variant="title" serif style={{ marginTop: SPACE.xs }}>{guide.title}</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: SPACE.sm }}>{guide.summary}</Txt>

      {guide.sections.map((section, index) => (
        <View
          key={section.heading}
          style={styles.section}
          // Remember how far the reader got, so the Academy can offer to resume.
          onLayout={() => {
            if ((serverRow?.lastStep ?? -1) < index) {
              update.mutate({ slug: guide.slug, lastStep: index });
            }
          }}
        >
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
        onPress={() => { void toggleCompleted(); }}
      />
      {update.isError ? (
        <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.sm }}>
          Saved on this device. We could not reach your account just now.
        </Txt>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  section: { marginTop: SPACE.xxl },
});
