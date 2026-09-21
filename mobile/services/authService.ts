import {
  createUserWithEmailAndPassword,
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

export async function getFreshIdToken(): Promise<string | null> {
  const fbUser = await restoredFirebaseUser();
  if (!fbUser) return null;
  return fbUser.getIdToken(false);
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (fbUser) => {
    callback(fbUser ? mapUser(fbUser) : null);
  });
}
