import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Chip, LoadingState, SectionHeader, Txt } from '../../components/ds';
import { GarmentFigure } from '../../components/visual';
import {
  FIT_PREFERENCES, NECKLINES, SILHOUETTES, SLEEVES,
} from '../../constants/wardrobe';
import { RADIUS, SPACE } from '../../constants/theme';
import { useStyleOptions, useStyleProfile, useUpdateStyleProfile } from '../../hooks/useStyle';
import { useTheme } from '../../theme/ThemeProvider';

const OCCASIONS = ['everyday', 'work', 'college', 'date', 'party', 'wedding',
                   'indian_wedding', 'festival', 'interview', 'vacation'];
const CULTURES = [
  { key: 'indian', label: 'Indian and South Asian' },
  { key: 'global', label: 'Western and global' },
  { key: 'both', label: 'Both, depending on the day' },
];
const GARMENT_GROUPS = [
  { key: 'trousers', label: 'Trousers', options: ['Straight', 'Wide-leg', 'High-waisted', 'Palazzo', 'Dhoti', 'Jeans'] },
  { key: 'skirts', label: 'Skirts', options: ['A-line', 'Pleated', 'Pencil', 'Maxi', 'I do not wear skirts'] },
  { key: 'dresses', label: 'Dresses', options: ['Wrap', 'Shift', 'Fit-and-flare', 'Maxi', 'I do not wear dresses'] },
  { key: 'traditional', label: 'Traditional', options: ['Saree', 'Lehenga', 'Kurta set', 'Salwar suit', 'Sherwani', 'None'] },
  { key: 'casual', label: 'Casualwear', options: ['T-shirts', 'Shirts', 'Co-ord sets', 'Athleisure'] },
  { key: 'formal', label: 'Formalwear', options: ['Blazers', 'Suits', 'Formal dresses', 'Occasion traditional'] },
];

/** Adds or removes a value without mutating the stored array. */
function toggleValue(current: string[] | undefined, value: string): string[] {
  const list = current ?? [];
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function MultiSelect({
  title, options, selected, onToggle, accent = 'gold',
}: {
  title: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  accent?: 'gold' | 'sage' | 'blush' | 'peach' | 'lavender';
}) {
  return (
    <View style={{ marginBottom: SPACE.lg }}>
      <Txt variant="overline" tone="muted">{title}</Txt>
      <View style={styles.chips}>
        {options.map((option) => (
          <Chip
            key={option}
            label={option}
            accent={accent}
            selected={selected.includes(option)}
            onPress={() => onToggle(option)}
          />
        ))}
      </View>
    </View>
  );
}

export default function StyleQuestionnaireScreen() {
  const { colors } = useTheme();
  const profile = useStyleProfile();
  const options = useStyleOptions();
  const update = useUpdateStyleProfile();
  const [open, setOpen] = useState<string | null>('body');
  const [height, setHeight] = useState('');
  const [notes, setNotes] = useState('');

  if (profile.isLoading) return <LoadingState label="Loading your preferences…" />;
  const data = profile.data;
  if (!data) return <LoadingState />;

  const save = (patch: Parameters<typeof update.mutate>[0]) => update.mutate(patch);
  const garmentPrefs = (data.garmentPreferences ?? {}) as Record<string, string[]>;

  const section = (key: string, label: string, intro: string, body: React.ReactNode) => {
    const isOpen = open === key;
    const complete = data.sections.find((s) => s.key === key)?.complete;
    return (
      <Card key={key} style={{ marginBottom: SPACE.md }}>
        <View style={styles.rowBetween}>
          <Txt variant="heading" onPress={() => setOpen(isOpen ? null : key)}>{label}</Txt>
          <Txt variant="caption" tone={complete ? 'accent' : 'subtle'}>
            {complete ? 'Answered' : 'Optional'}
          </Txt>
        </View>
        <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{intro}</Txt>
        <Txt
          variant="caption"
          tone="accent"
          weight="semibold"
          style={{ marginTop: SPACE.sm }}
          onPress={() => setOpen(isOpen ? null : key)}
        >
          {isOpen ? 'Close' : 'Open'}
        </Txt>
        {isOpen ? <View style={{ marginTop: SPACE.lg }}>{body}</View> : null}
      </Card>
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Txt variant="display" serif>Your style profile</Txt>
      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs, marginBottom: SPACE.xl }}>
        Answer a section, leave, come back. Everything here is optional and
        everything can be changed later.
      </Txt>

      {section('body', 'Body styling', data.bodyTypeNote, (
        <>
          <View style={styles.bodyGrid}>
            {(options.data?.bodyTypes ?? []).map((type) => {
              const selected = data.bodyType === type.key;
              return (
                <Card
                  key={type.key}
                  variant={selected ? 'tinted' : 'plain'}
                  accent="sage"
                  style={{ width: '48%', marginBottom: SPACE.sm }}
                  onPress={() => save({ bodyType: selected ? null : type.key })}
                  accessibilityLabel={type.label}
                >
                  <View style={{ alignItems: 'center' }}>
                    <GarmentFigure
                      silhouette={
                        { pear: 'a_line', apple: 'column', hourglass: 'fit_and_flare',
                          rectangle: 'straight', inverted_triangle: 'wide_leg' }[type.key] ?? 'straight'
                      }
                      seed={type.key}
                      width={56}
                    />
                  </View>
                  <Txt variant="body" weight="semibold" style={{ marginTop: SPACE.xs }}>
                    {type.label}
                  </Txt>
                </Card>
              );
            })}
          </View>

          <Txt variant="overline" tone="muted" style={{ marginTop: SPACE.md }}>
            Height, if you want to share it
          </Txt>
          <View style={styles.row}>
            <TextInput
              value={height}
              onChangeText={setHeight}
              placeholder={data.heightCm ? String(data.heightCm) : 'cm'}
              placeholderTextColor={colors.textSubtle}
              keyboardType="number-pad"
              style={[styles.input, { color: colors.text, borderColor: colors.border,
                                      backgroundColor: colors.surfaceAlt }]}
            />
            <Button
              label="Save"
              variant="secondary"
              onPress={() => {
                const parsed = Number(height);
                if (parsed >= 50 && parsed <= 260) save({ heightCm: parsed });
              }}
            />
          </View>
        </>
      ))}

      {section('fit', 'Fit and silhouette', 'How you like clothes to sit.', (
        <>
          <MultiSelect
            title="Preferred fit"
            options={FIT_PREFERENCES}
            selected={data.fitPreference ? [data.fitPreference] : []}
            onToggle={(value) => save({
              fitPreference: data.fitPreference === value ? undefined : value.toLowerCase(),
            })}
            accent="peach"
          />
          <MultiSelect
            title="Silhouettes you like"
            options={SILHOUETTES}
            selected={data.silhouettePreferences}
            onToggle={(value) => save({
              silhouettePreferences: toggleValue(data.silhouettePreferences, value),
            })}
          />
        </>
      ))}

      {section('details', 'Necklines and sleeves', 'The details you reach for.', (
        <>
          <MultiSelect
            title="Necklines"
            options={NECKLINES}
            selected={data.necklinePreferences}
            onToggle={(value) => save({
              necklinePreferences: toggleValue(data.necklinePreferences, value),
            })}
            accent="lavender"
          />
          <MultiSelect
            title="Sleeves"
            options={SLEEVES}
            selected={data.sleevePreferences}
            onToggle={(value) => save({
              sleevePreferences: toggleValue(data.sleevePreferences, value),
            })}
            accent="blush"
          />
        </>
      ))}

      {section('garments', 'Garments', 'What you actually wear, not what you own.', (
        <>
          {GARMENT_GROUPS.map((group) => (
            <MultiSelect
              key={group.key}
              title={group.label}
              options={group.options}
              selected={garmentPrefs[group.key] ?? []}
              onToggle={(value) => save({
                garmentPreferences: {
                  ...garmentPrefs,
                  [group.key]: toggleValue(garmentPrefs[group.key], value),
                },
              })}
              accent="sage"
            />
          ))}
        </>
      ))}

      {section('aesthetics', 'Fashion aesthetics', 'Pick as many as fit. Nobody is one aesthetic.', (
        <>
          <MultiSelect
            title="Aesthetics"
            options={(options.data?.aesthetics ?? []).map((a) => a.name)}
            selected={data.aestheticDetails.map((a) => a.name)}
            onToggle={(name) => {
              const match = (options.data?.aesthetics ?? []).find((a) => a.name === name);
              if (!match) return;
              save({ aesthetics: toggleValue(data.aesthetics, match.key) });
            }}
          />
          <MultiSelect
            title="Clothing traditions you wear"
            options={CULTURES.map((c) => c.label)}
            selected={CULTURES.filter((c) => data.culturalPreferences.includes(c.key))
              .map((c) => c.label)}
            onToggle={(label) => {
              const match = CULTURES.find((c) => c.label === label);
              if (!match) return;
              save({ culturalPreferences: toggleValue(data.culturalPreferences, match.key) });
            }}
            accent="peach"
          />
        </>
      ))}

      {section('practical', 'Practical', 'Occasions, sizes and comfort.', (
        <>
          <MultiSelect
            title="What you dress for"
            options={OCCASIONS.map((o) => o.replace('_', ' '))}
            selected={data.favouriteOccasions.map((o) => o.replace('_', ' '))}
            onToggle={(label) => save({
              favouriteOccasions: toggleValue(data.favouriteOccasions, label.replace(' ', '_')),
            })}
            accent="lavender"
          />
          <Txt variant="overline" tone="muted">Anything about comfort</Txt>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            onBlur={() => notes && save({ comfortNotes: notes })}
            placeholder={data.comfortNotes ?? 'Fabrics you avoid, fits that never work…'}
            placeholderTextColor={colors.textSubtle}
            multiline
            style={[styles.input, styles.textarea, { color: colors.text, borderColor: colors.border,
                                                     backgroundColor: colors.surfaceAlt }]}
          />
        </>
      ))}

      {update.isError ? (
        <Txt variant="bodySm" tone="danger" style={{ marginTop: SPACE.md }}>
          We could not save that. Check your connection and try again.
        </Txt>
      ) : null}

      <SectionHeader title="What happens with this" style={{ marginTop: SPACE.xxl }} />
      <Card>
        <Txt variant="bodySm">
          Your answers order what you see. They never remove a garment: every
          category stays available whatever you pick, and no body type is
          better than another.
        </Txt>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.sm },
  bodyGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  input: {
    flex: 1, borderWidth: 1, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, fontSize: 15,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top', marginTop: SPACE.sm },
});
