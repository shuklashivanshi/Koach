import { type App, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export interface IdentityProvider {
  /** Verifies a Firebase ID token; rejects when invalid or expired. */
  verifyIdToken(token: string): Promise<{ uid: string; email: string | null }>;
  /** Returns the Firebase uid for an email, creating a verified user if none exists. */
  resolveUidForEmail(email: string): Promise<string>;
  createCustomToken(uid: string): Promise<string>;
  /** Deletes the Firebase user; succeeds if it is already gone. */
  deleteUser(uid: string): Promise<void>;
}

function hasCode(err: unknown, code: string): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === code;
}

export function firebaseIdentity(projectId: string): IdentityProvider {
  // Application Default Credentials: the koach-api service account on Cloud Run.
  const app: App = initializeApp({ projectId });
  const auth = getAuth(app);
  return {
    async verifyIdToken(token) {
      const decoded = await auth.verifyIdToken(token, true);
      return { uid: decoded.uid, email: decoded.email ?? null };
    },
    async resolveUidForEmail(email) {
      try {
        return (await auth.getUserByEmail(email)).uid;
      } catch (err) {
        if (!hasCode(err, 'auth/user-not-found')) throw err;
        return (await auth.createUser({ email, emailVerified: true })).uid;
      }
    },
    createCustomToken: (uid) => auth.createCustomToken(uid),
    async deleteUser(uid) {
      try {
        await auth.deleteUser(uid);
      } catch (err) {
        if (!hasCode(err, 'auth/user-not-found')) throw err;
      }
    },
  };
}

/** Local development only: accepts `Bearer dev:<uid>` and fakes everything else. */
export function devIdentity(): IdentityProvider {
  return {
    verifyIdToken(token) {
      if (!token.startsWith('dev:')) return Promise.reject(new Error('invalid dev token'));
      const uid = token.slice(4);
      // Email-code users are `dev-<email>`; any other uid gets a placeholder address.
      const email = uid.startsWith('dev-') && uid.includes('@') ? uid.slice(4) : `${uid}@dev.local`;
      return Promise.resolve({ uid, email });
    },
    resolveUidForEmail: (email) => Promise.resolve(`dev-${email}`),
    createCustomToken: (uid) => Promise.resolve(`dev:${uid}`),
    deleteUser: () => Promise.resolve(),
  };
}
