import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { ApiResponse } from '../types';
import { getFreshIdToken } from './authService';
import {
  REQUEST_TIMEOUT_MS, retryDelayMs, shouldRetry, trackSlowRequest,
} from './coldStart';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * Send and receive this body exactly as written, with no case conversion.
     *
     * A Create My Look composition is a document the server produced and the
     * client hands straight back. Rewriting its inner keys to snake_case on the
     * way out would corrupt it, so those requests opt out. Nothing is sent over
     * the wire for this — it is a local axios flag.
     */
    preserveCase?: boolean;
  }
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const API_VERSION = process.env.EXPO_PUBLIC_API_VERSION ?? 'v1';

const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/${API_VERSION}`,
  timeout: REQUEST_TIMEOUT_MS,
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

/**
 * The body as it should be sent.
 *
 * Exported so the rule is testable on its own: FormData and opted-out bodies
 * go over the wire exactly as written, everything else is converted.
 */
export function encodeBody(data: unknown, preserveCase = false): unknown {
  if (!data || data instanceof FormData || preserveCase) return data;
  return snakeize(data);
}

// ---- interceptors ----

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getFreshIdToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.data = encodeBody(config.data, config.preserveCase);
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs a request, retrying only when it is safe to.
 *
 * `method` decides whether a retry is allowed at all: a failed POST or PATCH
 * is surfaced to the caller rather than repeated, so a save can never be
 * duplicated by a retry.
 */
async function request<T>(
  fn: () => Promise<{ data: unknown }>,
  method: string = 'get',
  preserveCase = false,
): Promise<ApiResponse<T>> {
  const endSlowTracking = trackSlowRequest();
  try {
    for (let attempt = 0; ; attempt += 1) {
      try {
        const { data } = await fn();
        return { success: true, data: (preserveCase ? data : camelize<T>(data)) as T };
      } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const isNetworkError = axios.isAxiosError(error) && !error.response;

        if (shouldRetry({ method, status, isNetworkError, attempt })) {
          await sleep(retryDelayMs(attempt));
          continue;
        }
        return { success: false, data: null, error: errorMessage(error), status };
      }
    }
  } finally {
    endSlowTracking();
  }
}

export interface RequestOptions {
  /** Opt this request out of snake_case / camelCase conversion. */
  preserveCase?: boolean;
}

export async function get<T>(
  path: string, params?: Record<string, unknown>, options?: RequestOptions,
): Promise<ApiResponse<T>> {
  const preserveCase = options?.preserveCase ?? false;
  return request<T>(
    () => api.get(path, { params: params ? (snakeize(params) as object) : undefined, preserveCase }),
    'get',
    preserveCase,
  );
}

export async function post<T>(
  path: string, body?: unknown, options?: RequestOptions,
): Promise<ApiResponse<T>> {
  // Never retried: a repeated POST creates a duplicate.
  const preserveCase = options?.preserveCase ?? false;
  return request<T>(() => api.post(path, body ?? {}, { preserveCase }), 'post', preserveCase);
}

export async function put<T>(
  path: string, body: unknown, options?: RequestOptions,
): Promise<ApiResponse<T>> {
  const preserveCase = options?.preserveCase ?? false;
  return request<T>(() => api.put(path, body, { preserveCase }), 'put', preserveCase);
}

export async function patch<T>(
  path: string, body: unknown, options?: RequestOptions,
): Promise<ApiResponse<T>> {
  const preserveCase = options?.preserveCase ?? false;
  return request<T>(() => api.patch(path, body, { preserveCase }), 'patch', preserveCase);
}

export async function del<T>(path: string): Promise<ApiResponse<T>> {
  return request<T>(() => api.delete(path), 'delete');
}

/**
 * React Native's FormData accepts a `{ uri, type, name }` descriptor and streams
 * the file itself. Browsers do not: they would send "[object Object]". On web
 * the picker returns a data:/blob: URI, so read it into a Blob first.
 */
export async function buildUploadForm(fileUri: string, mimeType: string): Promise<FormData> {
  const formData = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(fileUri)).blob();
    const typed = blob.type ? blob : new Blob([blob], { type: mimeType });
    formData.append('file', typed, `upload.${typed.type.split('/')[1] ?? 'jpg'}`);
  } else {
    formData.append('file', { uri: fileUri, type: mimeType, name: 'upload' } as unknown as Blob);
  }
  return formData;
}

export async function uploadFile<T>(
  path: string,
  fileUri: string,
  mimeType: string,
  onProgress?: (pct: number) => void,
): Promise<ApiResponse<T>> {
  return request<T>(async () => {
    const formData = await buildUploadForm(fileUri, mimeType);
    return api.post(path, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
  });
}

export default api;
