/**
 * The interactive Look Builder.
 *
 * One shared draft: changing the hairstyle does not reset the outfit, and
 * leaving for another tab does not lose the work. Every edit goes to the
 * server, which recomposes and hands the whole document back — the styling
 * rules live in one place rather than being re-implemented here.
 *
 * The composition is autosaved as a draft. It becomes a saved look only when
 * the user says so, and that save is idempotent: a retry after a slow network
 * returns the look already saved rather than making a second copy.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  Button, Card, Chip, ErrorState, LoadingState, SectionHeader, Txt,
} from '../../components/ds';
import { ComponentRow, ComponentSheet, LookComposition } from '../../components/look';
import { RADIUS, SPACE } from '../../constants/theme';
import {
  useAlternatives, useApplyComponent, useDraft, useLookOptions, useSaveDraft,
  useSaveLook, useSendFeedback, useShiftLook, useUpdateLook,
} from '../../hooks/useLook';
import type { Explanation, LookOption, Selection } from '../../services/lookService';
import { newClientToken } from '../../services/lookService';
import { useLookDraft } from '../../store/lookDraft';
import { useTheme } from '../../theme/ThemeProvider';

const AUTOSAVE_DELAY_MS = 1_200;

/** Which component a sheet is editing, and which part of it. */
interface Target {
  component: string;
  slot?: string;
  kind?: 'metal' | 'earrings' | 'necklace';
  label: string;
  subtitle?: string | null;
  currentKey?: string | null;
}

export default function LookBuilderScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { draftId: draftIdParam } = useLocalSearchParams<{ draftId?: string }>();

  const draft = useLookDraft();
  const remoteDraft = useDraft(draftIdParam && !draft.composition ? draftIdParam : null);
  const options = useLookOptions();

  const apply = useApplyComponent();
  const shift = useShiftLook();
  const saveDraft = useSaveDraft();
  const saveLook = useSaveLook();
  const updateLook = useUpdateLook();
  const feedback = useSendFeedback();

  const [target, setTarget] = useState<Target | null>(null);
  const [name, setName] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  // Remembered separately from the store, which is cleared on a successful save.
  const [savedMode, setSavedMode] = useState<'created' | 'updated'>('created');
  const [notice, setNotice] = useState<string | null>(null);

  const composition = draft.composition;
  const editing = Boolean(draft.editingLookId);
  const saving = saveLook.isPending || updateLook.isPending;

  // Resuming an unfinished look from another session.
  useEffect(() => {
    if (remoteDraft.data && !draft.composition) {
      draft.resume(remoteDraft.data.id, remoteDraft.data.composition, remoteDraft.data.brief);
      setName(remoteDraft.data.name ?? '');
    }
  }, [remoteDraft.data]);

  useEffect(() => {
    if (composition && !name) setName(composition.name);
  }, [composition]);

  // Autosave, debounced. One draft row, updated in place.
  useEffect(() => {
    if (!composition || !draft.dirty || draft.editingLookId) return undefined;
    const timer = setTimeout(() => {
      saveDraft.mutate(
        { composition, draftId: draft.draftId, name: name || composition.name, brief: draft.brief },
        {
          onSuccess: (row) => {
            draft.setDraftId(row.id);
            draft.markClean();
          },
        },
      );
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [composition, draft.dirty, name]);

  const alternativeQuery = useMemo(() => {
    if (!target || !composition) return null;
    return {
      component: target.component,
      structure: composition.structure,
      slot: target.slot,
      occasion: composition.occasion,
      aesthetic: composition.aesthetic,
    };
  }, [target, composition]);

  const alternatives = useAlternatives(alternativeQuery);

  const explanationsFor = useCallback((component: string): Explanation[] =>
    (composition?.explanations ?? []).filter((e) => e.component === component),
  [composition]);

  const choose = (option: LookOption) => {
    if (!composition || !target) return;
    const selection: Selection = { key: option.key, name: option.name };
    if (target.slot) selection.slot = target.slot;
    if (target.kind) selection.kind = target.kind;
    if (target.component === 'colours') {
      selection.colour = { hex: option.key, name: option.name, role: 'best' };
    }

    apply.mutate(
      { composition, component: target.component, selection },
      {
        onSuccess: (result) => {
          draft.setComposition(result.composition);
          setNotice(result.changed ? null : result.note);
          setTarget(null);
        },
      },
    );
  };

  const runShift = (kind: string) => {
    if (!composition) return;
    shift.mutate({ composition, kind }, {
      onSuccess: (result) => {
        draft.setComposition(result.composition);
        setNotice(result.changed ? null : result.note);
      },
    });
  };

  const commit = (status: 'saved' | 'want_to_try') => {
    if (!composition) return;

    // Editing an existing look rewrites it in place. Duplicating is a separate,
    // explicit action, so an edit can never silently fork someone's look.
    if (draft.editingLookId) {
      const lookId = draft.editingLookId;
      updateLook.mutate(
        { id: lookId, patch: { name: name.trim() || composition.name, status, composition } },
        { onSuccess: () => { setSavedMode('updated'); setSavedId(lookId); draft.clear(); } },
      );
      return;
    }

    const token = draft.saveToken ?? newClientToken();
    draft.setSaveToken(token);
    saveLook.mutate(
      {
        composition,
        name: name.trim() || composition.name,
        status,
        clientToken: token,
        draftId: draft.draftId,
      },
      {
        onSuccess: (look) => {
          setSavedMode('created');
          setSavedId(look.id);
          draft.clear();
        },
      },
    );
  };

  if (!composition) {
    if (remoteDraft.isLoading) return <LoadingState label="Opening your look…" />;
    return (
      <View style={[styles.empty, { backgroundColor: colors.bg }]}>
        <Txt variant="heading" serif>No look open</Txt>
        <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
          Start one from Create My Look.
        </Txt>
        <Button label="Create a look" onPress={() => router.replace('/look/new' as never)}
                style={{ marginTop: SPACE.lg }} />
      </View>
    );
  }

  if (savedId) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.bg }]}>
        <Txt variant="display" serif>{savedMode === 'updated' ? 'Updated' : 'Saved'}</Txt>
        <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
          It is in your passport, and on your timeline.
        </Txt>
        <Button label="Open it" onPress={() => router.replace(`/look/${savedId}` as never)}
                style={{ marginTop: SPACE.lg }} />
        <Button label="Build another" variant="ghost"
                onPress={() => router.replace('/look/new' as never)} />
      </View>
    );
  }

  const shifts = options.data?.shifts ?? [];
  const busy = apply.isPending || shift.isPending;
  const jewelleryOptions = (alternatives.data?.options ?? []).filter(
    (option) => !target?.kind || option.meta === target.kind,
  );

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Txt variant="display" serif>{composition.name}</Txt>
        <Txt variant="bodySm" tone="muted" style={{ marginTop: SPACE.xs }}>
          {composition.outfit.summary}
        </Txt>

        <View style={{ marginTop: SPACE.lg }}>
          <LookComposition composition={composition} />
        </View>

        {notice ? (
          <Card variant="tinted" accent="peach" style={{ marginTop: SPACE.md }}>
            <Txt variant="bodySm">{notice}</Txt>
          </Card>
        ) : null}

        {/* ------------------------------------------------ smart variations */}
        <SectionHeader title="Try a variation" style={{ marginTop: SPACE.xxl }} />
        <Txt variant="bodySm" tone="muted" style={{ marginBottom: SPACE.sm }}>
          Each of these changes only what it names. Everything else stays.
        </Txt>
        <View style={styles.wrap}>
          {shifts.map((entry) => (
            <Chip key={entry.key} label={entry.label} accent="gold"
                  onPress={() => runShift(entry.key)} />
          ))}
        </View>

        {/* ------------------------------------------------------ the outfit */}
        <SectionHeader title="Outfit" style={{ marginTop: SPACE.xxl }} />
        {composition.outfit.pieces.map((piece) => (
          <ComponentRow
            key={piece.slot}
            label={piece.label}
            value={piece.name}
            detail={piece.note || piece.description}
            explanations={piece.slot === composition.outfit.pieces[0].slot
              ? explanationsFor('outfit') : []}
            unavailableNote={piece.available ? null
              : 'No longer in our library — your choice is kept as it was.'}
            onChange={() => setTarget({
              component: 'outfit', slot: piece.slot, label: piece.label,
              subtitle: 'Only this piece changes.', currentKey: piece.key,
            })}
          />
        ))}

        {/* ----------------------------------------------------- the colours */}
        <SectionHeader title="Colours" style={{ marginTop: SPACE.xl }} />
        {composition.colours.note ? (
          <Txt variant="bodySm" tone="muted" style={{ marginBottom: SPACE.sm }}>
            {composition.colours.note}
          </Txt>
        ) : null}
        {composition.outfit.pieces.map((piece) => (
          <ComponentRow
            key={`colour-${piece.slot}`}
            label={`${piece.label} colour`}
            value={piece.colour?.name ?? 'Not chosen'}
            swatch={piece.colour?.hex ?? null}
            explanations={piece.slot === composition.outfit.pieces[0].slot
              ? explanationsFor('colours') : []}
            onChange={() => setTarget({
              component: 'colours', slot: piece.slot,
              label: `${piece.label} colour`,
              subtitle: composition.colours.seasonLabel
                ? `Your ${composition.colours.seasonLabel} palette, and every neutral in it.`
                : 'Pick anything. A palette appears once you run a colour analysis.',
              currentKey: piece.colour?.hex ?? null,
            })}
          />
        ))}

        {/* -------------------------------------------------- hair and makeup */}
        <SectionHeader title="Hair and makeup" style={{ marginTop: SPACE.xl }} />
        <ComponentRow
          label="Hairstyle"
          value={composition.hair.styleName}
          detail={composition.hair.summary}
          explanations={explanationsFor('hair')}
          onChange={() => setTarget({
            component: 'hair', label: 'Hairstyle',
            subtitle: composition.hair.disclaimer,
            currentKey: composition.hair.style,
          })}
        />
        <ComponentRow
          label="Hair colour"
          value={composition.hairColour.colourName}
          detail={composition.hairColour.note}
          swatch={composition.hairColour.hex ?? null}
          onChange={composition.hairColour.offered ? () => setTarget({
            component: 'hairColour', label: 'Hair colour',
            subtitle: 'Shade families. A salon still decides the formula.',
            currentKey: composition.hairColour.colour,
          }) : undefined}
        />
        <ComponentRow
          label="Makeup"
          value={composition.makeup.aestheticName}
          detail={composition.makeup.summary}
          explanations={explanationsFor('makeup')}
          onChange={() => setTarget({
            component: 'makeup', label: 'Makeup',
            subtitle: 'The occasion does not decide this. You do.',
            currentKey: composition.makeup.aesthetic,
          })}
        />
        <ComponentRow
          label="Lipstick"
          value={composition.lipstick.name}
          detail={composition.lipstick.note}
          swatch={composition.lipstick.hex}
          explanations={explanationsFor('lipstick')}
          onChange={composition.lipstick.offered ? () => setTarget({
            component: 'lipstick', label: 'Lipstick',
            subtitle: 'Shade families, not product matches.',
            currentKey: composition.lipstick.hex,
          }) : undefined}
        />

        {/* ------------------------------------------ jewellery and accessories */}
        <SectionHeader title="Jewellery and accessories" style={{ marginTop: SPACE.xl }} />
        <ComponentRow
          label="Metal"
          value={composition.jewellery.metalName}
          swatch={composition.jewellery.metalHex}
          explanations={explanationsFor('jewellery')}
          onChange={() => setTarget({
            component: 'jewellery', kind: 'metal', label: 'Metal',
            subtitle: 'Both suit most people. This is a preference, not a rule.',
            currentKey: composition.jewellery.metal,
          })}
        />
        <ComponentRow
          label="Earrings"
          value={composition.jewellery.earringsName}
          onChange={() => setTarget({
            component: 'jewellery', kind: 'earrings', label: 'Earrings',
            subtitle: 'Nothing is filtered out by your face.',
            currentKey: composition.jewellery.earrings,
          })}
        />
        <ComponentRow
          label="Necklace"
          value={composition.jewellery.necklaceName}
          detail={composition.jewellery.neckline
            ? `Coordinated with a ${composition.jewellery.neckline.replace(/_/g, ' ')} neckline.`
            : null}
          onChange={() => setTarget({
            component: 'jewellery', kind: 'necklace', label: 'Necklace',
            subtitle: 'Wearing none is an option, not an omission.',
            currentKey: composition.jewellery.necklace,
          })}
        />
        <ComponentRow
          label="Hair accessory"
          value={composition.accessories[0]?.name ?? null}
          detail={composition.accessories[0]?.description}
          onChange={() => setTarget({
            component: 'accessories', label: 'Hair accessory',
            subtitle: 'Offered because of the outfit, never because of you.',
            currentKey: composition.accessories[0]?.key ?? null,
          })}
        />

        {/* ------------------------------------------------------ save it */}
        <SectionHeader title={editing ? 'Save your changes' : 'Save this look'}
                       style={{ marginTop: SPACE.xxl }} />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name this look"
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel="Look name"
          style={[styles.input, {
            borderColor: colors.border, color: colors.text, backgroundColor: colors.surface,
          }]}
        />
        <Button label={editing ? 'Update this look' : 'Save to my looks'} loading={saving}
                onPress={() => commit('saved')} style={{ marginTop: SPACE.md }} />
        {!editing ? (
          <Button label="Save as want to try" variant="secondary"
                  loading={saving} onPress={() => commit('want_to_try')}
                  style={{ marginTop: SPACE.sm }} />
        ) : null}
        {saveLook.isError || updateLook.isError ? (
          <ErrorState message="We could not save that look."
                      onRetry={() => commit('saved')} />
        ) : null}

        <Txt variant="caption" tone="subtle" style={{ marginTop: SPACE.lg }}>
          {editing
            ? 'Editing a saved look. Nothing is written until you press save.'
            : draft.dirty ? 'Unsaved changes — kept as a draft.' : 'Draft saved.'}
        </Txt>
        {busy ? <Txt variant="caption" tone="subtle">Updating the look…</Txt> : null}
      </ScrollView>

      <ComponentSheet
        visible={Boolean(target)}
        title={target?.label ?? ''}
        subtitle={target?.subtitle}
        options={target?.component === 'jewellery'
          ? jewelleryOptions
          : alternatives.data?.options ?? []}
        currentKey={target?.currentKey}
        loading={alternatives.isLoading}
        error={Boolean(alternatives.error)}
        onRetry={() => { void alternatives.refetch(); }}
        onSelect={choose}
        onFeedback={(option, verdict) => feedback.mutate({
          component: target?.component ?? 'outfit', itemKey: option.key, verdict,
        })}
        onClose={() => setTarget(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxl, paddingBottom: SPACE.xxxl * 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xxl },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.lg,
  },
});
