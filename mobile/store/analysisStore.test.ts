import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockGetLatest = jest.fn<() => Promise<unknown>>();
const mockGetAnalysis = jest.fn<(id: string) => Promise<unknown>>();
jest.mock('../services/analysisService', () => ({
  getLatestAnalysis: () => mockGetLatest(),
  getAnalysis: (id: string) => mockGetAnalysis(id),
}));
jest.mock('../services/authService', () => ({
  logout: async () => undefined,
  getCurrentUser: async () => null,
  getStoredTokens: async () => null,
}));

import { useAnalysisStore } from './analysisStore';
import { useAuthStore } from './authStore';
import { readCachedAnalysis, writeCachedAnalysis } from '../services/localCache';
import { AnalysisResult } from '../types';

// A cached analysis must never outlive the account it belongs to: a stale
// pre-fix "Oval" profile kept painting after the server said the user had none.
const cached = { id: 'old', status: 'complete' } as unknown as AnalysisResult;

describe('cached analysis invalidation', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await writeCachedAnalysis(cached);
    useAnalysisStore.setState({ currentAnalysis: cached, analyses: [cached] });
    mockGetLatest.mockReset();
  });

  it('clears the cache when the server has no analysis (404)', async () => {
    mockGetLatest.mockResolvedValue({ success: false, data: null, error: 'No analysis found', status: 404 });

    await useAnalysisStore.getState().loadLatest();

    expect(useAnalysisStore.getState().currentAnalysis).toBeNull();
    expect(await readCachedAnalysis()).toBeNull();
  });

  it('keeps the cache when the server is unreachable', async () => {
    mockGetLatest.mockResolvedValue({ success: false, data: null, error: 'Network Error' });

    await useAnalysisStore.getState().loadLatest();

    expect(useAnalysisStore.getState().currentAnalysis).toEqual(cached);
    expect(await readCachedAnalysis()).toEqual(cached);
  });

  it('clears cached analysis on logout', async () => {
    await useAuthStore.getState().logout();

    expect(useAnalysisStore.getState().currentAnalysis).toBeNull();
    expect(useAnalysisStore.getState().analyses).toEqual([]);
    expect(await readCachedAnalysis()).toBeNull();
  });
});

// Closing the app mid-scan used to leave "processing" on screen forever:
// loadLatest fetched once and never polled.
describe('resuming an analysis that was still processing', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useAnalysisStore.setState({ currentAnalysis: null, analyses: [], isAnalyzing: false });
    mockGetLatest.mockReset();
    mockGetAnalysis.mockReset();
  });

  it('polls until the scan resolves, then shows the finished result', async () => {
    jest.useFakeTimers();
    mockGetLatest.mockResolvedValue({ success: true, data: { id: 'a1', status: 'processing' } });
    mockGetAnalysis.mockResolvedValue({ success: true, data: { id: 'a1', status: 'complete' } });

    const pending = useAnalysisStore.getState().loadLatest();
    await jest.advanceTimersByTimeAsync(2500);
    await pending;
    jest.useRealTimers();

    expect(mockGetAnalysis).toHaveBeenCalledWith('a1');
    expect(useAnalysisStore.getState().currentAnalysis).toMatchObject({ id: 'a1', status: 'complete' });
    expect(useAnalysisStore.getState().isAnalyzing).toBe(false);
  });
});
