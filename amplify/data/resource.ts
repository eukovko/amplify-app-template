import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Placeholder: a
    .model({
      id: a.id(),
    })
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
  },
});
