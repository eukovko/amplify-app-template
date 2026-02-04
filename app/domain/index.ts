/**
 * Shared business logic and optional Amplify helpers.
 * Add your domain types, API clients, and storage adapters here.
 */
export const APP_NAME = 'Amplify App';
export { Counter } from './counter';
export {
  getCounter,
  setCounter,
  incrementCounter,
  decrementCounter,
  subscribeToCounter,
  sendPushNotification,
  registerForPush,
} from 'app-shared';
