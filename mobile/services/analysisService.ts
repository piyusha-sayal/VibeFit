import { get, post, del, uploadFile } from './api';
import { AnalysisResult, ApiResponse } from '../types';

export async function uploadAndAnalyze(
  imageUri: string,
  mimeType: string,
  onProgress?: (pct: number) => void,
): Promise<ApiResponse<AnalysisResult>> {
  return uploadFile<AnalysisResult>('/analysis/upload', imageUri, mimeType, onProgress);
}

export async function getAnalysis(id: string): Promise<ApiResponse<AnalysisResult>> {
  return get<AnalysisResult>(`/analysis/${id}`);
}

// Backend returns a plain list for this endpoint (not a paginated envelope).
export async function listAnalyses(page = 1, limit = 10): Promise<ApiResponse<AnalysisResult[]>> {
  return get<AnalysisResult[]>(`/analysis?page=${page}&limit=${limit}`);
}

export async function getLatestAnalysis(): Promise<ApiResponse<AnalysisResult>> {
  return get<AnalysisResult>('/analysis/latest');
}

export async function deleteAnalysis(id: string): Promise<ApiResponse<null>> {
  return del<null>(`/analysis/${id}`);
}
