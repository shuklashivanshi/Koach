// Web build: local testing against the API's dev identity (`Bearer dev:<uid>`), with no
// Firebase involved. The session lives in localStorage so a page reload keeps you signed in.
// Same exports as firebase.ts, so screens and AuthProvider are unchanged.
export interface SessionUser {
  uid: string;
  email: string | null;
}

const KEY = 'koach.devToken';
const listeners = new Set<(user: SessionUser | null) => void>();

function readToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function userFor(token: string | null): SessionUser | null {
  if (!token?.startsWith('dev:')) return null;
  const uid = token.slice(4);
  // Mirrors the API's dev identity: email-code users are `dev-<email>`.
  const email = uid.startsWith('dev-') && uid.includes('@') ? uid.slice(4) : `${uid}@dev.local`;
  return { uid, email };
}

function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked (private window); the session lasts until reload.
  }
  const user = userFor(token);
  listeners.forEach((cb) => cb(user));
}

export function onUserChanged(cb: (user: SessionUser | null) => void): () => void {
  listeners.add(cb);
  cb(userFor(readToken()));
  return () => listeners.delete(cb);
}

/** No Google on localhost: signs in as a fixed local test user. */
export function signInWithGoogle(): Promise<'signed-in' | 'cancelled'> {
  setToken('dev:local-google');
  return Promise.resolve('signed-in');
}

/** The local API's email verify returns `dev:<uid>` as its "custom token". */
export function signInWithEmailCodeToken(customToken: string): Promise<void> {
  if (!customToken.startsWith('dev:')) {
    return Promise.reject(new Error('web build expects the local API (dev identity)'));
  }
  setToken(customToken);
  return Promise.resolve();
}

export function currentIdToken(): Promise<string | null> {
  return Promise.resolve(readToken());
}

export function signOut(): Promise<void> {
  setToken(null);
  return Promise.resolve();
}
