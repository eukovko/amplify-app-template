import type { Schema } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/send-push';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

const DEVICE_PUSH_TOKEN_KEY = 'devicePushToken';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function fail(error: string, details?: Record<string, unknown>): string {
  return JSON.stringify({ ok: false, error, details: details ?? undefined });
}

export const handler: Schema['sendPush']['functionHandler'] = async (event) => {
  const { message } = event.arguments;
  console.log('[send-push] invoked', { messageLength: message?.length ?? 0 });
  const { data: tokenRecord, errors: getErrors } = await client.models.AppStorage.get({
    key: DEVICE_PUSH_TOKEN_KEY,
  });
  if (getErrors?.length) {
    console.error('[send-push] AppStorage get failed', getErrors);
    return fail('Failed to read device token', {
      source: 'AppStorage',
      errors: getErrors.map((e) => e.message),
    });
  }
  const token = tokenRecord?.value;
  const hasToken = !!token;
  const validToken = !!token?.startsWith('ExponentPushToken[');
  console.log('[send-push] token check', { hasToken, validToken, tokenPrefix: token?.slice(0, 25) ?? null });
  if (!validToken) {
    console.warn('[send-push] no valid device push token in AppStorage');
    return fail('No device push token registered', {
      hint: 'Open the mobile app on a real device, grant notification permission, and ensure it can reach the backend.',
    });
  }
  const body = [
    {
      to: token,
      sound: 'default' as const,
      body: message ?? '',
    },
  ];
  let res: Response;
  let result: unknown;
  try {
    res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    result = await res.json().catch(() => ({ _raw: await res.text() }));
    console.log('[send-push] Expo response', { status: res.status, statusText: res.statusText, result });
  } catch (err) {
    console.error('[send-push] fetch error', err);
    return fail('Network error calling push service', {
      cause: err instanceof Error ? err.message : String(err),
    });
  }
  if (!res.ok) {
    console.error('[send-push] Expo non-OK', res.status, result);
    return fail(`Push service returned ${res.status}`, {
      status: res.status,
      statusText: res.statusText,
      body: result,
    });
  }
  const ticket = (result as { data?: Array<{ status?: string; message?: string; details?: unknown }> })?.data?.[0];
  if (ticket?.status === 'error') {
    console.error('[send-push] Expo ticket error', ticket);
    return fail(ticket.message ?? 'Push delivery failed', {
      expoTicket: ticket.details ?? ticket,
    });
  }
  console.log('[send-push] success');
  return JSON.stringify({ ok: true });
};
