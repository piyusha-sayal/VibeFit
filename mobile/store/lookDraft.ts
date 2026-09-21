/**
 * The look currently being built.
 *
 * One shared draft, so changing a hairstyle does not reset the outfit and
 * leaving the builder for another tab does not lose the work. The server holds
 * the durable copy (see `/looks/drafts`); this store is what the screens read
 * between renders and navigations inside one app session.
 *
 * `setComposition` replaces the whole document because that is what the server
 * returns from every edit — the rules stay on the server, and the client never
 * patches a composition by hand.
 */
import { create } from 'zustand';

import type { LookBrief, LookComposition } from '../services/lookService';

interface LookDraftState {
  draftId: string | null;
  /** Set when the builder is editing a look that is already saved. */
  editingLookId: string | null;
  composition: LookComposition | null;
  brief: LookBrief | null;
  /** Set once per save attempt and reused on retry, so a retry cannot duplicate. */
  saveToken: string | null;
  /** True when the composition has changed since it was last persisted. */
  dirty: boolean;

  start: (composition: LookComposition, brief: LookBrief) => void;
  resume: (draftId: string, composition: LookComposition, brief: LookBrief | null) => void;
  edit: (lookId: string, composition: LookComposition) => void;
  setComposition: (composition: LookComposition) => void;
  setDraftId: (draftId: string) => void;
  setSaveToken: (token: string | null) => void;
  markClean: () => void;
  clear: () => void;
}

export const useLookDraft = create<LookDraftState>((set) => ({
  draftId: null,
  editingLookId: null,
  composition: null,
  brief: null,
  saveToken: null,
  dirty: false,

  start: (composition, brief) =>
    set({ draftId: null, editingLookId: null, composition, brief,
          saveToken: null, dirty: true }),

  resume: (draftId, composition, brief) =>
    set({ draftId, editingLookId: null, composition, brief,
          saveToken: null, dirty: false }),

  // Editing a saved look never autosaves a draft: the user's saved copy is
  // only rewritten when they press save.
  edit: (lookId, composition) =>
    set({ draftId: null, editingLookId: lookId, composition, brief: null,
          saveToken: null, dirty: false }),

  setComposition: (composition) => set({ composition, dirty: true }),

  setDraftId: (draftId) => set({ draftId }),

  setSaveToken: (saveToken) => set({ saveToken }),

  markClean: () => set({ dirty: false }),

  clear: () =>
    set({ draftId: null, editingLookId: null, composition: null, brief: null,
          saveToken: null, dirty: false }),
}));
