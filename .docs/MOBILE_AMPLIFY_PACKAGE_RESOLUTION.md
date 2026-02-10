# Mobile app: Amplify package resolution in the monorepo

This doc explains the "Unable to resolve @react-native-community/netinfo" error when running the Expo/React Native app and how we fixed it.

---

## The error

When bundling the Android app you may see:

```
Android Bundling failed ... app/mobile/index.tsx
Unable to resolve "@react-native-community/netinfo" from "node_modules/@aws-amplify/api-graphql/dist/cjs/utils/ReachabilityMonitor/index.native.js"
```

Expo config can also fail with:

```
Could not parse Expo config: android.googleServicesFile: "./google-services.json"
```

---

## Why it happens

### netinfo

- **aws-amplify** (used by **app-shared** for the Data client) depends on **@react-native-community/netinfo** on React Native. The Amplify package uses it in `ReachabilityMonitor` for network detection.
- In a **monorepo with npm workspaces**, dependencies are often **hoisted** to the repo root `node_modules`. The mobile app lives in `app/mobile/` and declares `app-shared` (and optionally `@react-native-community/netinfo`) in its own `package.json`.
- **Metro** (the React Native bundler) runs in the context of `app/mobile/`. When it resolves `require("@react-native-community/netinfo")` from a file inside `node_modules/@aws-amplify/...`, it looks for the package in the usual resolution order. If Metro is configured to look only at the repo root `node_modules`, or if netinfo was installed only under `app/mobile/node_modules` (or not hoisted as expected), the resolver can **fail to find** `@react-native-community/netinfo` and throw "Unable to resolve".

So the issue is **where Metro looks for packages** and **where the package actually is** in a workspace layout.

## What we did to fix it

We use **hoisting**: put shared/native dependencies in the **repo root** and tell Metro to **automatically** look in the root `node_modules` when resolving any package. No per-package mapping is needed.

### 1. Install Amplify React Native deps at the repo root

We added **@react-native-community/netinfo**, **@aws-amplify/react-native**, and **react-native-get-random-values** to the **root** `package.json` (same level as `aws-amplify`). Auth (Cognito) on React Native requires `@aws-amplify/react-native` for secure storage; without it you get "The package '@aws-amplify/react-native' doesn't seem to be linked".

```json
"dependencies": {
  "@aws-amplify/react-native": "^1.2.0",
  "@react-native-community/netinfo": "11.4.1",
  "aws-amplify": "^6.16.0",
  "react-native-get-random-values": "^1.11.0"
}
```

- **@aws-amplify/react-native** – native secure storage; must be present and the app must run in a **development build** (see below), not Expo Go.
- **react-native-get-random-values** – polyfill required by Amplify/crypto; import it **first** in the app entry (e.g. first line of `app/mobile/index.tsx`: `import 'react-native-get-random-values';`).

Running `npm install` from the repo root installs these in **repo root** `node_modules/`, so they live in one place for the whole monorepo.

### 2. Make Metro look at the root node_modules automatically (nodeModulesPaths)

In **app/mobile/metro.config.js** we set:

```js
const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '../..');

config.resolver.nodeModulesPaths = [
  path.join(projectRoot, 'node_modules'),
  path.join(repoRoot, 'node_modules'),
];
```

Metro then **resolves every module** by looking in both the mobile app’s `node_modules` and the **repo root** `node_modules`. So any package installed at the root (netinfo, aws-amplify, etc.) is found automatically—no `extraNodeModules` or per-package paths needed. This is the standard way to “hoist” and use root modules in a monorepo with Metro.

### 3. Make google-services.json optional

We removed **googleServicesFile** from **app/mobile/app.json** so the app runs without a Firebase config file. If you need Android push (FCM) later, add a real `google-services.json` in `app/mobile/` and set:

```json
"android": {
  ...
  "googleServicesFile": "./google-services.json"
}
```

See **.docs/AMPLIFY_SHARED_CONFIG.md** for the full FCM setup.

### 4. Android: REACT_NATIVE_NODE_MODULES_DIR (monorepo)

When building Android in a monorepo, `@react-native-community/netinfo`’s Gradle script looks for `react-native` in `../node_modules/react-native` relative to the android folder; with workspaces, `react-native` is at the **repo root** `node_modules`, so the build fails with:

`[react-native-netinfo] Unable to resolve react-native location in node_modules. You should add project extension property (in app/build.gradle) REACT_NATIVE_NODE_MODULES_DIR with path to react-native.`

**Fix:** An Expo config plugin injects `ext.REACT_NATIVE_NODE_MODULES_DIR` into the root `android/build.gradle` so it points at the repo root `node_modules/react-native`. The plugin lives in **app/mobile/plugins/withMonorepoReactNative.js** and is referenced in **app/mobile/app.config.js**. After adding it, run **`npm run mobile:prebuild:clean`** so the generated `android/build.gradle` includes the line, then **`npm run mobile:android`**.

### 5. Use a development build (required for Auth)

Amplify v6 Auth on React Native uses **@aws-amplify/react-native**, which includes **native code**. Expo Go does not include this module, so you get "The package '@aws-amplify/react-native' doesn't seem to be linked" if you run with Expo Go.

**You must not use Expo Go for sign-in/sign-up.** Use a development build and open the app that gets installed on the device/emulator (the one built by `expo run:android` / `expo run:ios`), not the standalone Expo Go app.

**Exact steps to fix "doesn't seem to be linked":**

1. **Dependencies** – `@aws-amplify/react-native` and `react-native-get-random-values` must be in **app/mobile/package.json** (so Expo prebuild links them). They can also be in the root `package.json` for the monorepo.
2. **Entry point** – First line of **app/mobile/index.tsx** must be: `import 'react-native-get-random-values';`
3. **Install** – From repo root: `npm install`
4. **Regenerate native projects** – From repo root: `npm run mobile:prebuild:clean` (or from `app/mobile`: `npx expo prebuild --clean`). This (re)creates the `android/` and `ios/` folders and links native modules. If you had run the app before adding the package, the old native project did not include it; prebuild --clean fixes that.
5. **Build and run** – From repo root: `npm run mobile:android` or `npm run mobile:ios`. This builds the app and installs it on the connected device/emulator.
6. **Open the right app** – Use the **development build** that was just installed (e.g. "amplify-template-app" or your app name on the home screen). Do **not** run `expo start` and then scan the QR code with Expo Go; that will still show the "doesn't seem to be linked" error.

---

## Summary

| Problem | Cause | Fix |
|--------|--------|-----|
| **Unable to resolve react-native** (Android Gradle: netinfo) | In a monorepo, netinfo’s build.gradle can’t find `react-native` (hoisted to repo root). | Add Expo config plugin in `app/mobile/plugins/withMonorepoReactNative.js` that sets `REACT_NATIVE_NODE_MODULES_DIR` in root `android/build.gradle`; register in `app.config.js`. Run `mobile:prebuild:clean` then `mobile:android`. |
| Unable to resolve **@react-native-community/netinfo** (Metro) | Metro couldn’t find the package when resolving from `node_modules/@aws-amplify/...` in the monorepo. | Add netinfo to **root** `package.json` and set **nodeModulesPaths** in `app/mobile/metro.config.js` so Metro checks the root `node_modules` for all packages. Run `npm install` from repo root. |
| **@aws-amplify/react-native doesn't seem to be linked** | Package not installed, app run in Expo Go, or native project built before the package was added. | Add both packages to **app/mobile/package.json**; add `import 'react-native-get-random-values';` first in `app/mobile/index.tsx`. Run `npm install`, then **`npm run mobile:prebuild:clean`**, then **`npm run mobile:android`** (or ios). Use the installed dev build app, not Expo Go. |
| **googleServicesFile** parse error | `app.json` referenced a file that didn’t exist. | Remove `googleServicesFile` until you add a real `google-services.json` for FCM. |

After these changes, from the **repo root** run:

```bash
npm install
npm run mobile:start -- --clear
```

The mobile app should bundle and run without the netinfo resolution error.
