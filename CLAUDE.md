## Working Rules

- Plan-mode review before code execution. Stop at each phase boundary for
  approval. Phase 0 of any task is read-only.
- Never run `firebase deploy` in any form. Deploys are manual and scoped by
  function name. Never run an unscoped `firebase deploy --only functions`.
- Never run a Gradle build, assemble an APK, or install to a device. Builds are
  batched manually.
- Never git commit, push, stash, or switch branches.
- Never print, cat, echo, or copy the contents of .env files, keystore files,
  gradle.properties, or any credential file. Reference by path only.
- No new npm dependencies without approval during a plan phase.
- On any failure or ambiguity: capture, report, STOP. Do not improvise a
  workaround.
- Cite file:line for factual claims. Write "not found" rather than inferring.
- No em dashes in any output. Use commas, periods, or restructured sentences.

## Project Context

Bare React Native + TypeScript app for the DEPW-Assigned Project Engineer, part
of TranspiraFund, a capstone system for the Cebu City DEPW Construction Services
Division. Pairs with the React + Vite web dashboard (TranspiraFund-WebApp-LGU)
used by the Head of Construction Services Division. Shared Firebase project
transpirafund-webapp, region asia-southeast1.

Known open items:
- SME reference corpus entry idx 1 carries 21 milestones; confirmMilestonePlan
  rejects above 12. A fallback to that entry produces an unconfirmable plan.
- The type-to-pool index table at functions/src/index.ts:432-442 is
  hand-maintained; covered_court and day_care_center pools are empty.
- A missing ANTHROPIC_API_KEY degrades silently to SME fallback reported as
  success.

## Cloud Functions Ownership

Two Firebase Functions codebases deploy to the same Firebase project (`transpirafund-webapp`, region `asia-southeast1`):

- codebase `"mobile"` — this repo (`TranspiraFund_caps`), source `functions/src/index.ts`
- codebase `"default"` — `TranspiraFund-WebApp-LGU`, node 22, source `functions/src/index.js`

### Owned by this repo (codebase "mobile")

Scoped deploys from this repo REQUIRE the codebase segment. The form
`firebase deploy --only functions:NAME` fails with "No function matches given
--only filters" because the CLI resolves bare names against the default
codebase, which lives in the web repo. Correct form:

  firebase deploy --only functions:mobile:NAME1,functions:mobile:NAME2 --project transpirafund-webapp

Verified working 2026-08-02 for generateMilestones and confirmMilestonePlan.
Never use `firebase deploy --only functions:mobile` (whole codebase, unscoped).

| Function | Source |
|---|---|
| `generateMilestones` | `functions/src/index.ts:777` |
| `deleteMilestone` | `functions/src/index.ts:981` |
| `addManualMilestone` | `functions/src/index.ts:1037` |
| `confirmMilestonePlan` | `functions/src/index.ts:1195` |
| `validateMilestoneTitle` | `functions/src/index.ts:1494` |
| `markProjectOngoing` | `functions/src/index.ts:1580` |
| `completePasswordChange` | `functions/src/index.ts:1628` |
| `logMobileAuditTrail` | `functions/src/index.ts:1659` |
| `uploadProfilePhoto` | `functions/src/index.ts:1723` |
| `uploadProofPhoto` | `functions/src/index.ts:1807` |
| `sendPasswordResetOtp` | `functions/src/index.ts:1985` |
| `verifyPasswordResetOtp` | `functions/src/index.ts:2075` |
| `resetPasswordWithOtp` | `functions/src/index.ts:2142` |

### Owned by the web repo (codebase "default", `TranspiraFund-WebApp-LGU`)

Do not edit or deploy from this repo:

**Callables:** `sendOtp`, `verifyOtp`, `createOfficialAccount`, `provisionTenant`, `deleteOfficialAccount`, `reassignProjectEngineer`, `createProject`, `attachNtp`, `rollbackOrphanProject`, `changePassword`, `revokeOtherSessions`, `logUserLogout`, `backfillProjectEngineerUids`, `sendPasswordReset`, `resetPassword`, `recalculateStats`, `purgeMobileOriginHcsdAudit`, `runSlippageScanNow`, `updateProfilePhoto`, `updateProfile`, `validateProjectClassification`.

**Triggers:** `onUserWritten`, `onProjectWritten`, `onMobileAuditCreated`, `recomputeProjectActualPercent`, `onProofUploaded`.

**Schedules:** `detectProjectSlippage`.

### Name collisions (both repos export the same name)

- **`generateMilestones`** — this repo owns the deployed URL. Verified 2026-08-02 via the codebase label (both the top-level `codebase` field and `labels["firebase-functions-codebase"]` read `"mobile"`), and independently via `generatedBy: "ai"` and `confirmed: true` on a live milestone document. The web repo's copy at `functions/src/index.js:2752` is DEAD SOURCE. On 2026-07-26 an unscoped web-repo deploy clobbered this URL and required an emergency mobile redeploy.
- **`logMobileAuditTrail`** — this repo owns the deployed URL, verified 2026-08-02 via the same codebase label. The web copy at `functions/src/index.js:1379` is DEAD SOURCE. Behavioral note: this repo's implementation dual-writes to `auditTrails/hcsd/entries` when `syncToHCSD` is true, while the web repo's `purgeMobileOriginHcsdAudit` (`functions/src/index.js:1710`; `MOBILE_ORIGIN_ACTIONS` at `:1720-1727`) batch-deletes mobile-origin actions from that same trail. Both are live. Open behavioral question about whether HCSD audit entries from mobile activity survive.

### Deployed inventory verification

Verified 2026-08-02: **40 functions deployed**, matching `29 web + 13 mobile − 2 collisions = 40`. **No ghost functions.** The earlier "12 ghost functions" audit finding is resolved; all 12 were mobile-owned.

```bash
firebase functions:list --project transpirafund-webapp --json > fnlist.json
```

- The codebase label appears in `--json` output but **not** in the default table view. Always use `--json` for ownership checks.
- On Windows PowerShell, `>` writes UTF-16 LE with BOM. Parse with Node, or write with `Out-File -Encoding utf8`.

### Deploy history

2026-08-02, 2a hotfix. Deployed mobile:generateMilestones and
mobile:confirmMilestonePlan. Covers SME fallback truncation to 12 phases with
proportional duration rescaling, config-error separation from transient AI
errors, truncation provenance on the response, enriched "Milestones Confirmed"
audit message, and cap consolidation onto MAX_PHASES_PER_PLAN. Web side deployed
first: purgeMobileOriginHcsdAudit plus hosting, adding six mobile-origin action
strings to MOBILE_ORIGIN_ACTIONS. APK not yet rebuilt at time of deploy;
client-side changes in MilestoneGenerationModal.tsx,
useProjectDetailsPresenter.ts, and ProjectDetailsView.tsx ship in the next build.
