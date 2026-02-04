export const TEMPLATE_VERSION = '1.0';
export { useCounter } from './useCounter';
export {
  getCounter,
  setCounter,
  incrementCounter,
  decrementCounter,
  subscribeToCounter,
} from './amplify/counterStore';
export {
  sendPushNotification,
  registerForPush,
} from './amplify/pushNotifications';
export type { SendPushResult, RegisterForPushResult } from './amplify/pushNotifications';