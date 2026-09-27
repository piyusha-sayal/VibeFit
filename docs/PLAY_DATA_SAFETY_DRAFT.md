DRAFT — not submitted, not reviewed.

# Play Console Data Safety Worksheet — MyLookFit

Worked from `docs/DATA_INVENTORY.md` and the current codebase. This is a
drafting aid for whoever fills in the actual Play Console form — it is not
itself a submission and has not been checked against current Play policy
text.

**Transport encryption**: production traffic goes over `EXPO_PUBLIC_API_URL`
(an HTTPS Render URL in production; `http://localhost:8000` is only the local
dev fallback in `mobile/services/api.ts`/`reportService.ts`). **Assume "Yes,
encrypted in transit" for all rows below, but confirm the exact production
`EXPO_PUBLIC_API_URL` value is `https://...` in the EAS environment before
submitting — it is not hardcoded in the repo.**

**Account deletion URL**: Play requires a public URL (not just an in-app
screen) if the app supports accounts. **No such URL exists today** — see
`docs/WEB_ACCOUNT_DELETION.md`. This blocks accurate completion of the
"Data deletion" section of the form until that page ships.

## Personal info

| Field | Collected? | Shared? | Ephemeral? | Required/Optional | Purpose(s) | Encrypted in transit | Deletion available | Retention |
|---|---|---|---|---|---|---|---|---|
| Name | Yes | No | No | Required (account creation) | Account management, personalization | Yes | Yes (delete account) | Until account deletion |
| Email address | Yes | No* (Firebase processes it as our service provider; Play's form does not count transfers to service providers as "sharing". NEEDS REVIEW) | No | Required | Account management | Yes | Yes (delete account) | Until account deletion |
| User IDs | Yes (internal UUID; Firebase UID for Firebase accounts) | No* (Firebase processes it as our service provider; Play's form does not count transfers to service providers as "sharing". NEEDS REVIEW) | No | Required | App functionality, account management | Yes | Yes (delete account) | Until account deletion |
| Address, phone number, other personal info | Not collected | — | — | — | — | — | — | — |

## Photos and videos

| Field | Collected? | Shared? | Ephemeral? | Required/Optional | Purpose(s) | Encrypted in transit | Deletion available | Retention |
|---|---|---|---|---|---|---|---|---|
| Photos (face photograph for analysis) | **NEEDS REVIEW** — see reasoning below | No third party | Yes in production today (in-memory per request; not written to durable storage since no object-storage keys are configured) | Required for the core analysis feature | App functionality (style/color/hair analysis) | Yes | Photo delete endpoints exist (`DELETE /privacy/photos/...`), though currently there is nothing durable to delete in production | None durable in production; if storage were enabled, "until deleted or account deletion" |

**NEEDS REVIEW reasoning:** Play's Data Safety form asks whether data is
"collected" based on whether it is transmitted off-device, not only whether
it is durably stored — under that reading, the photo likely still counts as
"collected" (it leaves the device and is processed on the server) even though
it is not retained afterward. It should probably be marked **Collected: Yes,
Ephemeral processing: Yes, Shared: No**. Confirm this interpretation against
current Play Console help text before submitting, since Play's definitions
have changed across policy versions.

## App activity

| Field | Collected? | Shared? | Ephemeral? | Required/Optional | Purpose(s) | Encrypted in transit | Deletion available | Retention |
|---|---|---|---|---|---|---|---|---|
| In-app actions (saved looks, drafts, feedback, collections, goals, guide progress) | Yes | No | No | Optional (feature use) | App functionality, personalization | Yes | Yes (per-item delete routes; account deletion) | Until deleted or account deletion |
| Other user-generated content (chat messages) | Yes | **No today** (no AI provider key in production — see Data Inventory); would become "Shared: Yes, with Google/Groq" if a provider key is ever added | No | Optional | App functionality (AI stylist chat) | Yes | Yes (`DELETE /chat/sessions/{id}`; account deletion) | Until deleted or account deletion |
| Analysis results / derived face measurements | **NEEDS REVIEW** — is this "Photos and videos" (derived from a photo) or "App activity"/"App info"? Play's categories don't cleanly cover "numeric features derived from an image but not the image itself." Recommend disclosing under both a note in Photos and videos and as App activity, pending Play Console guidance | No | No — persisted until deleted | Required (it's the product's output) | App functionality | Yes | Yes (`DELETE /analysis/{id}`; account deletion) | Until deleted or account deletion |

## App info and performance

| Field | Collected? | Shared? | Ephemeral? | Required/Optional | Purpose(s) | Encrypted in transit | Deletion available | Retention |
|---|---|---|---|---|---|---|---|---|
| Crash logs | **No** — no crash reporting SDK (e.g. Sentry) integrated in app or backend | — | — | — | — | — | — | — |
| Diagnostics (request logs) | Yes, server-side only (method, route template, status, duration, exception class — never bodies, tokens, or user identifiers per `backend/core/observability.py`) | No | Effectively yes (not queryable per user; not a personal-data table) | N/A (not device-collected) | Debugging, reliability | Yes (log transport is Render-internal) | N/A | Governed by Render's own log retention (not set in this repo) |
| Analytics | **No** — no analytics SDK found in the app | — | — | — | — | — | — | — |

## Device or other IDs

| Field | Collected? | Shared? | Ephemeral? | Required/Optional | Purpose(s) | Encrypted in transit | Deletion available | Retention |
|---|---|---|---|---|---|---|---|---|
| Device or hardware IDs | Not deliberately collected by app code found in this repo | — | — | — | — | — | — | — |
| IP address | **NEEDS REVIEW** — not logged by the app's own middleware, but Render's platform layer may log client IPs independently of application code; this repo cannot confirm or deny that | Unknown | Unknown | N/A | Possibly infrastructure/security | Yes | Unknown | Unknown — check Render account settings |

## Health and fitness

| Field | Collected? |
|---|---|
| Health info, fitness info | Not applicable — no health/fitness data model exists in this app despite the "MyLookFit" name; this is a styling app, not a health tracker |

## Financial info

Not collected — no payment/billing code found in this repo.

## Location

Not collected — `onboarding_responses.market`/`.climate` are self-typed text
fields the user enters, not device location data (no `expo-location` or
similar geolocation API call found).

## Summary flags for whoever fills the Play Console form

1. **Blocking**: no public account-deletion URL exists yet (Play requires one
   when the app supports account creation) — see `docs/WEB_ACCOUNT_DELETION.md`.
2. **NEEDS REVIEW**: whether ephemeral, in-memory photo processing on the
   server counts as "collected" under current Play Console definitions.
3. **NEEDS REVIEW**: which category derived face measurements belong in —
   they are not the photo itself, but they are derived from one and persist
   indefinitely.
4. Confirm the production `EXPO_PUBLIC_API_URL` is HTTPS before asserting
   "encrypted in transit" for all rows (this repo defaults to
   `http://localhost:8000` for local dev only).
5. If Gemini/Groq keys are ever added to production, the "shared with third
   party" answers for chat messages and analysis inputs used in prompts must
   be revisited before that release ships.
