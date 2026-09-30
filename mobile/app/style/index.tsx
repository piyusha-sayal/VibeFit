import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Card, Chip, FeatureCard, ListGroup, ListRow, LoadingState, PageHeader, ProgressBar, Screen, Section, Txt,
} from '../../components/ds';
import { GarmentFigure } from '../../components/visual';
import { SPACE } from '../../constants/theme';
import { useOutfits, useStyleProfile } from '../../hooks/useStyle';

interface CoreArea {
  key: string;
  title: string;
  subtitle: string;
  route: string;
}

const MORE_LINKS = [
  { label: 'Indian fashion', body: 'Sarees, lehengas, kurtas, sharara and gharara sets.', route: '/style/library?region=indian' },
  { label: 'Global fashion', body: 'Casual, business, streetwear, modest, Korean-inspired.', route: '/style/library?region=global' },
  { label: 'Saved outfit inspiration', body: 'Everything you kept, in your Passport.', route: '/(tabs)/passport' },
  { label: 'Style Academy', body: 'Short guides on fit, colour and building a wardrobe.', route: '/academy?category=style' },
];

export default function DiscoverMyStyleScreen() {
  const router = useRouter();
  const profile = useStyleProfile();
  const outfits = useOutfits();

  const data = profile.data;
  const preview = outfits.data?.outfits.slice(0, 3) ?? [];

  const coreAreas: CoreArea[] = [
    { key: 'aesthetic', title: 'Aesthetic', subtitle: 'Sixteen aesthetics — and a quiz if you want one.', route: '/style/aesthetics' },
    {
      key: 'body',
      title: 'Body styling',
      subtitle: data?.bodyTypeNote ?? 'Self-selected — never estimated from a photo.',
      route: '/style/body',
    },
    { key: 'silhouettes', title: 'Silhouettes', subtitle: 'Every shape in the library, with what each one does.', route: '/style/silhouettes' },
    { key: 'colours', title: 'Colours', subtitle: 'Saree and blouse, shirt and trousers — from your palette.', route: '/style/colours' },
    { key: 'outfits', title: 'Outfits', subtitle: 'Complete outfits built from what you have told us.', route: '/style/outfits' },
    { key: 'wardrobe', title: 'Wardrobe', subtitle: 'Every category, organised and easy to browse.', route: '/style/wardrobe' },
    { key: 'library', title: 'Library', subtitle: 'Indian and global fashion, browsable by category.', route: '/style/library' },
    { key: 'questionnaire', title: 'Questionnaire', subtitle: 'Answer a section at a time — everything is optional.', route: '/style/questionnaire' },
  ];

  return (
    <Screen>
      <PageHeader
        title="Discover My Style"
        subtitle="Clothes, silhouettes and outfits built from what you tell us — never from a photograph of your body."
      />

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
        <Section title="Outfits for you" action="See all" onAction={() => router.push('/style/outfits' as never)}>
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
        </Section>
      ) : null}

      {/* ---------------------------------------------------- 3. core areas */}
      <Section title="Explore">
        <View style={styles.grid}>
          {coreAreas.map((area) => (
            <View key={area.key} style={styles.tile}>
              <FeatureCard
                title={area.title}
                subtitle={area.subtitle}
                onPress={() => router.push(area.route as never)}
              />
            </View>
          ))}
        </View>
      </Section>

      {/* -------------------------------------------------------- 4. more */}
      <Section title="More">
        <ListGroup>
          {MORE_LINKS.map((link, index) => (
            <ListRow
              key={link.route}
              title={link.label}
              subtitle={link.body}
              onPress={() => router.push(link.route as never)}
              last={index === MORE_LINKS.length - 1}
            />
          ))}
        </ListGroup>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48%', marginBottom: SPACE.md },
});
