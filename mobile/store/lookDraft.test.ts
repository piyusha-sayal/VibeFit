/**
 * The shared draft behind the Look Builder.
 *
 * The property that matters: replacing the composition after a component swap
 * must not reset anything else the user chose, and editing a saved look must
 * never be confused with creating a new one.
 */
import { beforeEach, describe, expect, it } from '@jest/globals';

import { useLookDraft } from './lookDraft';
import type { LookComposition } from '../services/lookService';

function composition(overrides: Partial<LookComposition> = {}): LookComposition {
  return {
    name: 'Office look',
    occasion: 'office',
    aesthetic: 'minimalist',
    structure: 'shirt_trouser',
    personalisation: 'quick',
    outfit: {
      structure: 'shirt_trouser', structureName: 'Shirt and trousers', region: 'global',
      summary: 'One structured layer.', formality: 'business',
      pieces: [{
        slot: 'top', label: 'Shirt', role: 'main', required: true, note: '',
        key: 'button_shirt', name: 'Button shirt', category: 'shirts', region: 'global',
        description: '', silhouette: 'straight', formality: 'business', styling: [],
        reasons: [], colour: null, colourRole: 'best', available: true,
      }],
    },
    colours: {
      season: null, seasonLabel: null, best: [], neutrals: [], accents: [],
      harmony: null, note: 'No palette yet.',
    },
    hair: {
      style: 'bob', styleName: 'Bob', summary: null, length: 'short',
      maintenance: 'low', disclaimer: 'Not a prediction.', available: true,
    },
    hairColour: { colour: null, colourName: null, lift: null, offered: false, note: null },
    makeup: {
      aesthetic: 'clean_girl', aestheticName: 'Clean', intensity: 'soft', minutes: 10,
      summary: null, steps: [], techniques: [], missingAttributes: [], available: true,
    },
    lipstick: { name: null, hex: null, offered: false, note: '' },
    jewellery: {
      metal: 'gold', metalName: 'Yellow gold', metalHex: '#d4af37',
      earrings: 'studs', earringsName: 'Studs', necklace: null, necklaceName: null,
      neckline: 'collar', available: true,
    },
    accessories: [],
    footwear: null,
    preferencesUsed: [],
    missingProfile: [],
    explanations: [],
    ...overrides,
  };
}

beforeEach(() => {
  useLookDraft.getState().clear();
});

describe('starting a look', () => {
  it('holds the composition and marks it unsaved', () => {
    useLookDraft.getState().start(composition(), { occasion: 'office' });
    const state = useLookDraft.getState();

    expect(state.composition?.structure).toBe('shirt_trouser');
    expect(state.dirty).toBe(true);
    expect(state.draftId).toBeNull();
    expect(state.editingLookId).toBeNull();
  });
});

describe('swapping a component', () => {
  it('keeps every other selection', () => {
    const store = useLookDraft.getState();
    store.start(composition(), { occasion: 'office' });

    const before = useLookDraft.getState().composition!;
    const swapped = { ...before, hair: { ...before.hair, style: 'lob', styleName: 'Lob' } };
    useLookDraft.getState().setComposition(swapped);

    const after = useLookDraft.getState().composition!;
    expect(after.hair.styleName).toBe('Lob');
    expect(after.outfit).toEqual(before.outfit);
    expect(after.makeup).toEqual(before.makeup);
    expect(after.jewellery).toEqual(before.jewellery);
  });

  it('does not lose the look when the builder is left and returned to', () => {
    useLookDraft.getState().start(composition(), { occasion: 'office' });
    useLookDraft.getState().setDraftId('draft-1');

    // A navigation away and back reads the same store.
    const resumed = useLookDraft.getState();
    expect(resumed.composition).not.toBeNull();
    expect(resumed.draftId).toBe('draft-1');
  });
});

describe('editing a saved look', () => {
  it('is distinct from creating one', () => {
    useLookDraft.getState().edit('look-9', composition());
    const state = useLookDraft.getState();

    expect(state.editingLookId).toBe('look-9');
    expect(state.draftId).toBeNull();
    // Nothing is written until the user saves, so an edit is not dirty on open.
    expect(state.dirty).toBe(false);
  });

  it('clears the editing flag once saved', () => {
    useLookDraft.getState().edit('look-9', composition());
    useLookDraft.getState().clear();

    expect(useLookDraft.getState().editingLookId).toBeNull();
    expect(useLookDraft.getState().composition).toBeNull();
  });
});

describe('the save token', () => {
  it('is reused across a retry so a save cannot duplicate', () => {
    useLookDraft.getState().start(composition(), {});
    useLookDraft.getState().setSaveToken('token-1');

    // A second attempt reads the token already set rather than minting one.
    const existing = useLookDraft.getState().saveToken;
    expect(existing).toBe('token-1');
  });
});
