import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  signInAnonymously,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';
import { ApiResponse, AuthTokens, User } from '../types';

interface LoginPayload { email: string; password: string }
interface RegisterPayload { email: string; password: string; name: string }
interface AuthData { user: User; tokens: AuthTokens }

const TOKEN_LIFETIME_MS = 60 * 60 * 1000;

function mapUser(fbUser: FirebaseUser, name?: string): User {
  return {
    id: fbUser.uid,
    email: fbUser.email ?? '',
    name: name ?? fbUser.displayName ?? (fbUser.isAnonymous ? 'Guest' : ''),
    avatar: fbUser.photoURL ?? undefined,
    createdAt: fbUser.metadata.creationTime ?? new Date().toISOString(),
  };
}

async function buildTokens(fbUser: FirebaseUser): Promise<AuthTokens> {
  const accessToken = await fbUser.getIdToken();
  const refreshToken = fbUser.refreshToken;
  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + TOKEN_LIFETIME_MS,
  };
}

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code: unknown }).code);
    switch (code) {
      case 'auth/invalid-email': return 'Invalid email address.';
      case 'auth/email-already-in-use': return 'Email already registered.';
      case 'auth/weak-password': return 'Password is too weak.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/too-many-requests': return 'Too many attempts. Try again later.';
      case 'auth/operation-not-allowed':
        return 'Anonymous sign-in is disabled. Enable it in Firebase console → Authentication → Sign-in method.';
      case 'auth/admin-restricted-operation':
        return 'New sign-ups are switched off for this app right now. Please try again later.';
      case 'auth/network-request-failed': return 'Network error. Check your connection.';
      default: return code.replace('auth/', '').replace(/-/g, ' ');
    }
  }
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}

export async function login(payload: LoginPayload): Promise<ApiResponse<AuthData>> {
  try {
    const cred = await signInWithEmailAndPassword(auth, payload.email, payload.password);
    const tokens = await buildTokens(cred.user);
    return { success: true, data: { user: mapUser(cred.user), tokens } };
  } catch (err) {
    return { success: false, data: null, error: errorMessage(err) };
  }
}

export async function register(payload: RegisterPayload): Promise<ApiResponse<AuthData>> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
    if (payload.name) {
      await updateProfile(cred.user, { displayName: payload.name });
    }
    const tokens = await buildTokens(cred.user);
    return { success: true, data: { user: mapUser(cred.user, payload.name), tokens } };
  } catch (err) {
    return { success: false, data: null, error: errorMessage(err) };
  }
}

export async function loginWithGoogleIdToken(idToken: string): Promise<ApiResponse<AuthData>> {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredential(auth, credential);
    const tokens = await buildTokens(cred.user);
    return { success: true, data: { user: mapUser(cred.user), tokens } };
  } catch (err) {
    return { success: false, data: null, error: errorMessage(err) };
  }
}

/**
 * Opens an anonymous Firebase session: a real uid and a real ID token, so the
 * backend creates and authorizes a normal user row without any credentials.
 * Only reachable from builds with the guest flag on.
 */
export async function loginAsGuest(): Promise<ApiResponse<AuthData>> {
  try {
    const cred = await signInAnonymously(auth);
    const tokens = await buildTokens(cred.user);
    return { success: true, data: { user: mapUser(cred.user), tokens } };
  } catch (err) {
    return { success: false, data: null, error: errorMessage(err) };
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Email a password-reset link. An unknown email gets the same answer as a
 * known one, so the form cannot be used to discover who has an account.
 */
export async function sendPasswordReset(email: string): Promise<ApiResponse<null>> {
  const address = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(address)) {
    return { success: false, data: null, error: 'Enter the email address you signed up with.' };
  }
  try {
    await sendPasswordResetEmail(auth, address);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code !== 'auth/user-not-found') return { success: false, data: null, error: errorMessage(err) };
  }
  return { success: true, data: null };
}

/** Only email-and-password accounts have a password to change. */
export function canChangePassword(): boolean {
  const user = isFirebaseConfigured ? auth.currentUser : null;
  return Boolean(user?.email && user.providerData.some((p) => p.providerId === 'password'));
}

/** Re-authenticate with the current password, then set the new one. */
export async function changePassword(current: string, next: string): Promise<ApiResponse<null>> {
  if (next.length < MIN_PASSWORD_LENGTH) {
    return { success: false, data: null, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  const user = auth.currentUser;
  if (!canChangePassword() || !user?.email) {
    return { success: false, data: null, error: 'This account signs in without a password.' };
  }
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const wrong = code === 'auth/invalid-credential' || code === 'auth/wrong-password';
    return { success: false, data: null, error: wrong ? 'Your current password is incorrect.' : errorMessage(err) };
  }
  try {
    await updatePassword(user, next);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, data: null, error: errorMessage(err) };
  }
}

/** Keep the Firebase profile name in step with the account name. */
export async function setFirebaseDisplayName(name: string): Promise<void> {
  const user = isFirebaseConfigured ? auth.currentUser : null;
  if (user) await updateProfile(user, { displayName: name });
}

/**
 * Remove the Firebase sign-in after the server has deleted the account's data,
 * so the same email cannot sign back in to a freshly provisioned empty account.
 * False when Firebase refuses, typically because the sign-in is no longer recent.
 */
export async function deleteFirebaseAccount(): Promise<boolean> {
  if (!isFirebaseConfigured || !auth.currentUser) return true;
  try {
    await deleteUser(auth.currentUser);
    return true;
  } catch {
    return false;
  }
}

// Firebase restores a persisted sign-in asynchronously; `currentUser` is null
// until then, so reading it directly at launch would sign the user out.
async function restoredFirebaseUser(): Promise<FirebaseUser | null> {
  if (!isFirebaseConfigured) return null;
  await auth.authStateReady();
  return auth.currentUser;
}

export async function getStoredTokens(): Promise<AuthTokens | null> {
  const fbUser = await restoredFirebaseUser();
  if (!fbUser) return null;
  return buildTokens(fbUser);
}

export async function getCurrentUser(): Promise<User | null> {
  const fbUser = await restoredFirebaseUser();
  return fbUser ? mapUser(fbUser) : null;
}

/** `force` skips Firebase's cached token, for a retry after the server said 401. */
export async function getFreshIdToken(force = false): Promise<string | null> {
  const fbUser = await restoredFirebaseUser();
  if (!fbUser) return null;
  return fbUser.getIdToken(force);
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (fbUser) => {
    callback(fbUser ? mapUser(fbUser) : null);
  });
}
