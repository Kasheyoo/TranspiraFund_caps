# TranspiraFund Mobile

The TranspiraFund Mobile app is the field companion for Project Engineers monitoring LGU infrastructure projects. It puts real-time project status, milestone tracking, and geotagged proof-of-work capture in the engineer's pocket while on site.

## What it does

- **Project list and details.** View every assigned project with live progress, contractor, schedule, contract amount, and assigned personnel at a glance.
- **Milestones.** Track each project phase with status (Pending, Ongoing, Completed) and review AI-generated milestone breakdowns before they go live.
- **Proof of work.** Capture milestone photos directly from the project site with GPS coordinates, capture timestamp, and reverse-geocoded human-readable location.
- **Project orders.** View the Notice-to-Proceed document, resume orders, suspension orders, validation orders, and time-extension records.
- **Notifications.** Get alerted on new assignments, milestone reviews, and order updates.
- **Audit trail.** Review a chronological history of your own actions in the app.
- **Profile and settings.** Manage your profile photo, change your password, and access help resources.

## Who it is for

Project Engineers (PROJ_ENG) assigned by the Local Government Unit. Login is OTP-protected and tied to the engineer's tenant — every screen scopes data to the user's assigned LGU automatically.

## Run locally

```bash
npm install
npm start          # Metro bundler
npm run android    # build and install on a connected device or emulator
```

## Build a release APK

```bash
cd android
./gradlew assembleRelease
```

The signed APK lands in `android/app/build/outputs/apk/release/`.
