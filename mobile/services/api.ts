import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types';
import { getFreshIdToken } from './authService';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const API_VERSION = process.env.EXPO_PUBLIC_API_VERSION ?? 'v1';

const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/${API_VERSION}`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ---- case conversion (backend = snake_case, app = camelCase) ----

function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

function toCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function convertKeys(value: unknown, mapKey: (k: string) => string): unknown {
  if (Array.isArray(value)) return value.map((v) => convertKeys(v, mapKey));
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.entries(value as Record<string, unknown>).reduce(
      (acc, [k, v]) => {
        acc[mapKey(k)] = convertKeys(v, mapKey);
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }
  return value;
}

export function camelize<T>(data: unknown): T {
  return convertKeys(data, toCamel) as T;
}

export function snakeize(data: unknown): unknown {
  return convertKeys(data, toSnake);
}

// ---- interceptors ----

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getFreshIdToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Convert JSON bodies to snake_case; leave FormData untouched.
  if (config.data && !(config.data instanceof FormData)) {
    config.data = snakeize(config.data);
  }
  return config;
});

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
    return error.message;
  }
  return error instanceof Error ? error.message : 'Request failed';
}

// All helpers normalize the raw backend payload into the app's ApiResponse
// envelope and camelCase shape, so callers never see snake_case or raw errors.

async function request<T>(fn: () => Promise<{ data: unknown }>): Promise<ApiResponse<T>> {
  try {
    const { data } = await fn();
    return { success: true, data: camelize<T>(data) };
  } catch (error) {
    return { success: false, data: null, error: errorMessage(error) };
  }
}

export async function get<T>(path: string): Promise<ApiResponse<T>> {
  return request<T>(() => api.get(path));
}

export async function post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  return request<T>(() => api.post(path, body ?? {}));
}

export async function put<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  return request<T>(() => api.put(path, body));
}

export async function del<T>(path: string): Promise<ApiResponse<T>> {
  return request<T>(() => api.delete(path));
}

export async function uploadFile<T>(
  path: string,
  fileUri: string,
  mimeType: string,
  onProgress?: (pct: number) => void,
): Promise<ApiResponse<T>> {
  return request<T>(() => {
    const formData = new FormData();
    formData.append('file', { uri: fileUri, type: mimeType, name: 'upload' } as unknown as Blob);
    return api.post(path, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
  });
}

export default api;
