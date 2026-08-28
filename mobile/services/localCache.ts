import { AnalysisResult } from '../types';

/**
 * Last-known analysis, persisted on device.
 *
 * The backend can be cold-starting, asleep or unreachable when the app opens.
 * Rendering the last result immediately — then refreshing in the background —
 * means the home and profile screens are never blank on launch.
 *
 * Storage backend: MMKV when the native module is present, otherwise an
 * in-memory fallback. react-native-mmkv is a JSI module and is NOT available in
 * Expo Go, so constructing it eagerly would crash the app on startup there.
 * Loading it lazily behind a try/catch keeps Expo Go working (cache simply does
 * not survive a restart) while real dev/production builds get persistence.
 */
interface KeyValueStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

function createMemoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getString: (key) => map.get(key),
    set: (key, value) => void map.set(key, value),
    delete: (key) => void map.delete(key),
  };
}

let store: KeyValueStore | null = null;

function getStore(): KeyValueStore {
  if (store) return store;
  try {
    // Required lazily: throws in Expo Go, where the native module is absent.
    const { MMKV } = require('react-native-mmkv');
    store = new MMKV({ id: 'vibefit-cache' }) as KeyValueStore;
  } catch {
    store = createMemoryStore();
  }
  return store;
}

const LATEST_ANALYSIS_KEY = 'latestAnalysis';

export function readCachedAnalysis(): AnalysisResult | null {
  try {
    const raw = getStore().getString(LATEST_ANALYSIS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnalysisResult;
    // Only completed scans are worth showing; a stale `processing` row would
    // render an empty profile.
    return parsed?.status === 'complete' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedAnalysis(analysis: AnalysisResult): void {
  try {
    if (analysis.status !== 'complete') return;
    getStore().set(LATEST_ANALYSIS_KEY, JSON.stringify(analysis));
  } catch {
    // Cache writes are best-effort.
  }
}

export function clearCachedAnalysis(): void {
  try {
    getStore().delete(LATEST_ANALYSIS_KEY);
  } catch {
    // no-op
  }
}
