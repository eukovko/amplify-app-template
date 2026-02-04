import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { sendPush } from '../functions/send-push/resource';

const schema = a
  .schema({
    AppStorage: a
      .model({
        key: a.string().required(),
        value: a.string().required(),
      })
      .identifier(['key'])
      .authorization((allow) => [allow.guest()]),
    sendPush: a
      .query()
      .arguments({ message: a.string() })
      .returns(a.string())
      .authorization((allow) => [allow.guest()])
      .handler(a.handler.function(sendPush)),
  })
  .authorization((allow) => [allow.resource(sendPush).to(['query'])]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
  },
});
