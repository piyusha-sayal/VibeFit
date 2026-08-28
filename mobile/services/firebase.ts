import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  // @ts-ignore — exported at runtime, types missing in some firebase versions
  getReactNativePersistence,
  Auth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

function unconfiguredAuthProxy(): Auth {
  const message =
    'Firebase not configured. Add EXPO_PUBLIC_FIREBASE_API_KEY (and other keys) to mobile/.env then restart Expo.';
  return new Proxy(
    {
      currentUser: null,
      onAuthStateChanged: (_cb: unknown) => () => {},
    } as unknown as Auth,
    {
      get(target, prop) {
        if (prop === 'currentUser') return null;
        if (prop === 'onAuthStateChanged') return () => () => {};
        return () => {
          throw new Error(message);
        };
      },
    },
  );
}

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  if (!isFirebaseConfigured) {
    // eslint-disable-next-line no-console
    console.warn('[firebase] Skipping init — env vars missing. Sign-in disabled.');
    _auth = unconfiguredAuthProxy();
    return _auth;
  }

  if (!_app) {
    _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  try {
    _auth = initializeAuth(_app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    _auth = getAuth(_app);
  }
  return _auth;
}

export const auth: Auth = new Proxy({} as Auth, {
  get(_t, prop) {
    const real = getFirebaseAuth() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === 'function' ? (value as Function).bind(real) : value;
  },
});
