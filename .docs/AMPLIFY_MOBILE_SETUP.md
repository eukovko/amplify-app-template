# Amplify in the mobile app (React Native)

Setup and troubleshooting for using the shared Amplify layer (app-shared) in the React Native / Expo mobile app. Not specific to entities; applies whenever the mobile app depends on app-shared and thus aws-amplify.

---

## Metro and the monorepo

Dependencies are hoisted to the repo root, so **app/mobile/node_modules** is often empty. Metro runs with `projectRoot` = app/mobile and by default only resolves from that folder, so it cannot find **app-shared**, **app-domain**, or **aws-amplify**.

In **app/mobile/metro.config.js**, set:

```js
config.resolver.nodeModulesPaths = [path.join(repoRoot, 'node_modules')];
```

so Metro also looks in the repo root `node_modules`. Keep **watchFolders** including the repo root and the custom **resolveRequest** for `../../../amplify_outputs.json` and `../../../amplify/data/resource` (see **.docs/AMPLIFY_SHARED_CONFIG.md**).

---

## Amplify React Native peer dependencies

The mobile app must install the packages Amplify uses at runtime; they are not bundled inside **aws-amplify**. Add these to **app/mobile/package.json** `dependencies`:

- **@react-native-community/netinfo** – used by Amplify for network reachability (e.g. API/GraphQL layer). Without it you get: `Unable to resolve "@react-native-community/netinfo"` from ReachabilityMonitor.
- **@react-native-async-storage/async-storage** – used by Amplify as the default key-value storage (cache, session). Without it you get a runtime error: `Cannot find module '@react-native-async-storage/async-storage'`.

After adding these, run `npm install` from the repo root and restart Metro with `--clear` if needed.
