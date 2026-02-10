# Amplify config in shared (guide)

How we moved Amplify configuration into the shared layer so `amplify_outputs.json` lives only at repo root and is handled transparently by the bundler. Use this as a checklist for new apps or when redoing the setup.

---

## What we did right

1. **Single source of config** – `amplify_outputs.json` exists only at **repo root**. No copy in `app/web/public/` or per-app folders. Generated once (e.g. `npx ampx sandbox`) and used by all apps.

2. **Config lives in shared** – All Amplify-specific code (adapter + store) lives in **app/shared/amplify/**. Web and mobile only depend on `app-shared`; they never call `Amplify.configure()` or fetch config.

3. **Static import of config** – The adapter uses a top-level `import outputs from '../../../amplify_outputs.json'`. The bundler (Vite/Metro) resolves it at build time and inlines the JSON. No runtime fetch, no dynamic path.

4. **Configure once on first use** – The adapter configures Amplify the first time the store is used (`Amplify.configure(outputs)` + create client), guarded by a `configured` flag. No app-level bootstrap.

5. **Vite alias for web** – Because the web app builds from `app/web` and resolves `app-shared` via a symlink, the path `../../../amplify_outputs.json` from the adapter would otherwise resolve under `app/web`. We added a **resolve alias** in `app/web/vite.config.ts` so that specifier points to the repo-root file. Same setup works for dev and production build.

6. **Schema type from repo** – The adapter imports `Schema` from `../../../amplify/data/resource` (repo root). TypeScript and the bundler resolve it from the file's real location when building. No need to duplicate types.

7. **Domain re-exports, shared owns implementation** – `app-domain` re-exports the store API from `app-shared` so existing `app-domain` consumers keep working. Implementation and config live only in shared.

8. **No web-specific Amplify bootstrap** – We removed `loadAndConfigureAmplify()` and any fetch of `/amplify_outputs.json` from the web app. Entry point just renders the app; first use of the store triggers configuration.

9. **Real-time sync (AppSync subscriptions)** – The counter store uses Amplify Data's `observeQuery` so changes on one device (web or mobile) are reflected on others. Subscriptions are set up in **app/shared/amplify/counterStore.ts** via `subscribeToCounter`; `useCounter()` subscribes and updates state so views rerender automatically. No subscription or Amplify code in web/mobile apps.

10. **Push notifications (web → mobile)** – Send and register are implemented in **app/shared/amplify/pushNotifications.ts** (`sendPushNotification`, `registerForPush`). The backend exposes a custom query `sendPush` backed by a Lambda that reads the device token from AppStorage and sends via the Expo Push API. Web and mobile use only the shared API; they do not reference the notification service or Amplify.

    **Why Lambda + Expo (not a dedicated AWS notification service)?** The app uses **Expo push tokens** (`ExponentPushToken[...]`). Those are only accepted by Expo's Push API, which then forwards to FCM/APNs. AWS services that send mobile push (e.g. **Amazon SNS**) expect **native FCM/APNs device tokens** (or SNS platform endpoint ARNs). To use SNS you'd register FCM/APNs tokens with SNS in the mobile app and have Lambda (or another backend) call `SNS.publish` to a topic or endpoint. That requires different mobile setup (native tokens, possibly `expo-device`/native modules) and no Expo Push in the middle. For an Expo-based app, Lambda + Expo Push API is the straightforward option; switch to SNS (or AWS End User Messaging) if you move off Expo tokens and manage FCM/APNs directly.

    **Android push (FCM):** Firebase is not used as a backend here; Amplify is. On Android, **Expo's push implementation uses Firebase Cloud Messaging (FCM)** to obtain device tokens, so the Android app must include a **google-services.json** from the [Firebase Console](https://console.firebase.google.com) (create a project, add an Android app with package `com.example.app`, download the config file) and place it in **app/mobile/** as `google-services.json`. The app is already configured with `expo.android.googleServicesFile: "./google-services.json"`. For sending pushes from the backend you also need a [Google Service Account Key (FCM V1)](https://docs.expo.dev/push-notifications/fcm-credentials/) uploaded to EAS (or used by your send pipeline).

---

## Guide: set this up in a new project (or redo it)

### 0. Deploy the backend

After changing the data schema (e.g. adding a model in `amplify/data/resource.ts`), deploy so the API and tables exist:

- **Sandbox (dev):** From repo root run `npm run sandbox` (or `npx ampx sandbox`). This deploys the backend and writes `amplify_outputs.json` at repo root. Keep it running for live backend, or run once and use the generated config.
- **Production:** Use your CI/CD or `ampx pipeline-deploy` / Amplify Hosting as needed.

### 1. Layout

- **Repo root**: `amplify_outputs.json` (generated by Amplify CLI/sandbox). Do not commit if it contains env-specific values; add to `.gitignore` or use a safe pattern.
- **Shared package**: e.g. `app/shared/` with an `amplify/` folder for adapter and any Amplify-backed stores.

### 2. Adapter in shared

Create an adapter (e.g. `app/shared/amplify/amplifyStorageAdapter.ts`) that:

- Imports the Amplify schema type from repo root:
  - `import type { Schema } from '../../../amplify/data/resource'`
  - (Adjust `../../../` if your shared package is not at `app/shared/amplify/`.)
- Imports config with a **static** import:
  - `import outputs from '../../../amplify_outputs.json'`
- Configures Amplify once on first use and creates the Data client:
  - Guard with a `configured` (or similar) flag.
  - Call `Amplify.configure(outputs)` then `generateClient<Schema>()`.
- Exposes:
  - A way to ensure config has run (e.g. `ensureConfigured()` sync or async that calls the one-time configure).
  - A way to get the client (e.g. `getDataClient()`).

Do **not** use a variable in the import path; use the literal path so the bundler can resolve and apply aliases.

### 3. Path from shared to repo root

From `app/shared/amplify/`:

- One level up: `app/shared/`
- Two levels up: `app/`
- Three levels up: repo root

So repo root paths are `../../../` (e.g. `../../../amplify_outputs.json`, `../../../amplify/data/resource`). Adjust if your structure is different (e.g. `app/shared/foo/amplify/` → `../../../../`).

### 4. Web app (Vite)

- **Alias** – In `app/web/vite.config.ts`, add a `resolve.alias` so the adapter's import resolves to the real file when the adapter is resolved via the workspace/symlink:

  ```ts
  import path from 'path'
  import { fileURLToPath } from 'url'

  const __dirname = path.dirname(fileURLToPath(import.meta.url))

  export default defineConfig({
    // ...
    resolve: {
      alias: {
        '../../../amplify_outputs.json': path.resolve(__dirname, '../../amplify_outputs.json'),
      },
    },
  })
  ```

  Adjust `__dirname` and the right-hand path if your web app is not at `app/web/`.

- **No Amplify bootstrap** – Do not fetch `/amplify_outputs.json` or call `Amplify.configure()` in the web entry. Let the shared adapter configure on first use.

### 5. Mobile app (Metro)

- In a workspace, the shared package is resolved from `node_modules/app-shared`, so the adapter's `../../../amplify_outputs.json` resolves under `node_modules` and fails. Add `app/mobile/metro.config.js` with `resolver.resolveRequest` so that specifier (and `../../../amplify/data/resource`) point to the repo root, and set `watchFolders` to the repo root so Metro can read those files:

  ```js
  const path = require('path');
  const { getDefaultConfig } = require('expo/metro-config');

  const projectRoot = __dirname;
  const repoRoot = path.resolve(projectRoot, '../..');

  const config = getDefaultConfig(projectRoot);
  config.watchFolders = [repoRoot];

  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === '../../../amplify_outputs.json') {
      return { type: 'sourceFile', filePath: path.join(repoRoot, 'amplify_outputs.json') };
    }
    if (moduleName === '../../../amplify/data/resource') {
      return { type: 'sourceFile', filePath: path.join(repoRoot, 'amplify/data/resource.ts') };
    }
    return context.resolveRequest(context, moduleName, platform);
  };

  module.exports = config;
  ```

### 6. Dependencies

- The **shared** package that contains the adapter needs `aws-amplify` in `dependencies`.
- The shared package does not need a dependency on the Amplify backend package; it only needs the **type** import from `amplify/data/resource`, which is resolved by the bundler/TypeScript from the repo.

### 7. Checklist

- [ ] `amplify_outputs.json` only at repo root (or path used in alias).
- [ ] Adapter in shared with static `import outputs from '...'` and `Amplify.configure(outputs)` on first use.
- [ ] Schema type imported from repo-root `amplify/data/resource`.
- [ ] Web: Vite alias for `../../../amplify_outputs.json` (or your path) to repo-root file.
- [ ] Web: No `loadAndConfigureAmplify()` or fetch of config in entry.
- [ ] Mobile: Metro `resolver.resolveRequest` + `watchFolders` so adapter imports resolve to repo root.
- [ ] Build and dev both work (web: `npm run web:build` and `npm run web:dev`).

---

## Push (Android) – Firebase / FCM

Per the [Expo FCM credentials guide](https://docs.expo.dev/push-notifications/fcm-credentials/), Android push needs Firebase only because Expo uses FCM for device tokens. Do the following once:

### Automated setup (scripts)

From repo root you can run each step separately or run all in one go.

**Prerequisites**

- Firebase CLI installed and logged in: `npx firebase login`
- A Firebase project directory in the repo (the repo includes a minimal `firebase.json` so that `firebase use` and app commands work)

**Steps (run independently)**

1. Create project and set it active:
   ```bash
   npm run fcm-create-project -- --project-id YOUR_PROJECT_ID [--display-name "App Name"]
   ```
2. Register the Android app (package from `app/mobile/app.json`). Prints the Android **App ID** at the end:
   ```bash
   npm run fcm-register-android -- --project-id YOUR_PROJECT_ID [--display-name "App Name"]
   ```
3. Download **google-services.json** into **app/mobile/**:
   ```bash
   npm run fcm-download-config -- --project-id YOUR_PROJECT_ID --app-id ANDROID_APP_ID
   ```
   Use the App ID printed by step 2.

**All-in-one**

```bash
npm run setup-fcm -- --project-id YOUR_PROJECT_ID [--display-name "App Name"]
```

### Manual setup

1. **Firebase project** – In [Firebase Console](https://console.firebase.google.com) create a project (or use an existing one).
2. **Android app in Firebase** – In that project add an Android app with package name **`com.example.app`** (must match `app.json`). Download **google-services.json**.
3. **Place the file** – Put `google-services.json` in **app/mobile/** (next to `app.json`).
4. **Regenerate native project** – From repo root or `app/mobile` run:
   ```bash
   cd app/mobile && npx expo prebuild --clean
   ```
   This copies `google-services.json` into `android/app/` and applies the Google Services plugin. Then run:
   ```bash
   npx expo run:android
   ```
5. **Sending pushes (optional)** – To have the backend send to Android devices via Expo Push API, add a [Google Service Account Key (FCM V1)](https://docs.expo.dev/push-notifications/fcm-credentials/) (e.g. via `eas credentials` or your send pipeline).

The root and app Gradle files already include the Google Services classpath and plugin; prebuild ensures the JSON is in place.

---

## Troubleshooting

- **"Amplify has not been configured"** – Usually the config import is not resolved (e.g. in dev the path resolves under the app dir). Add or fix the Vite/Metro alias so the adapter's import points to the repo-root `amplify_outputs.json`.
- **Build can't find `amplify/data/resource`** – Ensure the path from the adapter to repo root has the correct number of `../` (e.g. `app/shared/amplify/` → `../../../amplify/data/resource`). If the shared package is built from another workspace, that workspace may need to see the amplify folder (e.g. same repo).
- **JSON import type errors** – Enable `resolveJsonModule` in the TypeScript config that compiles the shared package.
- **EAS Build: "Failed to get the SHA-1 for .../amplify_outputs.json"** – `amplify_outputs.json` is gitignored, so it is not in the EAS checkout. Metro is configured to fall back to `app/mobile/amplify_outputs.stub.json` when the repo-root file is missing, so the bundle succeeds. The app will use the stub (no real backend) unless you provide the real config: e.g. store it in an EAS Secret and write it to the repo root in an `eas build` pre-install or pre-build hook.
