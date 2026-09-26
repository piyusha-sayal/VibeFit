# Brand and package migration — Launch Gate 0 (26 September 2026)

MyLookFit is the permanent public brand. VibeFit is the internal codename and
stays wherever it's invisible to users and costly to change.

## 1. Identifier mapping

| Identifier | Before | After | Why |
|---|---|---|---|
| App name | MyLookFit | MyLookFit | unchanged |
| Android package | `com.vibefit.app` | **`com.mylookfit.app`** | Can't change after the first Play upload. No Play upload has happened yet |
| iOS bundle ID | `com.vibefit.app` | **`com.mylookfit.app`** | Kept aligned with Android. No iOS build exists yet |
| URL scheme | `vibefit` | **`["mylookfit", "vibefit"]`** | `mylookfit://` is primary. `vibefit://` is still accepted for links from earlier builds |
| Expo slug | `vibefit` | `vibefit` (kept) | Linked to EAS project `8f7c7f5d-b5bf-48f0-974e-60d31b4ffeee`, its env vars and its credentials. Users never see it (it only appears in expo.dev URLs) |
| EAS project | `@piyusha_sayal/vibefit` | kept | A new project would mean re-creating env vars and credentials for no user-visible gain |
| Firebase project | `vibefit-a897e` | kept | Firebase project IDs are immutable. The backend verifies ID tokens against this ID |
| API host | `vibefit-api-awx9.onrender.com` | kept | No MyLookFit domain is configured. See §5 |
| Render service | `vibefit-api` | kept | Renaming a blueprint service can create a second service |
| Postgres/logger/bucket names | `vibefit*` | kept | Internal only |
| Report/card filenames | `vibefit-report-*.pdf`, `vibefit-card-*.png` | `mylookfit-report-*`, `mylookfit-card-*` | Visible to users when they share a file |
| PDF, card, AI-stylist and explanation copy | "VibeFit" | "MyLookFit" | Visible to users |

The PDF and card footer used to say "Generated on-device by VibeFit". That was
untrue, because the report is rendered on the server. It now reads "Generated
by MyLookFit".

## 2. Every `vibefit` occurrence, classified

A = must change before first publication (done). B = history or docs only.
C = internal identifier that stays. D = needs a dashboard action first. E = unknown.

| Location | Class | Action |
|---|---|---|
| `mobile/app.json` package, bundleIdentifier, scheme | A | Changed |
| `mobile/app.json` slug, `extra.eas.projectId` | C | Kept (EAS linkage) |
| `backend/services/{card,report,ai,profile}_service.py`, `rules/face_attributes.py`, `rules/makeup_library.py`, `api/routes/face.py`, `api/deps.py` default name | A | Changed to MyLookFit |
| `backend/api/routes/analysis.py`, `mobile/services/reportService.ts` filenames | A | Changed |
| `backend/main.py` OpenAPI title | A (cosmetic) | Changed |
| `backend/core/observability.py`, `photo_storage.py`, `privacy_service.py` logger names | C | Kept. Log queries depend on them |
| `backend/core/config.py` `aws_s3_bucket` default | C | Kept (unused; no bucket configured) |
| `backend/.env.example`, `docker-compose.yml` local DB credentials | C | Kept (local only) |
| `backend/tests/test_firebase_auth.py` project ID | C | Kept (real, immutable project ID) |
| `backend/tests/test_no_inference.py` docstring, `backend/README.md` | B | Kept |
| `mobile/package.json` name | C | Kept (npm name; never shipped) |
| AsyncStorage keys `vibefit.theme`, `vibefit.reducedMotion`, `vibefit.guidesCompleted`, `vibefit.guidesSynced`, `vibefit-cache:latestAnalysis` | C | Kept. Invisible to users; renaming would add migration code for nothing |
| `render.yaml` service name, API hostname | D | Kept. A branded domain needs a domain you own (§5) |
| Firebase project `vibefit-a897e` / auth domain | C | Kept (immutable) |
| EAS env `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | D | **Missing in preview and production.** See §4 |
| `docs/*`, `status.md`, `ideation_status.txt`, `01_MyLookFit_VibeFit_plan.md`, `UI/VibeFit Mobile UI.html`, `docs/research/*` | B | Historical. Not rewritten |
| `.claude/CLAUDE.md`, `mobile/.claude/CLAUDE.md` | B | Tooling notes |
| `backend/.env`, `mobile/.env` | E | Not read (local secrets). The owner should check them against the EAS env |

## 3. Dependency graph for the package change

```
com.mylookfit.app
 ├─ app.json android.package ────────── done
 ├─ Expo prebuild registers the package as a URL scheme
 │    └─ expo-auth-session Google redirect  com.mylookfit.app:/oauthredirect
 ├─ EAS Android keystore (per project × package) ── generated on the first build of the new package
 │    └─ SHA-1 / SHA-256 ──► Google OAuth *Android* client (package + SHA-1) ── OWNER
 │                              └─ EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID in EAS env ── OWNER
 ├─ Play App Signing key (after Play enrolment) ──► second SHA-1 on the OAuth client ── OWNER, later
 └─ Firebase JS SDK (web config) ── independent of the package. Email/password is unaffected
```

These don't depend on the package: `google-services.json` (the app uses the
Firebase JS SDK, not `@react-native-firebase`), backend token verification
(audience = Firebase project ID), email/password, session restore, and
biometric unlock (per-account key in SecureStore).

## 4. Firebase and Google sign-in: status and owner steps

**What was found.** `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` is not set in
either EAS environment. `useGoogleAuth` therefore never builds a request on
Android, and every EAS build so far, including `e2812904`, shows "Google
sign-in needs an Android Client ID". So Google sign-in on Android has never
worked in a cloud build. The package change doesn't break a working flow.

**Status: BLOCKED on owner action.** Don't mark Google sign-in done until
step 6 passes on a device.

1. The EAS keystore for `com.mylookfit.app` already exists (created in the cloud on 26 Sep, "Build Credentials ToqVuFPT9b"). Read its fingerprints:
   `cd mobile && npx eas-cli@latest credentials -p android` → profile `preview` → the keystore shows SHA-1 and SHA-256.
2. Firebase Console → project `vibefit-a897e` → Project settings → *Add app* → Android.
   Package `com.mylookfit.app`, then add both fingerprints. Firebase creates the
   Android OAuth client in the same Google Cloud project. You don't need to
   commit `google-services.json` because the app doesn't read it.
   (Alternative: Google Cloud Console → APIs & Services → Credentials →
   Create OAuth client ID → Android, with the same package and SHA-1.)
3. Google Cloud Console → Credentials → the new Android client → *Advanced settings* →
   turn on **custom URI scheme**. expo-auth-session redirects to
   `com.mylookfit.app:/oauthredirect`, and Google turns custom schemes off
   by default on new Android clients.
4. Set the client ID in both EAS environments:
   `npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value <client-id> --visibility plaintext`
   Repeat with `--environment production`.
5. Rebuild the preview APK.
6. On a device: Google sign-in opens → account chosen → returns to MyLookFit →
   backend accepts the token (home loads) → kill and relaunch → session restored.
7. After Play enrolment: Play Console → App integrity → copy the **app signing
   key** SHA-1 and SHA-256 and add them in Firebase (step 2). Without these,
   Google sign-in fails on Play-installed builds.
8. Keep the old `com.vibefit.app` registration until step 6 passes, then remove it.

If step 3's option isn't available, the fallback is native Google Sign-In
(`@react-native-google-signin/google-signin`). That is a code change and
belongs to a separate task.

## 5. API branding

No MyLookFit domain is configured anywhere in the repo, Render config or EAS
env. None was invented. The app keeps
`https://vibefit-api-awx9.onrender.com`. Users never see it, but it's visible in
network inspection. When a domain is owned: Render → service → Custom Domains
→ add `api.<domain>` → create the CNAME → wait for TLS → check `/health` and
`/health/db` → only then change `EXPO_PUBLIC_API_URL` in EAS, keeping the
onrender hostname working for installed builds.

## 6. Other Launch Gate 0 decisions

| Topic | Decision |
|---|---|
| Deep links | `app/+native-intent.tsx` → `utils/deepLink.ts`: normalises `mylookfit://` and `vibefit://`, passes the Google callback and router paths through unchanged, and sends malformed links (bad encoding, `..`, backslashes, control characters) to `/`. 7 tests |
| Age gate | 18+ yes/no statement after sign-in and the biometric lock, before onboarding. No birth date. Remembered on the device per account; a new device asks the server (5 s cap, then asks the user); the server keeps the first timestamp (`users.age_confirmed_at`, migration `0009`, `POST /privacy/eligibility`, included in export). Declining shows a sign-out screen. **Copy is pending legal review. This is not age verification and not legal compliance on its own.** |
| Crash reporting | **Blocked on owner.** Needs a Sentry account and DSNs (free Developer plan). Mobile needs `@sentry/react-native` plus its config plugin, which means a native rebuild. Nothing was added because a DSN-less integration would be dead code. Scrubbing rules for when it's added: no photos, landmarks, face metrics, passwords, tokens, export or profile payloads |
| Analytics | **Blocked / deferred.** The Firebase JS SDK's Analytics doesn't run in React Native. Firebase Analytics would need `@react-native-firebase` plus `google-services.json` (native). Adding any analytics changes the Play Data safety form and the privacy policy, so do it together with the legal review |
| Render cold start | **No keep-warm cron.** Render gives 750 free instance hours per *workspace* per month, and running out suspends *every* free service until the month ends. A 24/7 ping uses ~744 h, leaving nothing for staging or other projects. The non-blocking launch (5 s give-up, waking screen) stays. Recommended at launch: Render Starter (~$7/month) |
| Passport | Still **OPEN**. Existing `pool_pre_ping` + `pool_recycle=240` kept. Added: inbound `X-Request-ID` echo, `conn_error` classification on unhandled DB errors, and `backend/scripts/passport_probe.py` (bounded: ≤ 20 concurrent, ≤ 500 requests, no production default). Not run against any server yet |
| Staging | Feasible at zero cost *only without* a 24/7 keep-warm: Neon branch (free tier includes branches) plus a second free Render service that sleeps. Not created, because it needs dashboard access. When created: set EAS `preview` env `EXPO_PUBLIC_API_URL` to staging. That only affects **new** preview builds; installed APKs keep the URL baked in. Production stays on prod |
| APK | **Not built.** The submission on 26 Sep was refused with `EAS_BUILD_FREE_TIER_LIMIT_EXCEEDED`: the free plan's Android builds for the month are used up and reset **1 Oct 2026**. Local `eas build --local` doesn't run on Windows (WSL is broken on this machine). Last good APK: `e2812904` at `1e4dcc8`, still `com.vibefit.app` |
| AAB | `eas.json` `production` profile already has `buildType: app-bundle`, `distribution: store`, the `production` env (prod API) and `autoIncrement`. Release signing uses the EAS-managed keystore for `com.mylookfit.app`. No production build and no upload were made |
