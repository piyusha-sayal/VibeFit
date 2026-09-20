import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalysisResult } from '../types';

/**
 * Last-known analysis, persisted on device.
 *
 * The backend can be cold-starting, asleep or unreachable when the app opens.
 * Rendering the last result as soon as it is read — then refreshing in the
 * background — means the home and profile screens are never blank on launch.
 *
 * Storage backend: AsyncStorage. It works in Expo Go, development builds and
 * web alike. (react-native-mmkv 2.x was used before, but it only installs
 * through the legacy bridge, so under SDK 54's New Architecture and in Expo Go
 * it always fell back to memory and nothing survived a restart.)
 */
const LATEST_ANALYSIS_KEY = 'vibefit-cache:latestAnalysis';

export async function readCachedAnalysis(): Promise<AnalysisResult | null> {
  try {
    const raw = await AsyncStorage.getItem(LATEST_ANALYSIS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnalysisResult;
    // Only completed scans are worth showing; a stale `processing` row would
    // render an empty profile.
    return parsed?.status === 'complete' ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeCachedAnalysis(analysis: AnalysisResult): Promise<void> {
  if (analysis.status !== 'complete') return;
  try {
    await AsyncStorage.setItem(LATEST_ANALYSIS_KEY, JSON.stringify(analysis));
  } catch {
    // Cache writes are best-effort.
  }
}

export async function clearCachedAnalysis(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LATEST_ANALYSIS_KEY);
  } catch {
    // no-op
  }
}
