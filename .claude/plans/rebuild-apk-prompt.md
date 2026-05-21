# Rebuild TranspiraFund Mobile Release APK

You are working in `c:\Users\marya\Desktop\TranspiraFund_caps`, a bare React Native (Android-only) project on the `master` branch. All recent cleanup, security, and codification commits are already pushed to GitHub and reflected in the local working tree.

**Goal:** produce a fresh signed release APK reflecting the current source so it can be uploaded to Firebase App Distribution.

## Environment notes (do not skip)

- Shell is bash (Git Bash on Windows). Use forward-slash paths in command lines.
- The system `JAVA_HOME` env var is stale on this machine — it points at `C:\Program Files\Microsoft\jdk-17.0.18.7-hotspot` but the actual installed JDK is `jdk-17.0.18.8-hotspot`. **Do not modify the system env var.** Instead, override it per-command:
  ```
  JAVA_HOME="/c/Program Files/Microsoft/jdk-17.0.18.8-hotspot"
  ```
  If that directory doesn't exist on this machine, run `ls "/c/Program Files/Microsoft/"` and use whichever `jdk-17.*-hotspot` directory is present.
- Release signing uses Gradle properties:
  - `TRANSPIRAFUND_RELEASE_STORE_FILE`
  - `TRANSPIRAFUND_RELEASE_STORE_PASSWORD`
  - `TRANSPIRAFUND_RELEASE_KEY_ALIAS`
  - `TRANSPIRAFUND_RELEASE_KEY_PASSWORD`

  These typically live in `%USERPROFILE%\.gradle\gradle.properties`. If they're not set, the release build automatically falls back to the debug keystore (see `android/app/build.gradle:46`). Either is acceptable for a Firebase App Distribution build — just note which signing was used in your final report.

## Pre-flight

1. `pwd` should show `/c/Users/marya/Desktop/TranspiraFund_caps`. If not, `cd` there.
2. `git status -s` should be empty. If anything is uncommitted, stop and report — do not build a dirty tree.
3. `git rev-parse --short HEAD` should be at or after `8b45b79` (the "Codify Firestore indexes" commit). Confirm by running `git log --oneline -3`.
4. Run `npm install` once. Expected output: "up to date" or a small package count. If it errors out, stop and report.

## Build steps — run in order, stop on first failure

### Step 1 — Clean previous build artifacts

```bash
JAVA_HOME="/c/Program Files/Microsoft/jdk-17.0.18.8-hotspot" \
  /c/Users/marya/Desktop/TranspiraFund_caps/android/gradlew \
  -p /c/Users/marya/Desktop/TranspiraFund_caps/android \
  clean
```

Expected: `BUILD SUCCESSFUL` after ~30–60 seconds. This clears `android/app/build/`, `.cxx/`, autolinking artifacts, and CMake caches.

### Step 2 — Build the release APK

```bash
JAVA_HOME="/c/Program Files/Microsoft/jdk-17.0.18.8-hotspot" \
  /c/Users/marya/Desktop/TranspiraFund_caps/android/gradlew \
  -p /c/Users/marya/Desktop/TranspiraFund_caps/android \
  assembleRelease
```

Expected: `BUILD SUCCESSFUL` after **5–15 minutes on a cold build** (JS bundling, native code compilation for each ABI, ProGuard minify, signing). Subsequent rebuilds are faster.

This single command handles JS bundling internally — no manual `react-native bundle` step needed for RN 0.84.

### If Step 2 fails

- **"OutOfMemoryError" or daemon crash** — restart the daemon and retry: prepend `--no-daemon` to the gradlew command.
- **"Could not find tools.jar" / wrong JDK** — verify `ls "/c/Program Files/Microsoft/"` and adjust the `JAVA_HOME` override to the actual JDK 17 install path.
- **"Keystore was tampered with, or password was incorrect"** — the release-signing Gradle properties are set but wrong. Either fix them in `~/.gradle/gradle.properties` or temporarily unset them to fall back to debug signing.
- **"Execution failed for task ':app:processReleaseResources'"** — typically a transient gradle cache issue. Run `gradlew clean` again, then retry.
- Any other failure — stop, report the last 30 lines of output verbatim, do NOT try to "fix" source files.

### Step 3 — Verify the APK

```bash
ls -lh /c/Users/marya/Desktop/TranspiraFund_caps/android/app/build/outputs/apk/release/
```

Expected: a file named `TranspiraFund.apk` of roughly **30–80 MB**.

```bash
grep -E "versionCode|versionName" /c/Users/marya/Desktop/TranspiraFund_caps/android/app/build.gradle
```

Report `versionCode` and `versionName`.

### Step 4 — Final report

Print:
- ✅ Full absolute path to the APK
- ✅ APK size (MB)
- ✅ `versionCode` and `versionName` from `build.gradle`
- ✅ Whether the build used release signing or fell back to debug signing — you can tell from the build output ("Using release keystore" vs. similar)
- ✅ The git commit SHA the build came from (`git rev-parse --short HEAD`)

Example final message:

> APK built successfully.
> Path: `c:\Users\marya\Desktop\TranspiraFund_caps\android\app\build\outputs\apk\release\TranspiraFund.apk`
> Size: 52 MB
> versionCode: 2 / versionName: 1.1
> Signing: release keystore
> Built from commit: 8b45b79
>
> Ready to upload to Firebase App Distribution.

## What you must NOT do

- ❌ Do NOT modify any source files in `src/`, `android/app/src/`, or anywhere else.
- ❌ Do NOT run `git commit` or `git push`.
- ❌ Do NOT run `firebase deploy` anything.
- ❌ Do NOT upload the APK to Firebase App Distribution — that's a separate user-driven action.
- ❌ Do NOT install the APK on a connected device automatically.
- ❌ Do NOT run `gradlew installRelease`.
- ❌ Do NOT bump versionCode / versionName in `build.gradle`. If a version bump is needed before upload, the user will request it explicitly.

## Done condition

You're done when Step 4's final report is delivered with all five fields filled in, and the working tree is still clean (`git status -s` returns empty).
