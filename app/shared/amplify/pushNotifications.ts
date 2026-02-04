export type { SendPushResult, RegisterForPushResult } from './pushNotificationsCore';
export { sendPushNotification } from './pushNotificationsCore';

export async function registerForPush(): Promise<import('./pushNotificationsCore').RegisterForPushResult> {
  return { ok: true };
}
