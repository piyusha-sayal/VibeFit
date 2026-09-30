import { router } from 'expo-router';

/**
 * Hands a photo from the in-app camera screen back to whoever opened it.
 *
 * The camera is a screen, not a function call, so the caller awaits a promise
 * that the screen settles when a photo is taken (or closed without one).
 */
export interface CapturedPhoto {
  uri: string;
  mimeType: string;
}

let pending: ((photo: CapturedPhoto | null) => void) | null = null;

export function openInAppCamera(): Promise<CapturedPhoto | null> {
  // A second open replaces the first; the earlier caller gets "no photo".
  pending?.(null);
  return new Promise((resolve) => {
    pending = resolve;
    router.push('/camera' as never);
  });
}

/** Called by the camera screen exactly once, with the photo or null. */
export function settleCapture(photo: CapturedPhoto | null): void {
  const resolve = pending;
  pending = null;
  resolve?.(photo);
}
