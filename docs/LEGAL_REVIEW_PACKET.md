DRAFT — NOT LEGALLY REVIEWED. Nothing here is legal advice or a compliance claim.

# Legal Review Packet — MyLookFit / VibeFit

Prepared for an Indian tech lawyer's DPDP Act 2023 review, with GDPR exposure
noted where the product could reach EU users (Play Store distribution is not
geofenced in the repo). Everything below is derived from the current codebase
(`E:\VibeFit`, migration head `0009_age_confirmation`, 26–27 Sep 2026) plus
`docs/DATA_INVENTORY.md`. Where the code does not settle a question, that is
stated and turned into a question for counsel rather than answered.

## 1. Product summary

MyLookFit (package `com.mylookfit.app`, still branded `vibefit` in the EAS
slug/scheme/API host) is a mobile styling app. A user photographs their face;
the photo is run through on-device-independent, server-side ML (MediaPipe-based
face/color/hair/skin analysis) to produce style recommendations. No AI vision
model is used — the analysis is deterministic rule-based scoring on measured
features (see `backend/rules/`), not a foundation-model image classifier. An
optional AI stylist **chat** feature exists but has no provider key configured
in production, so it currently returns a static fallback reply rather than
calling Gemini or Groq. Body-shape styling is explicitly never inferred from a
photograph — it comes from a self-answered questionnaire.

## 2. Data flows

See `docs/DATA_INVENTORY.md` for the full table. Headline facts:

- **Photographs are not persisted in production.** No object-storage
  credentials are configured (`photo_storage.configured()` is `False`), so the
  image is analyzed in memory per request and discarded; `analyses.image_url`
  holds `NULL` or a `local://` placeholder, never a real stored file.
- **Derived face measurements ARE persisted indefinitely** in `analyses.face_analysis`
  (JSON, includes MediaPipe landmark-derived features) until the user deletes
  that analysis or their account — this is the more legally interesting
  artifact than the photo itself, since the photo is gone but numeric
  derivatives of the face remain.
- **Chat message content is stored in Postgres regardless of whether an AI
  provider is configured** — only the outbound call to a third-party LLM is
  gated by the API keys, not the storage of what the user typed.
- **Processors**: Render (compute), Neon (Postgres), Firebase/Google
  (authentication), Expo/EAS (build-time only). Gemini/Groq are integrated in
  code but hold no production key today.

## 3. In-app legal text vs. implementation

Source: `mobile/constants/legal.ts` (displayed by `mobile/app/settings/legal.tsx`),
tested by `mobile/constants/legal.test.ts`.

**Existing draft marker** (already present, displayed at the top of both
documents, and pinned by a passing test):
> "This document describes how MyLookFit behaves today. It has not yet been
> reviewed by a lawyer, and it is not a contract with a named company."

This satisfies the spirit of a draft disclosure; per this task's scope it was
left unchanged (see §4 of the engineering report — a marker already existed,
so nothing was modified).

### What the policy says, clause by clause

| Claim in `legal.ts` | Matches implementation? |
|---|---|
| "The photograph itself is deleted as soon as the analysis finishes, unless you have turned on 'Keep my photographs'" | Yes — `analysis_service._enforce_retention`. In production this is somewhat moot since storage is never configured, so the photo was never durably stored to begin with; the policy doesn't distinguish "we deleted it" from "we never had anywhere to put it" as sharply as `services/privacy_service.STORAGE_UNAVAILABLE_NOTE` does in the API |
| "Withdrawing consent... deletes photographs already kept" | Yes — `privacy_service.set_consent` |
| Backup wording ("Encrypted infrastructure backups... age out... rather than being removed individually") | Yes — this exact sentence is shared verbatim between `privacy_service.RETENTION_NOTE` (API) and `legal.ts`, and a test (`legal.test.ts`) pins them together so they cannot drift |
| "We do not use your photographs to train models" | Consistent with the code — no training pipeline exists in this repo |
| "Sign-in is handled by Google Firebase Authentication... database... on Neon... application on Render" | Matches infrastructure |
| Deletion section: lists what "Delete account" removes | **Does not mention that the Firebase Authentication account itself is not deleted** by this action (see Data Inventory §"Gaps found in account deletion", item 1) — this is a mismatch between user expectation ("removes your profile... ") and what actually happens on Google's side **Update 27 Sep 2026:** fixed in code, not yet in any build. After the server deletes the data, the app now calls Firebase `deleteUser`. If Firebase refuses (sign-in older than 5 minutes), the user is told to sign in again and repeat. The web deletion flow must do the same. Verify on device once the new APK exists. |
| No mention of chat message storage independent of AI-provider status | The policy doesn't call out that typed chat messages are saved to the database even though no AI provider currently processes them — arguably immaterial today (no third party sees it) but worth stating precisely |
| No mention of the image-hash cache | Minor/technical (in-memory, TTL ≤1 hour, not user-facing) — likely does not need disclosure, but flagged for counsel's view on whether "processing" language in DPDP would consider it a distinct processing activity |

### Terms of Service

`TERMS_OF_SERVICE` in the same file states illustrations are not a virtual
try-on or a prediction, disclaims medical/dermatological advice, and discloses
the free-tier cold-start behavior. No mismatches found against the code.

## 4. The 18+ gate

Component: `mobile/components/ds/AgeGate.tsx`. Exact copy shown to the user:

> Heading: "One quick check"
> Body: "MyLookFit analyses face photos to suggest colours and styles, so it
> is for people aged 18 and over. Please confirm your age to continue."
> Buttons: "I'm 18 or older" / "I'm under 18"
> Caption: "This confirms eligibility to use the app. It is not identity or
> age verification, and we do not ask for your date of birth."
> If declined: "MyLookFit is for adults" / "Sorry, MyLookFit is only
> available to people aged 18 and over." with a "Sign out" button.

Mechanism: a single yes/no tap, recorded once as `users.age_confirmed_at`
(first value kept, never overwritten) via `POST /privacy/eligibility`. No
birth date, ID, or third-party age-verification service is used. The
component's own code comment says: "Copy is pending legal review and must
not be presented as age verification." This is the design as built — whether
it is *adequate* under DPDP or Play policy is Question 1 below.

## 5. Consent screens

- **Photo retention/reuse consent**: two switches on `mobile/app/settings/privacy.tsx`,
  backed by `PATCH /privacy/consent`. Turning retention on is refused (409) when
  storage isn't configured — the UI shows this as "unavailable" rather than a
  silent no-op.
- **Eligibility "consent"**: a statement of fact ("I am 18+"), not a granular
  consent to a described processing purpose.
- **No separate consent screen exists for**: chat message storage, analysis
  data retention itself (only the photo has a retention toggle — the derived
  measurements have none), or cross-border transfer.

## 6. Deletion / export

- **Export**: `GET /privacy/export` returns an allowlisted JSON document
  (`privacy_service.EXPORTABLE`); a denylist (`FORBIDDEN_FRAGMENTS`) additionally
  strips anything with `password`, `secret`, `token`, `credential`, `api_key`,
  `hash`, `salt`, `private` in the column name, even from tables marked
  fully-exportable. `hashed_password` is explicitly excluded twice over.
- **Deletion**: `POST /privacy/delete-account` requires the typed phrase
  `DELETE MY ACCOUNT` plus re-authentication — password re-entry for internal
  accounts, or a Firebase `auth_time` no older than 300 seconds
  (`REAUTH_MAX_AGE_SECONDS`) for Firebase accounts. See §3 and Data Inventory
  for the confirmed gap: the Firebase Authentication account survives this
  call.
- No web-based deletion channel exists today (see `docs/WEB_ACCOUNT_DELETION.md`
  for the Play Store requirement this creates).

## 7. Processors & cross-border transfer

| Processor | Function | Region |
|---|---|---|
| Render | App hosting | **Not set in repo config — unknown** |
| Neon | Database | **Not set in repo config — unknown** |
| Firebase Authentication (project `vibefit-a897e`) | Identity | **Not set in repo config — unknown** (Firebase projects have a default GCP resource location, but it is a console setting, not something visible in this repository) |
| Gemini / Groq | AI chat/plan rephrase | Configured off in production; if enabled, both are US-based API providers |

**No repo evidence settles where Indian user data physically resides.** This
is a direct question for counsel (DPDP cross-border transfer rules) and cannot
be answered from source code alone — it requires checking the Render, Neon and
Firebase account/project settings directly.

## 8. Open items (not yet addressed anywhere in the repo)

- No grievance officer name/contact is published anywhere in the app or repo.
- No company legal entity, registered address, or CIN/incorporation detail is
  named — `legal.ts` explicitly avoids inventing one (enforced by a test that
  fails if the text matches `Ltd|Limited|LLC|Inc.|GmbH|Pvt.` or an address or
  email pattern).
- No Hindi (or other scheduled-language) notice exists — DPDP Act §7 dwells on
  notice being in a language the Data Principal understands; the app is
  English-only today.
- No public web privacy policy URL was found outside the in-app screen (Play
  Console requires a public URL, not just an in-app screen).
- No DPIA, ROPA, or data retention schedule document exists in the repo.

## 9. QUESTIONS FOR COUNSEL

1. Is a single yes/no "I'm 18 or older" tap, with no date of birth or
   verification, an adequate age-gate under DPDP 2023 for this processing
   (facial photograph analysis), or does DPDP's treatment of a "child" (under
   18) require stronger verification given the biometric-adjacent processing?
2. Are the *derived face measurements* stored in `analyses.face_analysis`
   (landmark-based feature scores, not the photograph itself) "biometric
   data" / "sensitive personal data" under DPDP or GDPR when they are used
   only for styling recommendations and not for identification or
   authentication? Does the answer change because the raw photograph is
   discarded but its numeric derivatives are kept indefinitely?
3. Is the current consent-screen wording (a toggle labelled "Keep my
   photographs") specific enough to constitute valid, informed consent under
   DPDP §6, given it does not separately address retention of the *derived*
   analysis data (which has no equivalent toggle)?
4. What retention period, if any, is defensible for analysis results after
   the source photograph has been discarded, given there is currently no
   automatic expiry — only user-initiated or account deletion?
5. Does this processing (facial image analysis at scale, even ephemeral)
   require a Data Protection Impact Assessment under DPDP, given the
   Significant Data Fiduciary thresholds, or under GDPR Article 35 if EU
   users are in scope?
6. Given no birth date is collected, what should the deletion/blocking
   procedure be if a user is later found to have been under 18 at signup?
7. What are the cross-border transfer obligations given Render/Neon/Firebase
   region is not established from the codebase — does counsel need to obtain
   that from account settings directly, and does DPDP's cross-border transfer
   regime (as it stands with the government's allow-list mechanism) apply?
8. Does Google Play's policy on "face data" / biometric-adjacent features
   require a more prominent runtime disclosure (beyond the Play Data Safety
   form) before the camera permission is invoked?
9. Is failing to delete the underlying Firebase Authentication record when
   `POST /privacy/delete-account` succeeds a compliance gap under DPDP's
   erasure requirements, or is deleting the app-side account sufficient given
   Firebase Auth alone (with no app data attached) may not itself constitute
   retained "personal data" for this service?
10. Is the backup-retention disclosure ("ages out of backups rather than
    being individually removed") sufficient under DPDP/GDPR erasure
    obligations, or does it require an upper bound (e.g., "no more than N
    days")?
11. Given chat message content is stored regardless of AI-provider
    configuration, does the current privacy policy need to disclose that
    storage independently of the (currently dormant) AI-processing
    disclosure?
