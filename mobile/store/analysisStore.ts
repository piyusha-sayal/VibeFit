import { create } from 'zustand';
import { AnalysisResult } from '../types';
import * as analysisService from '../services/analysisService';
import { readCachedAnalysis, writeCachedAnalysis } from '../services/localCache';

// The backend runs the ML pipeline as a background job, so upload returns a
// `processing` row and we poll until it resolves. A cold-starting free-tier
// host can make the first scan slow, hence the generous ceiling.
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface AnalysisState {
  currentAnalysis: AnalysisResult | null;
  analyses: AnalysisResult[];
  isUploading: boolean;
  uploadProgress: number;
  isAnalyzing: boolean;
  error: string | null;
  upload: (uri: string, mimeType: string) => Promise<AnalysisResult>;
  loadLatest: () => Promise<void>;
  loadAll: () => Promise<void>;
  setCurrentAnalysis: (analysis: AnalysisResult) => void;
  clearError: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  // Paint instantly from the device cache; loadLatest() refreshes from network.
  currentAnalysis: readCachedAnalysis(),
  analyses: [],
  isUploading: false,
  uploadProgress: 0,
  isAnalyzing: false,
  error: null,

  upload: async (uri, mimeType) => {
    set({ isUploading: true, uploadProgress: 0, error: null, isAnalyzing: false });
    try {
      const response = await analysisService.uploadAndAnalyze(uri, mimeType, (pct) => {
        if (pct === 100) set({ isUploading: false, isAnalyzing: true });
        else set({ uploadProgress: pct });
      });
      if (!response.success || !response.data) throw new Error(response.error ?? 'Analysis failed');

      set({ isUploading: false, isAnalyzing: true });
      const finished = await pollUntilResolved(response.data);

      if (finished.status === 'failed') {
        throw new Error(finished.errorMessage ?? 'Analysis failed. Please try another photo.');
      }

      writeCachedAnalysis(finished);
      set((s) => ({
        currentAnalysis: finished,
        analyses: [finished, ...s.analyses.filter((a) => a.id !== finished.id)],
      }));
      return finished;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      set({ error: msg });
      throw err;
    } finally {
      set({ isUploading: false, isAnalyzing: false, uploadProgress: 0 });
    }
  },

  loadLatest: async () => {
    try {
      const response = await analysisService.getLatestAnalysis();
      if (response.success && response.data) {
        writeCachedAnalysis(response.data);
        set({ currentAnalysis: response.data });
      }
    } catch {
      // Offline or backend asleep — keep whatever the cache already painted.
    }
  },

  loadAll: async () => {
    try {
      const response = await analysisService.listAnalyses();
      if (response.success && response.data) set({ analyses: response.data });
    } catch {
      // silently ignore
    }
  },

  setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
  clearError: () => set({ error: null }),
}));

/**
 * Poll a pending analysis until the backend marks it complete or failed.
 * Transient fetch errors are tolerated — a cold-starting host may refuse a few
 * requests before it is ready — but a timeout surfaces as a failure so the user
 * is never left on an endless spinner.
 */
async function pollUntilResolved(initial: AnalysisResult): Promise<AnalysisResult> {
  if (initial.status !== 'processing') return initial;

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let latest = initial;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const res = await analysisService.getAnalysis(initial.id);
    if (res.success && res.data) {
      latest = res.data;
      if (latest.status !== 'processing') return latest;
    }
  }

  return {
    ...latest,
    status: 'failed',
    errorMessage: 'Analysis is taking longer than expected. Please try again.',
  };
}
