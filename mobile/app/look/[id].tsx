/**
 * One saved look: view it, edit it, duplicate it, organise it.
 *
 * Reopening reports anything the catalogue has lost rather than quietly
 * swapping in a replacement — the stored choice was the user's decision, not
 * ours to overwrite.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  Button, Card, Chip, ErrorState, LoadingState, SectionHeader, Txt,
} from '../../components/ds';
import { BASIS_LABEL, LookComposition } from '../../components/look';
import { RADIUS, SPACE } from '../../constants/theme';
import {
  useAddToCollection, useCollections, useCreateCollection, useDeleteLook,
  useDuplicateLook, useRemoveFromCollection, useSavedLook, useUpdateLook,
} from '../../hooks/useLook';
import { newClientToken } from '../../services/lookService';
import { useLookDraft } from '../../store/lookDraft';
import { useTheme } from '../../theme/ThemeProvider';

const STATUSES = [
  { key: 'saved', label: 'Saved' },
  { key: 'want_to_try', label: 'Want to try' },
  { key: 'tried', label: 'Tried it' },
] as const;

export default function SavedLookScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const look = useSavedLook(id ?? null);
  const update = useUpdateLook();
  const duplicate = useDuplicateLook();
  const remove = useDeleteLook();
  const collections = useCollections();
  const createCollection = useCreateCollection();
  const addTo = useAddToCollection();
  const removeFrom = useRemoveFromCollection();
  const startEditing = useLookDraft((s) => s.edit);

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [newCollection, setNewCollection] = useState('');

  if (look.isLoading) return <LoadingState label="Opening your look…" />;
  if (look.error || !look.data) {
    return (
      <ErrorState message="We could not open that look."
                  onRetry={() => { void look.refetch(); }} />
    );
  }

  const data = look.data;
  const composition = data.composition;
  const usable = data.reconstructable && data.editable !== false;

  const inCollections = (collections.data?.collections ?? [])
    .filter((collection) => collection.lookIds.includes(data.id));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {renaming ? (
        <View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={data.name}
            placeholderTextColor={colors.textSubtle}
            accessibilityLabel="New name"
            style={[styles.input, {
              borderColor: colors.border, color: colors.text, backgroundColor: colors.surface,
            }]}
          />
          <View style={styles.row}>
            <Button
              label="Save name"
              loading={update.isPending}
              onPress={() => update.mutate(
                { id: data.id, patch: { name: name.trim() || data.name } },
                { onSuccess: () => setRenaming(false) },
              )}
              style={{ flex: 1 }}
            />
            <Button label="Cancel" variant="ghost" onPress={() => setRenaming(false)} />
          </View>
        </View>
      ) : (
        <View style={styles.rowBetween}>
          <Txt variant="display" serif style={{ flex: 1 }}>{data.name}</Txt>
          <Txt variant="bodySm" tone="accent" weight="semibold"
               onPress={() => { setName(data.name); setRenaming(true); }}>
            Rename
          </Txt>
        </View>
      )}

      <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
        {(data.occasion ?? 'Any occasion').replace(/_/g, ' ')}
      </Txt>

      {!data.reconstructable ? (
        <Card variant="tinted" accent="peach" style={{ marginTop: SPACE.lg }}>
          <Txt variant="bodySm">{data.note}</Txt>
        </Card>
      ) : null}

      {data.unavailable.length ? (
        <Card variant="tinted" accent="peach" style={{ marginTop: SPACE.lg }}>
          <Txt variant="bodySm">{data.note}</Txt>
          <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xs }}>
            {data.unavailable.map((item) => item.name ?? item.key).join(', ')}
          </Txt>
        </Card>
      ) : null}

      {usable ? (
        <View style={{ marginTop: SPACE.lg }}>
          <LookComposition composition={composition} />
        </View>
      ) : null}

      {/* ------------------------------------------------------- the pieces */}
      {usable ? (
        <View style={{ marginTop: SPACE.xl }}>
          <SectionHeader title="What is in it" />
          {composition.outfit.pieces.map((piece) => (
            <Card key={piece.slot} style={{ marginBottom: SPACE.sm }}>
              <Txt variant="overline" tone="subtle">{piece.label}</Txt>
              <Txt variant="body" weight="semibold">{piece.name}</Txt>
              {piece.colour ? (
                <Txt variant="bodySm" tone="muted">{piece.colour.name}</Txt>
              ) : null}
            </Card>
          ))}
          <Card style={{ marginBottom: SPACE.sm }}>
            <Txt variant="overline" tone="subtle">Hair, makeup and jewellery</Txt>
            <Txt variant="bodySm" style={{ marginTop: 2 }}>
              {composition.hair.styleName ?? '—'} ·{' '}
              {composition.makeup.aestheticName ?? '—'} ·{' '}
              {composition.jewellery.metalName ?? '—'}
            </Txt>
          </Card>
        </View>
      ) : null}

      {/* ------------------------------------------------------- why it is here */}
      {usable && composition.explanations.length ? (
        <View style={{ marginTop: SPACE.xl }}>
          <SectionHeader title="Why these choices" />
          {composition.explanations.map((explanation) => (
            <Card key={explanation.text} style={{ marginBottom: SPACE.sm }}>
              <Txt variant="caption" tone="subtle">{BASIS_LABEL[explanation.basis]}</Txt>
              <Txt variant="bodySm" style={{ marginTop: 2 }}>{explanation.text}</Txt>
            </Card>
          ))}
        </View>
      ) : null}

      {/* ------------------------------------------------------------ status */}
      <SectionHeader title="Status" style={{ marginTop: SPACE.xl }} />
      <View style={styles.wrap}>
        {STATUSES.map((status) => (
          <Chip
            key={status.key}
            label={status.label}
            accent="sage"
            selected={data.status === status.key}
            onPress={() => update.mutate({ id: data.id, patch: { status: status.key } })}
          />
        ))}
      </View>

      {/* ------------------------------------------------------- collections */}
      <SectionHeader title="Collections" style={{ marginTop: SPACE.xl }} />
      <View style={styles.wrap}>
        {(collections.data?.collections ?? []).map((collection) => {
          const has = collection.lookIds.includes(data.id);
          return (
            <Chip
              key={collection.id}
              label={`${collection.name}${has ? ' ✓' : ''}`}
              accent="lavender"
              selected={has}
              onPress={() => (has
                ? removeFrom.mutate({ collectionId: collection.id, lookId: data.id })
                : addTo.mutate({ collectionId: collection.id, lookId: data.id }))}
            />
          );
        })}
      </View>
      <View style={[styles.row, { marginTop: SPACE.sm }]}>
        <TextInput
          value={newCollection}
          onChangeText={setNewCollection}
          placeholder="New collection"
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel="New collection name"
          style={[styles.input, { flex: 1, marginTop: 0 },
            { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
        />
        <Button
          label="Add"
          variant="secondary"
          disabled={!newCollection.trim()}
          loading={createCollection.isPending}
          onPress={() => createCollection.mutate(newCollection.trim(), {
            onSuccess: (collection) => {
              addTo.mutate({ collectionId: collection.id, lookId: data.id });
              setNewCollection('');
            },
          })}
        />
      </View>
      {inCollections.length === 0 ? (
        <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.xs }}>
          Not in a collection yet.
        </Txt>
      ) : null}

      {/* ---------------------------------------------------------- actions */}
      <SectionHeader title="Actions" style={{ marginTop: SPACE.xl }} />
      {usable ? (
        <Button
          label="Edit this look"
          onPress={() => {
            startEditing(data.id, composition);
            router.push('/look/builder' as never);
          }}
        />
      ) : null}
      <Button
        label="Duplicate"
        variant="secondary"
        loading={duplicate.isPending}
        style={{ marginTop: SPACE.sm }}
        onPress={() => duplicate.mutate(
          { id: data.id, name: `${data.name} (variant)`, clientToken: newClientToken() },
          { onSuccess: (copy) => router.push(`/look/${copy.id}` as never) },
        )}
      />
      <Button
        label="Compare with another look"
        variant="secondary"
        style={{ marginTop: SPACE.sm }}
        onPress={() => router.push(`/look/compare?preselect=${data.id}` as never)}
      />
      <Button
        label="Delete this look"
        variant="ghost"
        loading={remove.isPending}
        style={{ marginTop: SPACE.sm }}
        onPress={() => remove.mutate(data.id, { onSuccess: () => router.back() })}
      />
      {update.isError || remove.isError || duplicate.isError ? (
        <ErrorState message="That did not go through. Try again." />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxl, paddingBottom: SPACE.xxxl * 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  input: {
    minHeight: 48,
    marginTop: SPACE.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.lg,
  },
});
