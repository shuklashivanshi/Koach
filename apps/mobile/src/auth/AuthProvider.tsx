import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';
import { setUnauthorizedHandler } from '../api/client';
import { onUserChanged, type SessionUser, signOut } from './firebase';

type AuthState =
  { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; user: SessionUser };

const AuthContext = createContext<AuthState>({ status: 'loading' });

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    setUnauthorizedHandler(() => void signOut());
    return onUserChanged((user) =>
      setState(user ? { status: 'signed-in', user } : { status: 'signed-out' }),
    );
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
