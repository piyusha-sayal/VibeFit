import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, Chip, LoadingState, ProgressBar, SectionHeader, Txt } from '../../components/ds';
import { GarmentFigure } from '../../components/visual';
import { SPACE } from '../../constants/theme';
import { useOutfits, useStyleProfile } from '../../hooks/useStyle';
import { useTheme } from '../../theme/ThemeProvider';

const TOOLS = [
  { label: 'Body styling preferences', body: 'Self-selected, skippable, and never from a photo.', route: '/style/questionnaire', accent: 'sage' as const },
  { label: 'Clothing silhouettes', body: 'Every shape in the library, with what each one does.', route: '/style/silhouettes', accent: 'gold' as const },
  { label: 'Find your fashion aesthetic', body: 'Sixteen aesthetics, and a quiz if you want one.', route: '/style/aesthetics', accent: 'lavender' as const },
  { label: 'Outfit recommendations', body: 'Complete outfits built from what you have told us.', route: '/style/outfits', accent: 'peach' as const },
  { label: 'Outfit colour explorer', body: 'Saree and blouse, shirt and trousers — from your palette.', route: '/style/colours', accent: 'blush' as const },
  { label: 'Indian fashion', body: 'Sarees, lehengas, kurtas, sharara and gharara sets.', route: '/style/library?region=indian', accent: 'gold' as const },
  { label: 'Global fashion', body: 'Casual, business, streetwear, modest, Korean-inspired.', route: '/style/library?region=global', accent: 'sage' as const },
  { label: 'Occasion styling', body: 'Work, weddings, festivals, interviews and everyday.', route: '/style/outfits', accent: 'peach' as const },
  { label: 'Saved outfit inspiration', body: 'Everything you kept, in your Passport.', route: '/(tabs)/passport', accent: 'gold' as const },
  { label: 'Style Academy', body: 'Short guides on fit, colour and building a wardrobe.', route: '/academy?category=style', accent: 'lavender' as const },
];

export default function DiscoverMyStyleScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const profile = useStyleProfile();
  const outfits = useOutfits();

  const data = profile.data;
  const preview = outfits.data?.outfits.slice(0, 3) ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Discover My Style</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: SPACE.xs, marginBottom: SPACE.xl }}>
        Clothes, silhouettes and outfits built from what you tell us — never
        from a photograph of your body.
      </Txt>

      {/* ------------------------------------------------- 1. style profile */}
      {profile.isLoading ? (
        <LoadingState label="Reading your profile…" />
      ) : (
        <Card
          variant="tinted"
          accent="gold"
          onPress={() => router.push('/style/questionnaire' as never)}
        >
          <Txt variant="overline" tone="muted">Your style profile</Txt>
          <Txt variant="title" serif style={{ marginTop: 2 }}>
            {data?.bodyTypeDeclined
              ? 'Built from your preferences'
              : data?.bodyType
                ? `${data.bodyType.replace('_', ' ')} · ${data.aesthetics.length || 'no'} aesthetics`
                : 'Not started yet'}
          </Txt>
          <ProgressBar
            value={data?.completion ?? 0}
            label={`${data?.answered ?? 0} of ${data?.total ?? 0} answered`}
          />
          <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.sm }}>
            {data && data.completion < 1
              ? 'Answer a section at a time. Everything is optional →'
              : 'Tap to review or change anything →'}
          </Txt>

          {data?.aestheticDetails?.length ? (
            <View style={styles.chips}>
              {data.aestheticDetails.map((a) => (
                <Chip key={a.key} label={a.name} accent="gold" />
              ))}
            </View>
          ) : null}
        </Card>
      )}

      {/* ------------------------------------------- 2. outfits, if we have any */}
      {preview.length > 0 ? (
        <View style={{ marginTop: SPACE.xxl }}>
          <SectionHeader
            title="Outfits for you"
            action="See all"
            onAction={() => router.push('/style/outfits' as never)}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {preview.map((outfit) => (
              <Card
                key={outfit.key}
                style={{ width: 200, marginRight: SPACE.md }}
                onPress={() => router.push(`/style/outfits?focus=${outfit.key}` as never)}
              >
                <View style={{ alignItems: 'center' }}>
                  <GarmentFigure
                    silhouette={outfit.pieces[0]?.silhouette ?? 'straight'}
                    seed={outfit.key}
                    colour={outfit.colours.main[0]?.hex}
                    width={84}
                  />
                </View>
                <Txt variant="body" weight="semibold" style={{ marginTop: SPACE.sm }}>
                  {outfit.name}
                </Txt>
                <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                  {outfit.pieces.map((p) => p.name).join(' · ')}
                </Txt>
              </Card>
            ))}
          </ScrollView>

          {outfits.data?.couldImproveWith.length ? (
            <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.sm }}>
              These get sharper once we know your{' '}
              {outfits.data.couldImproveWith.join(', ')}.
            </Txt>
          ) : null}
        </View>
      ) : null}

      {/* ---------------------------------------------------- 3. every tool */}
      <View style={{ marginTop: SPACE.xxl }}>
        <SectionHeader title="Explore" />
        {TOOLS.map((tool) => (
          <Card
            key={tool.label}
            style={{ marginBottom: SPACE.sm }}
            onPress={() => router.push(tool.route as never)}
            accessibilityLabel={tool.label}
          >
            <Txt variant="heading">{tool.label}</Txt>
            <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{tool.body}</Txt>
          </Card>
        ))}
      </View>

      <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xl }}>
        {data?.bodyTypeNote}
      </Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.md },
});
