# Launch Gate 1 — Google sign-in readiness, release config, 1 October runbook

Prepared 27 September 2026. **Nothing here is device-verified.** Google sign-in is
not verified until §6 step 16 passes on a physical phone.

## 1. How Google sign-in actually works in this app (native, since 27 Sep)

| Piece | Implementation |
|---|---|
| Library | `@react-native-google-signin/google-signin` 16.1.5 (Original API), installed with `npx expo install` for SDK 54, with its config plugin in `app.json`. `expo-auth-session` removed |
| Flow | native account picker → Google **ID token** (`services/googleAuth.ts`) → `GoogleAuthProvider.credential` → Firebase `signInWithCredential` → Firebase ID token → existing backend verification (project `vibefit-a897e`) → `router.replace('/')` → lock / 18+ / onboarding / home |
| Client IDs | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is **required**; it's what makes Google return an ID token. The Android OAuth client is matched by Google from package + signing SHA-1 and isn't passed to the app. The app no longer reads `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`; it can stay set |
| Redirect URI / custom URI scheme | **None.** The native flow has no redirect, so the Android client's custom URI scheme setting **stays OFF** |
| `google-services.json` | **Not required.** Checked with a local `expo prebuild --platform android`: no Google Services Gradle plugin, and the prebuild succeeded without `iosUrlScheme` (that option only matters for a future iOS build) |
| Missing web client ID | Button explains "not available… use email and password"; the native picker is never opened |
| Cancel / provider error / Play services missing | cancel is silent; errors show a user-facing message; no crash |
| Firebase or token failure | no session is stored; the Google account is cleared so the next attempt shows the picker again |
| Expo Go | the native module isn't in Expo Go; test Google sign-in in an EAS build only |

## 2. Owner checklist — Firebase, Google Cloud, EAS

Do these in order. Don't paste IDs or fingerprints into the repo.

**A. Signing certificate fingerprints (EAS)**
1. `cd mobile && npx eas-cli@latest credentials -p android`, then choose `production` (the keystore is shared with `preview` unless you changed it). The keystore entry "Build Credentials ToqVuFPT9b", created 26 Sep for `com.mylookfit.app`, shows **SHA1 Fingerprint** and **SHA256 Fingerprint**.
   You can also find them at expo.dev → project `vibefit` → Credentials → Android → `com.mylookfit.app`.
2. Record both. SHA-1 is what the Android OAuth client needs. SHA-256 goes into Firebase alongside it (needed for App Links and some Firebase features; harmless to add).

**B. Firebase (project `vibefit-a897e`)**
3. Project settings → Your apps → *Add app* → Android. Package name `com.mylookfit.app`, nickname "MyLookFit Android", SHA-1 from step 2. Register.
4. On the new app, add the SHA-256 as well (*Add fingerprint*).
5. Firebase offers `google-services.json`. You can download it for your records, but **don't commit it**; the app doesn't use it.
6. Authentication → Sign-in method → check that **Google** is *Enabled* (it has to be for `signInWithCredential`).

**C. Google Cloud OAuth (same project)**
7. *(Done by owner, 27 Sep.)* APIs & Services → Credentials. Registering the Firebase Android app with a SHA-1 normally auto-creates an OAuth client of type **Android** for `com.mylookfit.app`. If none appears, *Create credentials → OAuth client ID → Android* with that package and SHA-1.
8. **Leave the custom URI scheme OFF.** It is not needed since the switch to native sign-in.
9. Copy its **Client ID** (`…apps.googleusercontent.com`).
10. OAuth consent screen: app name MyLookFit, support email, and your privacy policy URL once one exists. While the app is in *Testing*, only listed test users can sign in. Add the QA testers, or publish the consent screen.

**D. EAS environment variables**

| Variable | development | preview | production | Status |
|---|---|---|---|---|
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | optional (no dev-client builds are used) | **required** | **required** | **missing**, set with step 11 |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | — | set | set | exists; used on web only |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | — | — | — | unset; not needed until an iOS build |
| `EXPO_PUBLIC_FIREBASE_*` (6), `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_API_VERSION` | — | set | set | exist |
| `EXPO_PUBLIC_ENABLE_GUEST_LOGIN` | — | set | not set | guest login is preview-only by design |

11. `npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value <client-id> --visibility plaintext`, then repeat with `--environment production`.
    Check with `npx eas-cli@latest env:list --environment preview`.
    `EXPO_PUBLIC_*` values are compiled into the app. Changing one requires a new build.

**E. Play App Signing (later, when Play Console is set up)**
12. Play Console → your app → Test and release → App integrity → *App signing key certificate*: copy SHA-1 and SHA-256. Add both to the Firebase Android app (step 4), and add the SHA-1 to an Android OAuth client (Google allows one SHA-1 per Android client; create a second Android client with the same package if needed).
13. Google sign-in on **Play-installed** builds isn't complete until this is done and tested with a build from the internal testing track. The EAS upload key's SHA-1 only covers sideloaded APKs.

## 3. Release configuration (verified from files, 27 Sep)

| Item | Value | Source |
|---|---|---|
| App name | MyLookFit | `app.json` |
| Application ID | `com.mylookfit.app` (Android and iOS) | `app.json` |
| Scheme | `mylookfit` (then legacy `vibefit`) | `app.json` |
| Marketing version | `1.0.0` | `app.json` `version` |
| versionCode | EAS remote (`cli.appVersionSource: remote`); no local `versionCode`. Remote value was set to **1** during the refused build on 26 Sep | `eas.json`, EAS log |
| Preview | APK, internal distribution, `preview` env (prod API), no auto-increment | `eas.json` |
| Production | **AAB** (`app-bundle`), `store` distribution, `production` env (prod API `https://vibefit-api-awx9.onrender.com`), `autoIncrement: true`, EAS-managed signing | `eas.json`, `eas env:list` |
| Channels | `preview` / `production` are declared, but `expo-updates` isn't installed, so they do nothing (no OTA updates). Harmless | EAS build warning |
| Guard | `mobile/constants/releaseConfig.test.ts` fails if the package reverts, the legacy ID appears, production stops being an AAB or loses auto-increment, or a local versionCode is added | tests |

## 4. Versioning and tags

| Build | Version | versionCode | When |
|---|---|---|---|
| First MyLookFit preview APK | 1.0.0 | current remote value (1); preview doesn't increment | 1 Oct runbook step 11 |
| Rebuilt preview APKs | 1.0.0 | same as above; tell them apart by EAS build ID and commit | after P0/P1 fixes |
| First production AAB | 1.0.0 | remote +1 (auto-increment), so 2 | only after preview passes device QA |
| Later store builds | bump `version` for user-visible releases; versionCode always auto-increments | — | — |

Tags. Create each one only after its build has FINISHED and been verified:
- `v1.0.0-rc1` on the exact commit of the first preview APK that passes the device QA matrix with no open P0/P1. Then `-rc2`, `-rc3` for later passing rebuilds.
- `v1.0.0` on the exact commit of the AAB promoted to the production track.
- Record the EAS build ID, commit and versionCode for each tag in `RELEASE_VERIFICATION.md`.

## 5. Sentry

| Side | Status |
|---|---|
| Backend | **Ready but switched off.** `core/error_reporting.py` starts Sentry only when `SENTRY_DSN` is set. It never raises. Settings: `send_default_pii=False`, `include_local_variables=False`, request bodies never sent, no tracing. A `before_send` scrubber drops request bodies, cookies, query strings and every header except Content-Type. It reduces the user to an opaque id, strips SQL text and parameters from DB error messages, and redacts any field named like a token, password, email, image, photo, landmark, face, measurement, export, profile, passport or body. 9 tests. **To enable:** create a free Sentry project (Python/FastAPI) → Render → service → Environment → add `SENTRY_DSN` → this redeploys the service |
| Mobile | **Not added, on purpose.** `@sentry/react-native` needs a config plugin and a native rebuild. Without `SENTRY_AUTH_TOKEN` the source-map upload step can fail an EAS build, and free builds are scarce. Add it after the first APK passes QA: `npx expo install @sentry/react-native`, add the plugin to `app.json` with org and project, store `SENTRY_AUTH_TOKEN` as a *secret* EAS env var (or set `SENTRY_DISABLE_AUTO_UPLOAD=true`), initialise in `app/_layout.tsx` only when `EXPO_PUBLIC_SENTRY_DSN` is set, with `sendDefaultPii: false`, and a `beforeSend` using the same rules as the backend (drop request data and breadcrumbs carrying URLs with ids; never attach image URIs). Update the Data safety form ("Crash logs", "Diagnostics") when it ships |

## 6. 1 October build runbook

Run in order. Stop at any failure.

| # | Step | Command / check | Pass |
|---|---|---|---|
| 1 | Firebase Android app exists | Firebase → Project settings → Your apps shows `com.mylookfit.app` | listed |
| 2 | Fingerprints match | SHA-1/SHA-256 in Firebase equal those from `eas credentials -p android` | identical |
| 3 | OAuth Android client | Cloud Console → Credentials: Android client, package `com.mylookfit.app`, same SHA-1 (custom URI scheme off) | yes |
| 4 | Client IDs in EAS | `npx eas-cli@latest env:list --environment preview` and `--environment production` both list `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (required) and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | both |
| 5 | Latest main | `git checkout main && git pull` | up to date |
| 6 | Clean tree | `git status --short` | only your untracked notes |
| 7 | Backend tests | `cd backend && source .venv/Scripts/activate && python -m pytest -q` | all pass (baseline in RELEASE_VERIFICATION) |
| 8 | Mobile tests | `cd mobile && npx jest --watchAll=false --ci` | all pass |
| 9 | Types | `npx tsc --noEmit` | clean |
| 10 | Lint | `npx eslint . --ext .ts,.tsx` | clean |
| 11 | Preview APK | `npx eas-cli@latest build -p android --profile preview` | build queued |
| 12 | Wait | `npx eas-cli@latest build:list --platform android --limit 1` | `FINISHED` |
| 13 | Record | build ID, `gitCommitHash`, versionCode, artifact URL → RELEASE_VERIFICATION | recorded |
| 14 | Install | uninstall any `com.vibefit.app` build; install APK on a physical phone | launches as MyLookFit |
| 15 | Email/password | register → 18+ screen → onboarding; sign out; sign in | works |
| 16 | Google sign-in | chooser → account → back in app → 18+ (new account) or home; relaunch keeps session | works |
| 17 | Biometric | enable in Settings; kill; relaunch prompts | works |
| 18 | Device QA matrix | `RELEASE_VERIFICATION.md` (end) on devices A/B/C | no P0/P1 open |
| 19 | TalkBack | `TALKBACK_TEST_SCRIPT.md` | no P0/P1 open |
| 20 | Fix | P0/P1 fixes, with tests | merged |
| 21 | Rebuild if needed | repeat 7–19 on the new build | pass |
| 22 | Production AAB | only now: `npx eas-cli@latest build -p android --profile production` | FINISHED; **don't upload** until Play Console is set up |

If step 16 fails:
- "Google sign-in failed" straight after choosing an account (`DEVELOPER_ERROR`) → the SHA-1 of the signing key doesn't match the Android OAuth client, or the web client ID is from another project.
- `DEVELOPER_ERROR` or "access blocked" → SHA-1/package mismatch, or the consent screen is in Testing without this tester listed.
- Back in the app with "did not complete" → capture the time and report it; the token exchange failed.

## 7. Money

Nothing here upgrades EAS, Render, Neon or Sentry. Render Starter (~$7/month) is still your decision. The app already handles a sleeping free-tier server, and no keep-warm cron was added.

## 8. Push and production status (27 September 2026)

**Pushed** `deb1853..bc327ba` (9 commits, no force-push): `700a62e`, `b316ea5`, `d965afc`, `af15540`, `e4a9432`, `24bd005`, `9457ca5` (mobile CLAUDE.md cleanup), `80dec46` (launch-router render test), `bc327ba` ("data deleted" wording while the sign-in survives).

| Check | Result |
|---|---|
| Local regression before push | backend 480 · mobile 477 / 37 suites · `tsc` clean · ESLint clean |
| Production after redeploy (disposable account, deleted afterwards) | 19/19: `/health` 200, `/health/db` 200, register/login/refresh/me, Passport 200, `/looks/generate` 200 (3 looks), `/looks/saved` 200, consent defaults off and retention without storage 409, eligibility POST, first timestamp kept, 403 unauthenticated, persists across sign-in, export includes it and has no password hash, deletion 200, token revoked 401 |
| Migration | `0009_age_confirmation` (no Gate 1 migration) |
| Integrity | users 32, 0 marked 18+, analyses 4, saved_looks 24, user_settings 5, beauty_profiles 9 |
| Redeploy | inferred from the push plus a 4-minute wait; the Render deploy log was not read |
| Sentry | inert: the only `sentry_sdk` import sits behind the DSN check, `render.yaml` defines no `SENTRY_DSN`, no DSN has been created, and the backend starts and serves without one. Covered by tests (no import without a DSN, a bad DSN doesn't stop startup, scrubber) |
| Leftover test account | `gate1-cold-763b9630@example.com`: internal auth (UUID4 id, local bcrypt password, no Firebase identity), 0 rows in all 15 related tables. Deleted by exact id in a single transaction guarded to 1 row; users 33 → 32, nothing else changed |
| Passport | warm 50/2 and 100/5 all 200. **Not reproduced**, not fixed. The cold-start probe was stopped for workstation memory and deliberately not rerun; next time use a small bounded profile or an external machine |

**Still open (external):** ~~Firebase Android app + fingerprints, Android OAuth client, EAS client IDs~~ (done by owner 27 Sep; custom URI scheme stays off, as native sign-in doesn't use it), on-device Google sign-in check, Play App Signing fingerprints later, preview APK (EAS quota resets 1 Oct 2026; the old `com.vibefit.app` APK proves nothing about the new package), device QA, TalkBack, legal review, production AAB, Sentry DSN, Render Starter decision. The code being pushed doesn't mean any of this external setup is done.
