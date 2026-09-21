/**
 * Client for Create My Look.
 *
 * A composition is a document the server builds and the client hands back
 * unchanged, so every call that carries one opts out of case conversion. The
 * client holds no styling knowledge: occasions, structures, components and
 * variations all come from `/looks/options`.
 *
 * Saving reuses the Passport's SavedLook. There is one saved-items system.
 */
import { del, get, patch, post } from './api';

const RAW = { preserveCase: true } as const;

// ------------------------------------------------------------------- shapes

export interface Swatch {
  name: string;
  hex: string;
  role?: string;
}

export interface LookPiece {
  slot: string;
  label: string;
  role: 'main' | 'layer' | 'bottom' | 'drape' | 'footwear' | 'bag' | string;
  required: boolean;
  note: string;
  key: string;
  name: string;
  category: string;
  region: string;
  description: string;
  silhouette: string;
  formality: string;
  styling: string[];
  reasons: string[];
  colour: Swatch | null;
  colourRole: string;
  available: boolean;
}

export interface LookHarmony {
  roles: string[];
  colours: Swatch[];
  harmony: string;
  label: string;
  why: string;
}

/** Why a component was chosen, with the basis named rather than implied. */
export type ExplanationBasis =
  | 'personal_colour' | 'face_shape' | 'preference' | 'occasion' | 'general';

export interface Explanation {
  component: string;
  basis: ExplanationBasis;
  text: string;
}

export interface LookComposition {
  name: string;
  occasion: string | null;
  occasionLabel?: string;
  aesthetic: string | null;
  structure: string;
  personalisation: 'quick' | 'personalised' | 'full';
  outfit: {
    structure: string;
    structureName: string;
    region: string;
    summary: string;
    formality: string;
    pieces: LookPiece[];
  };
  colours: {
    season: string | null;
    seasonLabel: string | null;
    best: Swatch[];
    neutrals: Swatch[];
    accents: Swatch[];
    harmony: LookHarmony | null;
    note: string | null;
  };
  hair: {
    style: string | null;
    styleName: string | null;
    summary: string | null;
    length: string | null;
    maintenance: string | null;
    disclaimer: string;
    available: boolean;
  };
  hairColour: {
    colour: string | null;
    colourName: string | null;
    hex?: string | null;
    lift: string | null;
    offered: boolean;
    note: string | null;
  };
  makeup: {
    aesthetic: string | null;
    aestheticName: string | null;
    intensity: string | null;
    minutes: number | null;
    summary: string | null;
    steps: string[];
    techniques: string[];
    missingAttributes: string[];
    available: boolean;
  };
  lipstick: { name: string | null; hex: string | null; offered: boolean; note: string };
  jewellery: {
    metal: string | null;
    metalName: string | null;
    metalHex: string | null;
    earrings: string | null;
    earringsName: string | null;
    necklace: string | null;
    necklaceName: string | null;
    neckline: string | null;
    available: boolean;
  };
  accessories: { category: string; key: string; name: string; description: string; origin: string }[];
  footwear: LookPiece | null;
  preferencesUsed: string[];
  missingProfile: string[];
  explanations: Explanation[];
}

export interface ProfileGap {
  key: string;
  label: string;
  route: string;
}

export interface LookContext {
  level: 'quick' | 'personalised' | 'full';
  using: { key: string; label: string; value: string | null }[];
  excluded: string[];
  missing: ProfileGap[];
  excludable: { key: string; label: string }[];
}

export interface LookBrief {
  occasion?: string | null;
  customOccasion?: string | null;
  aesthetics?: string[];
  regions?: string[];
  exclude?: string[];
  limit?: number;
}

export interface GeneratedLooks {
  looks: LookComposition[];
  count: number;
  context: LookContext;
  brief: LookBrief;
}

export interface LookOption {
  key: string;
  name: string;
  detail: string | null;
  meta: string | null;
  reasons?: string[];
  verdict?: string | null;
}

export interface StructureSlot {
  slot: string;
  label: string;
  role: string;
  required: boolean;
  note: string;
}

export interface LookOptions {
  occasions: { key: string; label: string; formality: string }[];
  structures: {
    key: string; name: string; region: string; summary: string;
    formality: string; occasions: string[]; slots: StructureSlot[];
  }[];
  components: string[];
  shifts: { key: string; label: string; detail: string }[];
  verdicts: string[];
  aesthetics: { key: string; name: string; summary: string }[];
  excludable: { key: string; label: string }[];
  visualisationNote: string;
}

export interface LookDraft {
  id: string;
  name: string | null;
  occasion: string | null;
  composition: LookComposition;
  brief: LookBrief | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedLook {
  id: string;
  name: string;
  kind: string;
  status: 'saved' | 'want_to_try' | 'tried';
  occasion: string | null;
  payload: LookComposition | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  created?: boolean;
}

export interface ReopenedLook extends SavedLook {
  composition: LookComposition;
  reconstructable: boolean;
  editable?: boolean;
  unavailable: { component: string; key: string; name?: string }[];
  note: string | null;
}

export interface LookComparison {
  rows: { key: string; label: string }[];
  looks: {
    id: string;
    name: string;
    status: string;
    values: Record<string, string>;
    swatches: Swatch[];
  }[];
}

export type Verdict = 'love' | 'not_my_style' | 'want_to_try' | 'tried';

// -------------------------------------------------------------------- calls

export const getLookOptions = () => get<LookOptions>('/looks/options');

export const getLookContext = (exclude: string[] = []) =>
  get<LookContext>('/looks/context', exclude.length ? { exclude: exclude.join(',') } : undefined);

export const generateLooks = (brief: LookBrief) =>
  post<GeneratedLooks>('/looks/generate', brief, RAW);

export interface AlternativeQuery {
  component: string;
  structure: string;
  slot?: string;
  occasion?: string | null;
  aesthetic?: string | null;
  exclude?: string[];
}

export function getAlternatives(query: AlternativeQuery) {
  const params: Record<string, string> = {
    component: query.component,
    structure: query.structure,
  };
  if (query.slot) params.slot = query.slot;
  if (query.occasion) params.occasion = query.occasion;
  if (query.aesthetic) params.aesthetic = query.aesthetic;
  if (query.exclude?.length) params.exclude = query.exclude.join(',');
  return get<{ component: string; slot: string | null; count: number; options: LookOption[] }>(
    '/looks/alternatives', params,
  );
}

export interface Selection {
  slot?: string;
  key?: string;
  name?: string;
  kind?: 'metal' | 'earrings' | 'necklace';
  colour?: Swatch;
}

export const applyComponent = (
  composition: LookComposition, component: string, selection: Selection,
) => post<{ composition: LookComposition; changed: boolean; note: string | null }>(
  '/looks/apply', { composition, component, selection }, RAW,
);

export const shiftLook = (composition: LookComposition, kind: string) =>
  post<{ composition: LookComposition; changed: boolean; note: string | null }>(
    '/looks/shift', { composition, kind }, RAW,
  );

export const listDrafts = () => get<{ drafts: LookDraft[] }>('/looks/drafts', undefined, RAW);

export const getDraft = (id: string) => get<LookDraft>(`/looks/drafts/${id}`, undefined, RAW);

export const saveDraft = (payload: {
  composition: LookComposition; draftId?: string | null; name?: string | null; brief?: LookBrief | null;
}) => post<LookDraft>('/looks/drafts', payload, RAW);

export const discardDraft = (id: string) => del<void>(`/looks/drafts/${id}`);

export const listSavedLooks = (status?: string) =>
  get<{ looks: SavedLook[]; count: number }>('/looks/saved', status ? { status } : undefined, RAW);

export const saveLook = (payload: {
  composition: LookComposition;
  name?: string | null;
  status?: string;
  notes?: string | null;
  clientToken?: string;
  draftId?: string | null;
}) => post<SavedLook>('/looks/save', payload, RAW);

export const getSavedLook = (id: string) => get<ReopenedLook>(`/looks/${id}`, undefined, RAW);

export const updateLook = (id: string, patchBody: {
  name?: string; status?: string; notes?: string; composition?: LookComposition;
}) => patch<SavedLook>(`/looks/${id}`, patchBody, RAW);

export const duplicateLook = (id: string, payload: { name?: string; clientToken?: string }) =>
  post<SavedLook>(`/looks/${id}/duplicate`, payload, RAW);

export const deleteLook = (id: string) => del<void>(`/passport/looks/${id}`);

export const compareLooks = (ids: string[]) =>
  get<LookComparison>('/looks/compare', { ids: ids.join(',') }, RAW);

export const sendFeedback = (component: string, itemKey: string, verdict: Verdict) =>
  post<{ component: string; itemKey: string; verdict: string }>(
    '/looks/feedback', { component, itemKey, verdict },
  );

export const getFeedback = () =>
  get<{ feedback: { component: string; itemKey: string; verdict: string }[] }>('/looks/feedback');

// ------------------------------------------------------------- collections

export interface Collection {
  id: string;
  name: string;
  slug: string | null;
  lookIds: string[];
  count: number;
}

export const listCollections = () => get<{ collections: Collection[] }>('/passport/collections');

export const createCollection = (name: string) =>
  post<{ id: string; name: string; created: boolean }>('/passport/collections', { name });

export const addToCollection = (collectionId: string, lookId: string) =>
  post<{ added: boolean }>(`/passport/collections/${collectionId}/looks`, { lookId });

export const removeFromCollection = (collectionId: string, lookId: string) =>
  del<void>(`/passport/collections/${collectionId}/looks/${lookId}`);

/**
 * A stable token for one save attempt.
 *
 * The builder generates it once per save and reuses it on retry, so a request
 * that is replayed after a slow network returns the look already saved rather
 * than creating a second copy.
 */
export function newClientToken(): string {
  return `look-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
