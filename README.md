# TranspiraFund Mobile

Bare React Native (Android-only) client for the TranspiraFund LGU project-monitoring system. Companion app to the TranspiraFund web application; shares the `transpirafund-webapp` Firebase project.

## Stack

- React Native 0.84 (bare workflow — not Expo)
- Firebase v12 (Auth, Firestore, Storage, Cloud Functions)
- React Navigation v7

## Prerequisites

- Node 20+
- JDK 17 (Microsoft Build of OpenJDK)
- Android SDK (via Android Studio) with NDK 27.1+
- An Android emulator or physical device for testing

## Setup

```bash
npm install
```

## Run (development)

```bash
npm start            # Metro bundler in one terminal
npm run android      # Build + install debug APK to a connected device/emulator
```

## Build (release APK)

```bash
cd android
./gradlew assembleRelease
```

The release APK is signed with the keystore referenced by `TRANSPIRAFUND_RELEASE_STORE_FILE` (and related Gradle properties); without those properties the release build falls back to the debug keystore.

## Cloud Functions

This repo deploys its own mobile-codebase Cloud Functions from `functions/`. To deploy:

```bash
cd functions
npm install
npm run build
firebase deploy --only functions:mobile
```

`firestore.rules` is also deployed from this repo (`firebase deploy --only firestore:rules`). Storage rules are owned by the web repo — do not add a `storage` block to this repo's `firebase.json`.
