import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  authConfirmSignUp,
  authGetCurrentUser,
  authResendSignUpCode,
  authSignIn,
  authSignOut,
  authSignUp,
  type AuthUser,
} from './amplify/authAdapter';

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: AuthUser };

type AuthValue = {
  state: AuthState;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (
    username: string,
    password: string,
    options?: { email?: string }
  ) => Promise<{ needsConfirmation: boolean }>;
  confirmSignUp: (username: string, confirmationCode: string) => Promise<void>;
  resendSignUpCode: (username: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const refresh = useCallback(async () => {
    const user = await authGetCurrentUser();
    setState(
      user
        ? { status: 'authenticated', user }
        : { status: 'unauthenticated' }
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      await authSignIn(username, password);
      setState({
        status: 'authenticated',
        user: { userId: '', username },
      });
      refresh();
    },
    [refresh]
  );

  const signUp = useCallback(
    async (
      username: string,
      password: string,
      options?: { email?: string }
    ): Promise<{ needsConfirmation: boolean }> => {
      return authSignUp(username, password, options);
    },
    []
  );

  const confirmSignUp = useCallback(
    async (username: string, confirmationCode: string) => {
      await authConfirmSignUp(username, confirmationCode);
      await refresh();
    },
    [refresh]
  );

  const resendSignUpCode = useCallback(async (username: string) => {
    await authResendSignUpCode(username);
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setState({ status: 'unauthenticated' });
  }, []);

  const value: AuthValue = {
    state,
    isLoading: state.status === 'loading',
    isAuthenticated: state.status === 'authenticated',
    user: state.status === 'authenticated' ? state.user : null,
    signIn,
    signUp,
    confirmSignUp,
    resendSignUpCode,
    signOut,
    refresh,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
