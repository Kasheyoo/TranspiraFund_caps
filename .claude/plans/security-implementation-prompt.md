# TranspiraFund Mobile — Security Hardening Implementation

You are working in `c:\Users\marya\Desktop\TranspiraFund_caps`, a bare React Native (Android-only) client for an LGU project-monitoring system. The app uses Firebase v12 (Auth, Firestore, Storage, Cloud Functions) and React Navigation v7. It is shared with a web app via the same Firebase project (`transpirafund-webapp`) using multi-codebase Cloud Functions; this repo deploys the `mobile` codebase plus `firestore.rules`. The active branch is `master`.

## Architecture invariants — do NOT change

- Auth flow: `onIdTokenChanged` in `src/context/AuthContext.tsx` forces `signOut()` on every cold start (line ~144). Sessions are never persisted across app launches. Do not introduce session persistence.
- Custom claims: tenant scoping reads `tenantId` and `role` from the Firebase ID token. Login is a hard gate — `role === "PROJ_ENG" && tenantId != null`.
- Multi-tenant isolation: every Firestore query MUST carry `where("tenantId", "==", tid)`. Do not weaken this.
- Force-password-change for first-time users (`mustChangePassword === true`) runs after login + OTP, before main app.
- `FLAG_SECURE` is set in `MainActivity.kt:onCreate` to block screenshots — keep it.
- Cloud Functions live in `functions/src/index.ts` under `"codebase": "mobile"`.
- The mobile app calls some web-codebase functions (`sendOtp`, `verifyOtp`) — leave those alone.

## Commit convention

- Subject: 2–4 words, no full sentences, no body unless I ask.
- Trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- Pre-existing commit style examples: `Multi-tenant Firestore`, `Drop dead fetch path`.
- Never `git push --force` to master without my explicit approval.

## Pre-flight

Before each phase: `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` must exit 0. After each phase: same check + briefly summarize what changed and stop. Wait for me to test on device before the next phase.

---

# Phase 1 — Mobile-only hardening (8 steps, 8 commits)

## 1.1 — In-app messaging system + migrate all native dialogs

**Goal:** zero `Alert.alert` and zero `ToastAndroid` calls in `src/`. All security messages flow through in-app components.

### Build the primitive

Create `src/components/SecurityNoticeOverlay.tsx` exporting:
```ts
interface SecurityNoticeOverlayProps {
  visible: boolean;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  countdownSeconds?: number;
  onCountdownExpire?: () => void;
}
```
Visual: full-screen modal, teal-card backdrop with soft shadow, FontAwesome5 icon by severity (`info-circle` info / `clock` warning / `lock` critical), color from `COLORS.primary` / `COLORS.warning` / `COLORS.error`. When `countdownSeconds` is provided, render a live mm:ss countdown that calls `onCountdownExpire` when it hits 0. Match the styling tokens from `src/components/ConfirmModal.tsx` so it fits the existing visual language.

### Migrate every native dialog

Replace every `Alert.alert` call in `src/` per the table below. Remove the `Alert` import once unused.

| File:Line | Replacement component | Notes |
|---|---|---|
| `src/context/AuthContext.tsx:~105` "Session Expired" | `SecurityNoticeOverlay severity="critical"` single button "Sign in again" → routes to login | Lift overlay state into AuthContext, render inside the provider tree |
| `src/context/AuthContext.tsx:~111` "Session Warning" | `SecurityNoticeOverlay severity="warning"` `countdownSeconds={300}` two buttons "Continue" / "Sign out now" | Continue calls `resetActivity`, Sign out calls `signOut(auth)` |
| `src/context/AuthContext.tsx:~183` "Account Misconfigured" | `SecurityNoticeOverlay severity="critical"` single button "OK" → triggers signOut | |
| `src/hooks/useProjectDetailsPresenter.ts:~206` Camera permission | `ConfirmModal warning` "Open Settings" / "Cancel" — primary calls `Linking.openSettings()` | Lift modal state into presenter |
| `src/hooks/useProjectDetailsPresenter.ts:~216` Location permission | `ConfirmModal warning` same as above | |
| `src/hooks/useProjectDetailsPresenter.ts:~233` GPS preflight (denied/disabled/timeout/unavailable) | `ConfirmModal warning` per-reason: denied→"Open Settings", disabled→"Open Settings", timeout/unavailable→"Try Again" | |
| `src/hooks/useProjectDetailsPresenter.ts:~256` Camera Error | `ToastMessage error` | |
| `src/hooks/useProjectDetailsPresenter.ts:~265` No Photo | `ToastMessage error` | |
| `src/hooks/useProjectDetailsPresenter.ts:~274` Invalid File | `ToastMessage error` | |
| `src/hooks/useProjectDetailsPresenter.ts:~280` File Too Large | `ToastMessage error` | |
| `src/hooks/useProjectDetailsPresenter.ts:~286` Capture Error | `ToastMessage error` | |
| `src/hooks/useProjectDetailsPresenter.ts:~365` Failed to confirm milestone | `ToastMessage error` | |
| `src/hooks/useProjectDetailsPresenter.ts:~398` Failed to confirm milestones | `ToastMessage error` | |
| `src/hooks/useProjectDetailsPresenter.ts:~407` Confirm First | `ToastMessage info` | |
| `src/hooks/useProjectDetailsPresenter.ts:~411` Proof Required | `ToastMessage info` | |
| `src/hooks/useProjectDetailsPresenter.ts:~431` Failed to mark completed | `ToastMessage error` | |
| `src/hooks/useProjectDetailsPresenter.ts:~444` Failed to remove phase | `ToastMessage error` | |
| `src/views/ProjectDetailsView.tsx:~135` Milestone Locked | `ToastMessage info` | Lift toast state into the view |
| `src/components/MilestoneGenerationModal.tsx:~132` AI generation error | inline error banner inside the existing modal — DO NOT stack a second modal | |

Toast state lifting pattern: each consumer keeps `const [toast, setToast] = useState<{type, message} | null>(null)` and renders `<ToastMessage visible={!!toast} {...toast} onHide={() => setToast(null)} />` at the screen root.

### Regression guard

Create `scripts/check-no-native-dialogs.sh`:
```bash
#!/usr/bin/env bash
hits=$(grep -rE "Alert\.alert|ToastAndroid\." --include="*.ts" --include="*.tsx" src 2>/dev/null)
if [ -n "$hits" ]; then
  echo "❌ Native dialog detected. Use SecurityNoticeOverlay / ConfirmModal / ToastMessage:"
  echo "$hits"
  exit 1
fi
echo "✅ No native dialogs in src/"
```
Add to `package.json` scripts: `"check:dialogs": "bash scripts/check-no-native-dialogs.sh"`. Run it once and verify it exits 0.

**Verify:** tsc clean. `npm run check:dialogs` exits 0. Commit `Add in-app notice`. Then second commit `Migrate native dialogs` if you want to split — otherwise one commit.

## 1.2 — Fix idle timeout (real touch tracking)

**Files:** `src/context/AuthContext.tsx`, `App.tsx`.

In `AuthContext`, expose `resetActivity` through the context value. In `App.tsx`, wrap the children of `<NavigationContainer>` (or the `AppNavigator`) in a `<View style={{flex:1}}>` with `onTouchStart` calling a throttled wrapper around `resetActivity()` (throttle to once per 5 seconds — use a `useRef<number>` to track last call time). Idle warning + logout now fire only when there are zero touches for 25 / 30 minutes respectively.

**Verify:** active scrolling for 31 minutes does not trigger logout. 26 minutes idle shows the `SecurityNoticeOverlay` warning from 1.1. 30 minutes idle triggers logout via the same overlay. Commit `Fix idle timeout`.

## 1.3 — Persist rate limiter

**Files:** `src/utils/security.ts`, `src/hooks/useLoginPresenter.ts`, `src/hooks/useProfilePresenter.ts`.

Convert `RateLimiter` to use AsyncStorage. Read/write entries under key `rate_limit:${key}` as JSON. Make `check()`, `recordAttempt()`, `reset()` return Promises. Update both presenters to `await` them.

**Verify:** trigger 5 failed logins, kill the app, relaunch, attempt login → still locked. Commit `Persist rate limiter`.

## 1.4 — Privacy overlay on background

**Files:** `src/components/PrivacyOverlay.tsx` (new), `src/navigation/AppNavigator.tsx`.

Create `PrivacyOverlay`: `position:absolute` full-screen, `zIndex:9999`, `backgroundColor:COLORS.primary`, centered logo (use the same logo asset as LandingView). In `AppNavigator`, add `useState<boolean>` for `appActive` and an `AppState` listener. Render `<PrivacyOverlay visible={!appActive} />` at the AppNavigator root, sibling to all other gates.

**Verify:** open app, press home, view recent-apps thumbnail — should show the teal logo overlay, not project content. Commit `Add privacy overlay`.

## 1.5 — Clear sensitive on background

**Files:** `src/views/LoginView.tsx`, `src/views/NewPasswordView.tsx`, `src/views/OTPVerificationView.tsx`, `src/views/ForgotPasswordView.tsx`. Possibly the corresponding presenters.

In each view (or its presenter), add an `AppState` listener that on `change` event !== "active" calls a clear method to wipe password / OTP / new-password input state.

**Verify:** type a password, background the app, return — field is empty. Commit `Clear sensitive on background`.

## 1.6 — Lock copy/paste on credential fields

**Files:** every view containing a password or OTP `<TextInput>` (`LoginView`, `NewPasswordView`, `OTPVerificationView`, `ForgotPasswordView`, plus any others discovered by grep).

Add `contextMenuHidden={true}` and `selectTextOnFocus={false}` to every password and OTP TextInput.

**Verify:** long-press on a password field shows no copy/paste menu. Commit `Lock credential fields`.

## 1.7 — ProGuard rules

**Files:** `android/app/proguard-rules.pro`.

Add the standard React Native release rules. Keep classes for: React Native core, Hermes, Reanimated, Worklets, vector-icons, image-picker, geolocation-service, async-storage, gesture-handler, screens, safe-area-context, pdf, every autolinked module. Confirm `minifyEnabled true` and `shrinkResources true` are set in the release build type in `android/app/build.gradle`. Build a release APK locally to verify nothing breaks: `cd android && ./gradlew assembleRelease`.

**Verify:** release APK installs, opens, login flow works, project list loads. Commit `Tighten ProGuard rules`.

## 1.8 — Audit-log security events

**Files:** `src/hooks/useLoginPresenter.ts`, `src/hooks/useProfilePresenter.ts`, `src/context/AuthContext.tsx`.

Use `callFn("logMobileAuditTrail", { action, success, details })` to log:
- Login failed (`{ action: "Login Failed", success: false, details: { reason: "invalid-credential" } }`)
- Account locked by client rate limiter (`{ action: "Account Locked", success: false }`)
- Password change success (`{ action: "Password Changed", success: true }`)
- Idle session expired (`{ action: "Session Expired (Idle)", success: false }`) — fire BEFORE `signOut()`
- Misconfigured account on login (`{ action: "Login Blocked - Misconfigured", success: false }`)

These calls are best-effort — wrap each in `.catch(() => {})` so failures don't break the user flow.

**Verify:** trigger each event, navigate to Audit Trail screen, see the entries. Commit `Log security events`.

---

# Phase 2 — Server-side hardening (4 steps, in `functions/`)

After Phase 1 is verified on device, deploy via `firebase deploy --only functions:mobile`.

## 2.1 — Cloud Function rate limit

**File:** `functions/src/index.ts`.

Write a helper `enforceRateLimit(uid: string, action: string, opts: { max: number; windowMs: number; lockoutMs: number }): Promise<void>` that reads/writes a `rateLimits/{uid}_{action}` Firestore doc with `{ attempts, windowStart, lockedUntil }`, throws `HttpsError("resource-exhausted", "...")` when locked, otherwise increments and proceeds.

Call from these onCalls with these limits:
- `sendPasswordResetOtp`: 5/min, 5-min lockout (key on email, not uid since unauthenticated)
- `verifyPasswordResetOtp`: 10/min, 5-min lockout (key on email)
- `resetPasswordWithOtp`: 5/min, 10-min lockout (key on email)
- `uploadProofPhoto`: 20/hr, 1-hr lockout
- `uploadProfilePhoto`: 5/hr, 1-hr lockout
- `generateMilestones`: 10/day, 24-hr lockout

Commit `Add CF rate limit`.

## 2.2 — Validate proof timing + GPS accuracy

**File:** `functions/src/index.ts`, `uploadProofPhoto` handler.

At the top of the handler, after the existing input validation:
- Reject with `HttpsError("invalid-argument", "GPS accuracy too low — move to a clearer area.")` if `accuracy > 50`.
- Reject with `HttpsError("invalid-argument", "Photo timestamp is in the future.")` if `capturedAt > Date.now() + 60_000` (60-second tolerance).
- Reject with `HttpsError("invalid-argument", "Photo is too old to upload.")` if `Date.now() - capturedAt > 15 * 60_000` (15-minute window).

Commit `Validate proof timing`.

## 2.3 — Idempotency on proof upload

**File:** `functions/src/index.ts`, `uploadProofPhoto` handler.

Compute `proofId = ${capturedAt}_${uid}` BEFORE Storage upload. After fetching the milestone doc, check `m.proofs?.find(p => p.id === proofId)`. If found, return the existing proof object with `idempotent: true`, skip Storage upload and skip the Firestore array update. If not found, proceed with the existing flow.

Commit `Add proof idempotency`.

## 2.4 — Tenant assertion on every onCall

**File:** `functions/src/index.ts`.

For each onCall that touches tenant-scoped data (`generateMilestones`, `deleteMilestone`, `markProjectOngoing`, `logMobileAuditTrail`, `uploadProfilePhoto`, `uploadProofPhoto`):
1. After `request.auth` check, also read `request.auth.token.tenantId`.
2. Read the target document's `tenantId` (from the project, milestone, or user doc).
3. If they don't match, throw `HttpsError("permission-denied", "Cross-tenant operation rejected.")`.
4. `completePasswordChange`, `sendPasswordResetOtp`, `verifyPasswordResetOtp`, `resetPasswordWithOtp` skip this check (they don't write to tenant data).

Commit `Assert tenant on writes`.

After all four commits, deploy: `cd functions && npm run build && firebase deploy --only functions:mobile`. Smoke test on device.

---

# Phase 3 — Device-lock gate (Biometric Model B, Placement B)

Single feature, single commit.

## 3.1 — Native module

**File:** `android/app/src/main/java/com/transpirafund/DeviceSecurityModule.kt` (new).

```kotlin
package com.transpirafund

import android.app.KeyguardManager
import android.content.Context
import com.facebook.react.bridge.*

class DeviceSecurityModule(reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {
  override fun getName() = "DeviceSecurity"

  @ReactMethod
  fun isDeviceSecure(promise: Promise) {
    try {
      val km = reactApplicationContext.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
      promise.resolve(km.isDeviceSecure)
    } catch (e: Exception) {
      promise.resolve(true) // fail-open on platform error
    }
  }
}
```

## 3.2 — Native package

**File:** `android/app/src/main/java/com/transpirafund/DeviceSecurityPackage.kt` (new).

```kotlin
package com.transpirafund

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class DeviceSecurityPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(DeviceSecurityModule(reactContext))
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
```

## 3.3 — MainApplication wiring

**File:** `android/app/src/main/java/com/transpirafund/MainApplication.kt`.

Inside `getPackages()` package list (the `.apply { ... }` block on `PackageList(this).packages`), add: `add(DeviceSecurityPackage())`.

## 3.4 — JS bridge

**File:** `src/utils/deviceSecurity.ts` (new).

```ts
import { NativeModules } from "react-native";

const { DeviceSecurity } = NativeModules;

export async function isDeviceSecure(): Promise<boolean> {
  try {
    return await DeviceSecurity.isDeviceSecure();
  } catch {
    return true; // fail-open: never lock out users due to a native-module bug
  }
}
```

## 3.5 — Block screen component

**File:** `src/components/DeviceLockRequiredScreen.tsx` (new).

Full-screen `<View>` with `flex:1`, `backgroundColor: COLORS.primary`, padding for safe area. FontAwesome5 `shield-alt` icon (size 64, white). Title "Set Up a Screen Lock". Body: "TranspiraFund requires a PIN, pattern, password, or fingerprint on your phone before continuing. Open Settings → Security to set one up, then tap Check Again." Primary button "Open Settings" calls `Linking.sendIntent("android.settings.SECURITY_SETTINGS")`. Secondary button "Check Again" calls a `onRecheck` callback prop. AppState listener inside the component that auto-rechecks when app returns to foreground (call `onRecheck` on `change → "active"`).

## 3.6 — AppNavigator integration (Placement B)

**File:** `src/navigation/AppNavigator.tsx`.

Add at the top of the component:
```tsx
const [deviceSecure, setDeviceSecure] = useState<boolean | null>(null);
const recheckDeviceSecurity = useCallback(() => {
  isDeviceSecure().then(setDeviceSecure);
}, []);

useEffect(() => {
  recheckDeviceSecurity();
  const sub = AppState.addEventListener("change", (s) => {
    if (s === "active") recheckDeviceSecurity();
  });
  return () => sub.remove();
}, [recheckDeviceSecurity]);
```

Insert the gate AFTER the `isFirstTimeUser` check and BEFORE `MainNavigator`:
```tsx
if (deviceSecure === null) return <Spinner />; // reuse existing loading view
if (deviceSecure === false) return <DeviceLockRequiredScreen onRecheck={recheckDeviceSecurity} />;
```

**Verify:** with a phone/emulator that has a PIN/biometric, login flow proceeds normally. With an unlocked emulator, after login + OTP + (force password change if first-time), see the block screen. Tap "Open Settings" → land in Android Security settings. Set a PIN, return → screen auto-dismisses.

Commit `Add device-lock gate`.

---

# Execution rules

1. Run phases in order: 1 → 2 → 3.
2. After every commit, run `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` and confirm exit 0.
3. After completing a phase, stop and summarize to me. Do not push without my explicit "push" command. Do not start the next phase until I confirm I tested on device.
4. Never bundle multiple steps into one commit unless I say so. Each numbered step gets its own commit so any single one can be reverted cleanly.
5. If a step's "Verify" fails, fix the underlying issue and retry — do not skip or paper over.
6. If you discover the codebase has changed in a way that breaks an assumption in this plan, stop and report it instead of guessing.

Begin with Phase 1.1.
