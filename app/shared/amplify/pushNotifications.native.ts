import * as Notifications from 'expo-notifications';
import { ensureConfigured, getDataClient } from './amplifyStorageAdapter';
import type { RegisterForPushResult } from './pushNotificationsCore';
import { sendPushNotification, type SendPushResult } from './pushNotificationsCore';

export type { SendPushResult, RegisterForPushResult } from './pushNotificationsCore';
export { sendPushNotification };

const DEVICE_PUSH_TOKEN_KEY = 'devicePushToken';

export async function registerForPush(): Promise<RegisterForPushResult> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    console.log('[push] registerForPush permission (existing)', existing);
    if (existing !== 'granted') {
      const { status: requested } = await Notifications.requestPermissionsAsync();
      status = requested;
      console.log('[push] registerForPush permission (requested)', requested);
    }
    if (status !== 'granted') {
      console.warn('[push] registerForPush permission not granted', status);
      return { ok: false, error: `Permission not granted: ${status}` };
    }
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData?.data;
    console.log('[push] registerForPush token received', !!token, token ? `${token.slice(0, 30)}...` : null);
    if (!token) return { ok: false, error: 'No push token from device' };
    await ensureConfigured();
    const c = getDataClient();
    if (!c) {
      console.warn('[push] registerForPush no data client');
      return { ok: false, error: 'Backend not configured' };
    }
    const { data: tokenRecord } = await c.models.AppStorage.get({
      key: DEVICE_PUSH_TOKEN_KEY,
    });
    if (tokenRecord) {
      const { errors } = await c.models.AppStorage.update({
        key: DEVICE_PUSH_TOKEN_KEY,
        value: token,
      });
      if (errors?.length) {
        console.error('[push] registerForPush update failed', errors);
        const msg = errors.map((e) => e.message).join(', ');
        return { ok: false, error: msg };
      }
      console.log('[push] registerForPush token updated in AppStorage');
    } else {
      const { errors } = await c.models.AppStorage.create({
        key: DEVICE_PUSH_TOKEN_KEY,
        value: token,
      });
      if (errors?.length) {
        console.error('[push] registerForPush create failed', errors);
        const msg = errors.map((e) => e.message).join(', ');
        return { ok: false, error: msg };
      }
      console.log('[push] registerForPush token saved to AppStorage');
    }
    return { ok: true };
  } catch (e) {
    console.error('[push] registerForPush error', e);
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
