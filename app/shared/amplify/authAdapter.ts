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

function logAuthError(operation: string, err: unknown): void {
  const payload: Record<string, unknown> = {
    operation,
    message: err instanceof Error ? err.message : String(err),
  };
  if (err instanceof Error) {
    payload.name = err.name;
    if ('cause' in err && (err as Error & { cause?: unknown }).cause !== undefined) {
      payload.cause = (err as Error & { cause?: unknown }).cause;
    }
  }
  if (err && typeof err === 'object' && 'underlyingError' in err) {
    payload.underlyingError = (err as { underlyingError?: unknown }).underlyingError;
  }
  console.error('[auth]', payload);
  if (err instanceof Error) console.error(err);
}

export async function authSignIn(username: string, password: string): Promise<void> {
  await ensureConfigured();
  try {
    await signIn({ username, password });
  } catch (err) {
    logAuthError('signIn', err);
    throw err;
  }
}

export async function authSignUp(
  username: string,
  password: string,
  options?: { email?: string }
): Promise<{ needsConfirmation: boolean }> {
  await ensureConfigured();
  try {
    const { nextStep } = await signUp({
      username,
      password,
      ...(options?.email && {
        options: { userAttributes: { email: options.email } },
      }),
    });
    const needsConfirmation =
      nextStep.signUpStep === 'CONFIRM_SIGN_UP' ||
      nextStep.signUpStep === 'COMPLETE_AUTO_SIGN_IN';
    return { needsConfirmation };
  } catch (err) {
    logAuthError('signUp', err);
    throw err;
  }
}

export async function authConfirmSignUp(
  username: string,
  confirmationCode: string
): Promise<void> {
  await ensureConfigured();
  try {
    await confirmSignUp({ username, confirmationCode });
  } catch (err) {
    logAuthError('confirmSignUp', err);
    throw err;
  }
}

export async function authResendSignUpCode(username: string): Promise<void> {
  await ensureConfigured();
  try {
    await resendSignUpCode({ username });
  } catch (err) {
    logAuthError('resendSignUpCode', err);
    throw err;
  }
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
