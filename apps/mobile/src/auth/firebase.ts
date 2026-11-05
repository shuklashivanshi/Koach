// Thin adapter over React Native Firebase + Google Sign-In, so screens and tests never touch
// native modules directly.
import {
  getAuth,
  getIdToken,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithCustomToken,
  signOut as fbSignOut,
} from '@react-native-firebase/auth';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { appConfig } from '../config';

export interface SessionUser {
  uid: string;
  email: string | null;
}

let configured = false;
function configureGoogle() {
  if (configured) return;
  GoogleSignin.configure({ webClientId: appConfig.googleWebClientId });
  configured = true;
}

/** Subscribes to sign-in state; Firebase persists the session across restarts (D-07). */
export function onUserChanged(cb: (user: SessionUser | null) => void): () => void {
  return onAuthStateChanged(getAuth(), (u) => cb(u ? { uid: u.uid, email: u.email } : null));
}

/** Returns 'cancelled' when the user backs out of the Google sheet. */
export async function signInWithGoogle(): Promise<'signed-in' | 'cancelled'> {
  configureGoogle();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const res = await GoogleSignin.signIn();
  if (!isSuccessResponse(res)) return 'cancelled';
  const idToken = res.data.idToken;
  if (!idToken) throw new Error('Google returned no idToken');
  await signInWithCredential(getAuth(), GoogleAuthProvider.credential(idToken));
  return 'signed-in';
}

export async function signInWithEmailCodeToken(customToken: string): Promise<void> {
  await signInWithCustomToken(getAuth(), customToken);
}

/** Current ID token (auto-refreshed by the SDK), or null when signed out. */
export async function currentIdToken(): Promise<string | null> {
  const user = getAuth().currentUser;
  return user ? getIdToken(user) : null;
}

export async function signOut(): Promise<void> {
  try {
    configureGoogle();
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google; nothing to clear.
  }
  await fbSignOut(getAuth());
}
