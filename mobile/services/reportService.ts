// SDK 54 moved the classic downloadAsync/cacheDirectory API to /legacy.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getFreshIdToken } from './authService';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const API_VERSION = process.env.EXPO_PUBLIC_API_VERSION ?? 'v1';

export interface ReportResult {
  success: boolean;
  uri?: string;
  error?: string;
}

async function shareFile(uri: string, mimeType: string, dialogTitle: string, uti: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType, dialogTitle, UTI: uti });
  }
}

/**
 * Download an auth-gated binary artifact (GET) to a local file and share it.
 */
async function downloadAndShare(
  path: string, filename: string, mimeType: string, uti: string, dialogTitle: string,
): Promise<ReportResult> {
  try {
    const token = await getFreshIdToken();
    if (!token) return { success: false, error: 'You must be signed in.' };

    const url = `${BASE_URL}/api/${API_VERSION}/${path}`;
    const target = `${FileSystem.cacheDirectory}${filename}`;
    const { status, uri } = await FileSystem.downloadAsync(url, target, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (status !== 200) return { success: false, error: `Unavailable (status ${status}).` };

    await shareFile(uri, mimeType, dialogTitle, uti);
    return { success: true, uri };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Download failed.' };
  }
}

/** Download the face-analysis PDF for an analysis and open the share sheet. */
export function downloadAndShareReport(analysisId: string): Promise<ReportResult> {
  return downloadAndShare(
    `analysis/${analysisId}/report`, `vibefit-report-${analysisId}.pdf`,
    'application/pdf', 'com.adobe.pdf', 'VibeFit Face Report');
}

/** Download the shareable summary card (PNG) for an analysis (F6). */
export function downloadAndShareCard(analysisId: string): Promise<ReportResult> {
  return downloadAndShare(
    `analysis/${analysisId}/card`, `vibefit-card-${analysisId}.png`,
    'image/png', 'public.png', 'VibeFit Summary Card');
}

/**
 * Build an annotated overlay (F3) from a remote image URL and share it.
 * Fetches the source image, POSTs it to the stateless overlay endpoint.
 */
export async function downloadAndShareOverlay(imageUrl: string): Promise<ReportResult> {
  try {
    const token = await getFreshIdToken();
    if (!token) return { success: false, error: 'You must be signed in.' };
    if (!/^https?:\/\//.test(imageUrl)) {
      return { success: false, error: 'Overlay needs a stored image (cloud upload).' };
    }

    const src = await fetch(imageUrl);
    const blob = await src.blob();
    const form = new FormData();
    // RN FormData accepts a Blob with a filename via any-cast.
    form.append('file', blob as unknown as Blob, 'source.jpg');

    const res = await fetch(`${BASE_URL}/api/${API_VERSION}/analysis/overlay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) return { success: false, error: `Overlay unavailable (status ${res.status}).` };

    const buf = await res.arrayBuffer();
    const base64 = arrayBufferToBase64(buf);
    const target = `${FileSystem.cacheDirectory}vibefit-overlay.png`;
    await FileSystem.writeAsStringAsync(target, base64, { encoding: 'base64' });

    await shareFile(target, 'image/png', 'VibeFit Facial Overlay', 'public.png');
    return { success: true, uri: target };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Overlay failed.' };
  }
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  // global.btoa exists in RN Hermes; fall back to Buffer if absent.
  const g = globalThis as unknown as { btoa?: (s: string) => string; Buffer?: { from(s: string, enc: string): { toString(enc: string): string } } };
  if (typeof g.btoa === 'function') return g.btoa(binary);
  if (g.Buffer) return g.Buffer.from(binary, 'binary').toString('base64');
  throw new Error('No base64 encoder available');
}
