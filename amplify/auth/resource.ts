import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource.
 * Creates Cognito User Pool and Identity Pool (guest access enabled by default).
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});
