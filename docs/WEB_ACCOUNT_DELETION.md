# Web Account Deletion — Design (not implemented)

## Why this is needed

Google Play requires apps that support account creation to provide a data
deletion option that works even for someone who has uninstalled the app —
typically a public web page, independent of the mobile client. A repo-wide
search found **no existing public web deletion page, `web/`, `public/`, or
landing directory** — the only account-deletion UI today is the in-app screen
at `mobile/app/settings/delete-account.tsx`, which calls
`POST /api/v1/privacy/delete-account` (see `mobile/services/privacyService.ts`).
This document designs the missing web flow. **No hosting is implemented here
— design only, per task scope.**

## Design goals

Reuse the existing backend rules exactly — no parallel deletion path, no
email-only deletion, no weakening of the confirmation-phrase or
re-authentication requirements that the mobile app already enforces
(`backend/api/routes/privacy.py`).

## Flow

```
1. Public static page (no login required to READ it)
   - Explains what "Delete my account" removes (mirrors the GOES list in
     mobile/app/settings/delete-account.tsx and the RETENTION_NOTE from
     backend/services/privacy_service.py, kept word-for-word identical to
     avoid the app and the web page disagreeing)
   - States plainly: photographs are not durably stored in production today
     (per docs/DATA_INVENTORY.md), so "removes any stored photograph" is
     conditional language, not a promise of something currently happening
   - "Continue to delete your account" button

2. Firebase Auth web sign-in (Firebase JS SDK, same project vibefit-a897e)
   - Email/password OR Google popup, whichever the account used
   - This step is REQUIRED even for internal (non-Firebase) accounts to reach
     a "your identity" step, but see "Internal-JWT accounts" below — the
     backend re-auth check is Firebase-specific (auth_time), so a purely
     internal account cannot re-authenticate via Firebase at all

3. Re-auth freshness check
   - Mirrors backend/api/deps.py: REAUTH_MAX_AGE_SECONDS = 300. The web page
     should read the Firebase ID token's auth_time claim client-side and, if
     older than 5 minutes, force a fresh sign-in (Firebase's
     reauthenticateWithCredential / reauthenticateWithPopup) BEFORE calling
     the delete endpoint — otherwise the backend will reject with 401 and the
     user hits a dead end after typing the confirmation phrase

4. Typed confirmation
   - Require the exact phrase "DELETE MY ACCOUNT" (backend/services/
     privacy_service.py: DELETE_CONFIRMATION) — same string, same case
     sensitivity as the app (body.confirmation.strip() != DELETE_CONFIRMATION)

5. Call the existing endpoint
   POST {API_BASE_URL}/api/v1/privacy/delete-account
   Headers: Authorization: Bearer <fresh Firebase ID token>
   Body: { "confirmation": "DELETE MY ACCOUNT" }
   (no "password" field for a Firebase-authenticated caller — see
   DeleteAccountIn in backend/api/routes/privacy.py: password is only checked
   when current_user.hashed_password is set, which is never true for a
   Firebase-provisioned user)

6. Show result
   - Same fields the app already renders: photographsAttempted,
     photographsRemoved (mobile/app/settings/delete-account.tsx's photoNote
     logic can be reused near-verbatim)
   - On success, tell the user their Firebase Authentication sign-in still
     exists separately (see docs/DATA_INVENTORY.md "Gaps found in account
     deletion", item 1) — being transparent about this is safer than
     implying total erasure the code doesn't perform
```

## Hosting options (free)

| Option | Notes |
|---|---|
| **Firebase Hosting on `vibefit-a897e.web.app`** | Firebase Hosting domains for a project are automatically included in that project's Firebase Auth "Authorized domains" list — this needs verifying in the Firebase console (`Authentication → Settings → Authorized domains`), not assumed from this repo, but it's the standard behavior and is the path of least friction since no extra domain needs authorizing |
| **GitHub Pages** (or any static host) | Works, but the exact domain (e.g. `username.github.io`) must be added manually to Firebase's Authorized domains list before `signInWithPopup`/`signInWithEmailAndPassword` will work from it — otherwise Firebase Auth rejects the origin |

Recommendation: Firebase Hosting on the existing project, to avoid a second
authorized-domain step and keep the whole auth surface inside one Google
project already in use.

## Backend changes required

1. **CORS.** `backend/main.py` wires `CORSMiddleware` with
   `allow_origins=settings.cors_origins_list`, driven by the `CORS_ORIGINS`
   env var (`core/config.py`, default `http://localhost:8081`). **The exact
   production value of `CORS_ORIGINS` is not visible from this repo (it's
   Render environment configuration, and `.env` files are out of scope for
   this review)** — whoever deploys the web deletion page must add its exact
   origin (e.g. `https://vibefit-a897e.web.app`) to that Render environment
   variable, comma-separated with whatever is already there. No code change
   is needed if `CORS_ORIGINS` is just an env var already — only a
   configuration change on Render.
2. No new backend route is needed — the web page calls the same
   `POST /api/v1/privacy/delete-account` the app already uses.

## Internal (non-Firebase / email+password JWT) accounts

`backend/api/routes/auth.py` shows internal accounts authenticate with the
backend's own JWT (`create_access_token`), not Firebase. The delete-account
route accepts either path: a password (`DeleteAccountIn.password`) checked
against `current_user.hashed_password`, OR Firebase `auth_time` recency. A web
deletion flow built purely on the Firebase JS SDK **cannot serve an internal
JWT account** — there is no web login form in this design for the internal
auth scheme, and building one would duplicate `POST /auth/login` on the web
with its own password field and bearer-token handling. Two options for
counsel/product to pick between:
- Add a second web login mode (email + password against `/auth/login`) purely
  for internal accounts, then call delete-account with that JWT and the
  `password` field instead of Firebase re-auth — mirrors the app's own
  branching logic (`usesFirebase` check in `delete-account.tsx`).
- Or confirm all real users are Firebase-authenticated in practice (internal
  JWT accounts may only be a test/tooling path per the code comment: "used by
  tests/tools") and scope the web flow to Firebase only, with the fallback
  channel below covering anyone else.

## Abuse considerations

- **Rate limiting**: no rate limiting exists on `/privacy/delete-account` in
  the current backend (no rate-limit middleware found in `backend/main.py` or
  `core/`). A public web page calling this endpoint doesn't materially change
  that exposure (the endpoint already requires a valid bearer token), but if
  a web-based brute-force login attempt against Firebase is a concern,
  Firebase Auth's own rate limiting on sign-in attempts is the mitigating
  control, not anything in this repo.
- **No enumeration**: Firebase Auth's sign-in error messages are Google's to
  control; the backend's delete-account route already avoids leaking whether
  an email exists (it operates on the authenticated user only, never accepts
  an email/user id in the request body).
- **Irreversibility**: keep the same two-factor confirmation (typed phrase +
  re-auth) the app uses — do not simplify it for the web page.

## Fallback channel

Play policy (and good practice) expects a deletion path that doesn't strictly
require the account holder to complete a technical flow — e.g. if they've
lost access to their sign-in method. **No "email us to delete my account"
channel currently exists anywhere in the repo** (no support email is named —
consistent with `legal.ts` deliberately naming no company/address/email
today, per its own test). This is an open product/legal item: a support
contact needs to exist before the web page can honestly say "or email us at
X" as a fallback. Flag for the same legal review as `docs/LEGAL_REVIEW_PACKET.md`.

## External dependencies / owner steps (not implementable from this repo alone)

1. Decide and confirm hosting (Firebase Hosting recommended) and publish the
   static page + its own minimal JS bundle (Firebase JS SDK loaded from a
   CDN or bundled).
2. Verify `vibefit-a897e.web.app` (or chosen domain) is in Firebase's
   Authorized domains list; add it if not.
3. Reference the same `EXPO_PUBLIC_FIREBASE_*` values the app already uses
   (`EXPO_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`,
   `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID` — see
   `mobile/services/firebase.ts`) — these are public web client values by
   Firebase's own design, but should be sourced from the EAS/Firebase console
   configuration at build time, not re-typed into this doc.
4. Add the page's origin to the Render `CORS_ORIGINS` environment variable.
5. Decide on the internal-JWT-account question above.
6. Establish a support/contact channel for the fallback deletion path, and
   get the exact wording legally reviewed alongside the rest of `legal.ts`.
7. Get the account-deletion page URL into the Play Console Data Safety form's
   deletion-request field once live.

## Addendum — 27 September 2026: remove the Firebase sign-in too

The app now calls Firebase `deleteUser` after `POST /privacy/delete-account` succeeds (`mobile/services/authService.ts` `deleteFirebaseAccount`). The web page must do the same, and in this order: server deletion first, then `deleteUser(auth.currentUser)`. If Firebase refuses with `auth/requires-recent-login`, ask the user to sign in again and retry. Doing it the other way round would leave data on the server with no sign-in able to reach it.
