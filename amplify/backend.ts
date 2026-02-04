import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sendPush } from './functions/send-push/resource';

defineBackend({
  auth,
  data,
  sendPush,
});
