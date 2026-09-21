/**
 * Create My Look — the studio landing page.
 *
 * One obvious action: Create a Look. Everything under it is a shortcut into
 * the same flow, or something the user has already made. Nothing on this page
 * is invented to fill a slot: with no drafts and no saved looks the page is
 * simply shorter.
 */
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Button, Card, Chip, ErrorState, LoadingState, SectionHeader, Txt,
} from '../../components/ds';
import { LookSwatches } from '../../components/look';
import { GarmentFigure } from '../../components/visual';
import { RADIUS, SPACE } from '../../constants/theme';
import { usePassport } from '../../hooks/useBeauty';
import { useDrafts, useLookOptions, useSavedLooks } from '../../hooks/useLook';
import { useTheme } from '../../theme/ThemeProvider';

/** The silhouette each structure is drawn with on the inspiration row. */
const STRUCTURE_SILHOUETTE: Record<string, string> = {
  saree_set: 'draped',
  lehenga_set: 'a_line',
  anarkali_set: 'fit_and_flare',
  kurta_set: 'straight',
  salwar_set: 'relaxed',
  sharara_set: 'wide_leg',
  indo_western_set: 'varied',
  sherwani_set: 'structured',
  shirt_trouser: 'straight',
  top_jeans: 'straight',
  dress_look: 'wrap',
  skirt_look: 'a_line',
  coord_set: 'relaxed',
  layered_smart: 'column',
};

export default function CreateScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const options = useLookOptions();
  const drafts = useDrafts();
  const saved = useSavedLooks();
  const passport = usePassport();

  const start = (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    router.push(`/look/new${query ? `?${query}` : ''}` as never);
  };

  /** Shortcuts built from the passport, or the one step that unlocks the most. */
  const recommended = useMemo(() => {
    const data = passport.data;
    if (!data) return [];
    const by = Object.fromEntries(data.attributes.map((a) => [a.key, a]));
    const rows: { title: string; body: string; onPress: () => void }[] = [];

    if (by.personal_colour?.status === 'present') {
      rows.push({
        title: `A look in your ${by.personal_colour.value} palette`,
        body: 'Outfit colours drawn from your season rather than a generic chart.',
        onPress: () => start({ occasion: 'everyday' }),
      });
    }
    for (const aesthetic of (data.favouriteAesthetics ?? []).slice(0, 2)) {
      rows.push({
        title: `Something ${aesthetic.name.toLowerCase()}`,
        body: 'Built around an aesthetic you saved.',
        onPress: () => start({ aesthetic: aesthetic.key }),
      });
    }
    if (rows.length < 2 && data.nextAction) {
      rows.push({
        title: data.nextAction.label,
        body: 'The quickest way to make every look here more personal.',
        onPress: () => router.push(data.nextAction!.route as never),
      });
    }
    return rows.slice(0, 3);
  }, [passport.data]);

  if (options.isLoading) return <LoadingState label="Opening the studio…" />;
  if (options.error) {
    return (
      <ErrorState
        message="We could not open the studio."
        onRetry={() => { void options.refetch(); }}
      />
    );
  }

  const occasions = options.data?.occasions ?? [];
  const structures = options.data?.structures ?? [];
  const aesthetics = options.data?.aesthetics ?? [];
  const draftList = drafts.data?.drafts ?? [];
  const savedList = saved.data?.looks ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* --------------------------------------------------------- A. hero */}
      <Txt variant="display" serif>Create your perfect look</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: SPACE.xs }}>
        Outfits, colours, hair, makeup and accessories, put together as one look.
        Nothing here needs an analysis first.
      </Txt>
      <Button
        label="Create a look"
        onPress={() => start()}
        style={{ marginTop: SPACE.lg }}
        accessibilityHint="Starts a new look, beginning with the occasion"
      />

      {/* -------------------------------------------------- B. quick start */}
      <SectionHeader title="Dressing for something?" style={{ marginTop: SPACE.xxl }} />
      <View style={styles.wrap}>
        {occasions.map((occasion) => (
          <Chip
            key={occasion.key}
            label={occasion.label}
            accent="peach"
            onPress={() => start({ occasion: occasion.key })}
          />
        ))}
      </View>

      {/* --------------------------------------------- C. continue creating */}
      {draftList.length ? (
        <View style={{ marginTop: SPACE.xxl }}>
          <SectionHeader title="Pick up where you left off" />
          {draftList.map((draft) => (
            <Card
              key={draft.id}
              style={{ marginBottom: SPACE.sm }}
              onPress={() => router.push(`/look/builder?draftId=${draft.id}` as never)}
            >
              <Txt variant="body" weight="semibold">{draft.name ?? 'Unnamed look'}</Txt>
              <Txt variant="caption" tone="subtle" style={{ marginTop: 2 }}>
                {(draft.occasion ?? 'No occasion yet').replace(/_/g, ' ')} · unfinished
              </Txt>
              <LookSwatches
                swatches={(draft.composition?.outfit?.pieces ?? [])
                  .map((p) => p.colour)
                  .filter(Boolean) as { hex: string; name: string }[]}
              />
            </Card>
          ))}
        </View>
      ) : null}

      {/* ------------------------------------------------- D. look inspiration */}
      <SectionHeader title="Start from a shape" style={{ marginTop: SPACE.xxl }} />
      <Txt variant="bodySm" tone="muted" style={{ marginBottom: SPACE.md }}>
        Both traditions, offered to everyone. Illustrations, not photographs.
      </Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {structures.map((structure) => (
          <Card
            key={structure.key}
            style={[styles.inspiration, { borderColor: colors.border }]}
            onPress={() => start({ structure: structure.key })}
            accessibilityLabel={`${structure.name}. ${structure.summary}`}
          >
            <GarmentFigure
              silhouette={STRUCTURE_SILHOUETTE[structure.key] ?? 'straight'}
              seed={structure.key}
              width={78}
            />
            <Txt variant="bodySm" weight="semibold" style={{ marginTop: SPACE.xs }}>
              {structure.name}
            </Txt>
            <Txt variant="caption" tone="subtle" numberOfLines={2}>{structure.summary}</Txt>
          </Card>
        ))}
      </ScrollView>

      {/* ----------------------------------------------- E. recommended rows */}
      {recommended.length ? (
        <View style={{ marginTop: SPACE.xxl }}>
          <SectionHeader title="Because of your passport" />
          {recommended.map((row) => (
            <Card key={row.title} variant="tinted" accent="gold"
                  style={{ marginBottom: SPACE.sm }} onPress={row.onPress}>
              <Txt variant="body" weight="semibold">{row.title}</Txt>
              <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{row.body}</Txt>
            </Card>
          ))}
        </View>
      ) : null}

      {/* -------------------------------------------------- F. recent looks */}
      {savedList.length ? (
        <View style={{ marginTop: SPACE.xxl }}>
          <SectionHeader
            title="Your looks"
            action={savedList.length > 1 ? 'Compare' : undefined}
            onAction={savedList.length > 1
              ? () => router.push('/look/compare' as never)
              : undefined}
          />
          {savedList.slice(0, 4).map((look) => (
            <Card
              key={look.id}
              style={{ marginBottom: SPACE.sm }}
              onPress={() => router.push(`/look/${look.id}` as never)}
            >
              <Txt variant="body" weight="semibold">{look.name}</Txt>
              <Txt variant="caption" tone="subtle" style={{ marginTop: 2 }}>
                {(look.occasion ?? 'any occasion').replace(/_/g, ' ')} ·{' '}
                {look.status.replace(/_/g, ' ')}
              </Txt>
              <LookSwatches
                swatches={(look.payload?.outfit?.pieces ?? [])
                  .map((p) => p.colour)
                  .filter(Boolean) as { hex: string; name: string }[]}
              />
            </Card>
          ))}
        </View>
      ) : null}

      {/* ---------------------------------------------- G. explore aesthetics */}
      <SectionHeader title="Or start from an aesthetic" style={{ marginTop: SPACE.xxl }} />
      <View style={styles.wrap}>
        {aesthetics.slice(0, 12).map((aesthetic) => (
          <Chip
            key={aesthetic.key}
            label={aesthetic.name}
            accent="lavender"
            onPress={() => start({ aesthetic: aesthetic.key })}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  inspiration: {
    width: 150,
    marginRight: SPACE.sm,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
});
