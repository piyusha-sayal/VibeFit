import { create } from 'zustand';
import { AnalysisResult } from '../types';
import * as analysisService from '../services/analysisService';

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
  currentAnalysis: null,
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
      set((s) => ({
        currentAnalysis: response.data!,
        analyses: [response.data!, ...s.analyses],
      }));
      return response.data;
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
      if (response.success && response.data) set({ currentAnalysis: response.data });
    } catch {
      // silently ignore — user may not have any analyses yet
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
