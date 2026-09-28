import { patch } from './api';
import { setFirebaseDisplayName } from './authService';
import { ApiResponse } from '../types';

export const MAX_NAME_LENGTH = 60;

/**
 * Rename the account. The server copy is the one the app reads, so it goes
 * first; the Firebase profile name follows and is not worth failing over.
 */
export async function updateAccountName(name: string): Promise<ApiResponse<string>> {
  const clean = name.trim();
  if (!clean || clean.length > MAX_NAME_LENGTH) {
    return { success: false, data: null, error: `Enter a name of 1 to ${MAX_NAME_LENGTH} characters.` };
  }
  const res = await patch<{ name: string }>('/users/me', { name: clean });
  if (!res.success) return { success: false, data: null, error: res.error };
  try {
    await setFirebaseDisplayName(clean);
  } catch {
    // The server already holds the new name; the Firebase copy catches up next time.
  }
  return { success: true, data: clean };
}
