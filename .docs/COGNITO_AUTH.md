# Cognito auth (login required on start)

Checklist to add registration and sign-in with AWS Cognito and require login when the app starts. Auth lives in shared; web and mobile use the same API.

---

## What already exists (do not modify)

- **amplify/auth/resource.ts** – Defines Cognito User Pool with `loginWith: { email: true }`. User signs in with email and password; verification is by email.
- **app/shared/amplify/amplifyAdapter.ts** – Configures Amplify once; used by both data and auth. Auth adapter calls `ensureConfigured()` before any Auth API.

---

## Checklist

- [ ] **1. Backend auth** – In `amplify/auth/resource.ts`, ensure `defineAuth` uses `loginWith: { email: true }` (or `phone` if you prefer). Deploy with `npm run sandbox` so `amplify_outputs.json` includes auth config.
- [ ] **2. Auth adapter** – Add `app/shared/amplify/authAdapter.ts`. Call `ensureConfigured()` then re-export wrappers around `signIn`, `signUp`, `confirmSignUp`, `resendSignUpCode`, `signOut`, and a function that returns the current user or null (e.g. `authGetCurrentUser()` using `getCurrentUser` from `aws-amplify/auth`). Export a small `AuthUser` type (e.g. `userId`, `username`). Do not export Amplify or config from shared; apps only see the adapter API.
- [ ] **3. AuthProvider and useAuth** – Add `app/shared/AuthContext.tsx` with `AuthProvider` (holds auth state and signIn/signOut/refresh) and `useAuth()` that reads from React Context. So all components share the same auth state; when AuthScreen calls signIn, App sees the update and can show the home screen. Export `AuthProvider` and `useAuth` from `app/shared/index.ts`.
- [ ] **4. Wrap app with AuthProvider** – In web and mobile entry points, wrap the root with `<AuthProvider>` so `useAuth()` works and state is shared (e.g. `main.tsx` and `index.tsx`).
- [ ] **5. App gate** – In the root component, use `useAuth()`. If `isLoading` show a loading state. If not `isAuthenticated` show the auth screen (sign-in / sign-up / confirm). Otherwise show the main app (e.g. HomeScreen) and a sign-out action.
- [ ] **6. Auth UI** – Implement auth screens (separate component or inline): sign-in form (email, password, submit), sign-up form (email, password, submit → may transition to confirm), confirm form (code input, submit, resend code). Call `useAuth()` and use its callbacks; show errors from thrown exceptions. Web and mobile can each have their own UI; they must not import Amplify or `amplify_outputs.json`.

---

## Rules

**Do**

- Keep all Cognito/Amplify Auth usage inside `app/shared/amplify/`. Apps import `AuthProvider` and `useAuth` (and types) from `app-shared`. Wrap the app root with `AuthProvider` so auth state is shared and sign-in updates the whole tree.
- Use the same auth adapter for web and mobile so behaviour is consistent.
- Require login before showing main content: check `isAuthenticated` and render auth screen when false.
- Use email as username when the backend is configured with `loginWith: { email: true }` (signIn/signUp username = email).

**Do not**

- Call `Amplify.configure()` or reference `amplify_outputs.json` in web or mobile app code.
- Put `aws-amplify` in app `package.json`; it is a dependency of `app-shared` only.
- Skip confirmation in sign-up when Cognito is configured to require it; handle `CONFIRM_SIGN_UP` and show the confirm screen.

---

## Backend auth example

In `amplify/auth/resource.ts`:

```ts
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});
```

Ensure `auth` is passed to `defineBackend` in `amplify/backend.ts`.

---

## Auth adapter example

```ts
// app/shared/amplify/authAdapter.ts
import {
  confirmSignUp,
  getCurrentUser,
  resendSignUpCode,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth';
import { ensureConfigured } from './amplifyAdapter';

export type AuthUser = {
  userId: string;
  username: string;
};

export async function authSignIn(username: string, password: string): Promise<void> {
  await ensureConfigured();
  await signIn({ username, password });
}

export async function authSignUp(
  username: string,
  password: string,
  options?: { email?: string }
): Promise<{ needsConfirmation: boolean }> {
  await ensureConfigured();
  const { nextStep } = await signUp({
    username,
    password,
    options: {
      userAttributes: options?.email ? { email: options.email } : undefined,
    },
  });
  const needsConfirmation =
    nextStep.signUpStep === 'CONFIRM_SIGN_UP' ||
    nextStep.signUpStep === 'COMPLETE_AUTO_SIGN_IN';
  return { needsConfirmation };
}

export async function authConfirmSignUp(
  username: string,
  confirmationCode: string
): Promise<void> {
  await ensureConfigured();
  await confirmSignUp({ username, confirmationCode });
}

export async function authResendSignUpCode(username: string): Promise<void> {
  await ensureConfigured();
  await resendSignUpCode({ username });
}

export async function authSignOut(): Promise<void> {
  await ensureConfigured();
  await signOut();
}

export async function authGetCurrentUser(): Promise<AuthUser | null> {
  await ensureConfigured();
  try {
    const { userId, username } = await getCurrentUser();
    return { userId, username };
  } catch {
    return null;
  }
}
```

---

## useAuth hook example

```ts
// app/shared/useAuth.ts
import { useCallback, useEffect, useState } from 'react';
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

export function useAuth() {
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
      await refresh();
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

  return {
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
}
```

Add to `app/shared/index.ts`: `export { useAuth } from './useAuth';` and `export type { AuthState } from './useAuth';` and `export type { AuthUser } from './amplify/authAdapter';`

---

## App gate example (web)

```tsx
// app/web/src/App.tsx
import { useAuth } from 'app-shared';
import AuthScreen from './AuthScreen';

function App() {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();

  if (isLoading) return <div><p>Loading…</p></div>;
  if (!isAuthenticated) return <AuthScreen />;

  return (
    <div>
      <h1>Hello, {user?.username ?? 'User'}</h1>
      <button type="button" onClick={() => signOut()}>Sign out</button>
    </div>
  );
}
```

---

## App gate example (mobile)

```tsx
// app/mobile/App.tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from 'app-shared';
import AuthScreen from './AuthScreen';

export default function App() {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading…</Text>
      </View>
    );
  }
  if (!isAuthenticated) return <AuthScreen />;

  return (
    <View style={styles.container}>
      <Text>Hello, {user?.username ?? 'User'}</Text>
      <TouchableOpacity onPress={() => signOut()}>
        <Text>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## Before and after

**Before starting:** Amplify backend is deployed (`npm run sandbox`), `amplify_outputs.json` exists at repo root, and `amplify/auth/resource.ts` defines auth with email (or phone). Web and mobile already resolve config via Vite alias and Metro (see **.docs/AMPLIFY_SHARED_CONFIG.md**).

**After finishing:** Opening the app shows a loading state, then either the sign-in/sign-up screen or the main screen if already signed in. New users can sign up, receive a code by email, confirm, then are signed in. Signed-in users see main content and can sign out.

**If sign-in fails with "User does not exist":** User must sign up first. If they already signed up, ensure they confirmed with the code sent to their email.

**If "Amplify has not been configured":** The auth adapter runs before the adapter has configured Amplify. Ensure every auth adapter function calls `ensureConfigured()` first; do not call Auth APIs from app code before any use of shared (e.g. first render that uses `useAuth()` will trigger config).
