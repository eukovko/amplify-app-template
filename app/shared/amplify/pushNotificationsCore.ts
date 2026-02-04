import { ensureConfigured, getDataClient } from './amplifyStorageAdapter';

export type SendPushResult =
  | { success: true }
  | { success: false; message: string; details?: Record<string, unknown> };

export type RegisterForPushResult = { ok: true } | { ok: false; error: string };

export async function sendPushNotification(message: string): Promise<SendPushResult> {
  await ensureConfigured();
  const c = getDataClient();
  if (!c) throw new Error('Not configured');
  const { data, errors } = await c.queries.sendPush({ message });
  if (errors?.length) {
    console.error('[push] sendPush query errors', errors);
    throw new Error(errors.map((e) => e.message).join(', '));
  }
  const raw = typeof data === 'string' ? data : (data as Record<string, unknown>)?.sendPush;
  console.log('[push] sendPush raw response', raw);
  try {
    const result = typeof raw === 'string' ? JSON.parse(raw) : null;
    console.log('[push] parsed result', result);
    if (result?.ok) return { success: true };
    return {
      success: false,
      message: result?.error ?? 'Push failed',
      details: result?.details ?? undefined,
    };
  } catch (e) {
    console.error('[push] parse error', e, 'raw:', raw);
    return { success: false, message: 'Invalid response' };
  }
}
