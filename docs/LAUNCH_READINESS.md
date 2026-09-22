# MyLookFit launch readiness

Tracks what is finished, what is not, and what is blocking a public release.
An item is only ticked when something was run and its result recorded.

Verification labels are kept apart. There is no combined PASS.

| label | meaning |
|---|---|
| LOCAL VERIFIED | tests, types and lint on a workstation |
| STAGING VERIFIED | the image runs as a container against a non-production database |
| PRODUCTION VERIFIED | measured against the real production host |
| ANDROID BUILD VERIFIED | the APK exists, installs, and matches the deployed API |
| ANDROID EMULATOR VERIFIED | journeys driven on an emulator |
| ANDROID PHYSICAL DEVICE VERIFIED | a person used the app on real hardware |

---

## Status

| area | state | evidence |
|---|---|---|
| Five flagship experiences | **Done** | 26/26 production endpoint checks |
| Account deletion | **Done and live** | 27/27 production checks; `3fbd321` |
| Data export | **Done and live** | allowlist-based; verified on production |
| Photograph retention and deletion | **Done and live** | off by default; production stores none today |
| Photograph consent that does something | **Done and live** | withdrawal deletes kept photos |
| Authentication | Done | Firebase ID token, local JWT fallback |
| User-data isolation | Verified for privacy routes | cross-user delete 404s; a bystander account survived a deletion untouched |
| Onboarding redesign | **Not started** | — |
| UX consistency audit | **Not started** | — |
| Visual refinement | **Not started** | — |
| Accessibility audit | Started | colour is no longer the only selection signal; swatches meet MIN_TOUCH and carry label + hint |
| Settings completion | Partly | Privacy and Delete account added; Help is a single screen |
| Legal documents | Drafted and in the app | Settings → Help; no legal review yet |
| Performance measurement | Partly | cold start ~41s measured; in-app timings not measured |
| Production API | Live | `58c70a7` behaviour, `/health` and `/health/db` 200 |
| Database | **`0008` live** | 24 users, 12 saved looks, 4 analyses — nothing lost |
| Android build | **FINISHED** | `1b07a01f`, from `3fbd321` — has the privacy screens, not the P1 legal/accessibility work |
| Physical-device testing | **Not performed** | — |

---

## Verification labels, as they actually stand

| label | status |
|---|---|
| LOCAL VERIFIED | **Yes** — backend 443 passed, mobile 144 across 18 suites, `tsc` clean, ESLint clean |
| STAGING VERIFIED | **Not verified** — no Docker daemon on this workstation |
| PRODUCTION VERIFIED | **Yes** — `3fbd321` live, migration `0008`, privacy 27/27, flagship 28/28, Phase 5 journey 22/22 |
| ANDROID BUILD VERIFIED | **Yes** — installs, launches, process survives; API base URL correct |
| ANDROID EMULATOR VERIFIED | **No** — the emulator booted and installed the APK, but its own launcher and System UI went unresponsive under software rendering and `com.google.android.gms` crashed on its own dex. Nothing about the app's screens was observed |
| ANDROID PHYSICAL DEVICE VERIFIED | **No** — no physical device has run this build |

---

## Blockers

### 1. No S3 credentials in production

Not a defect, but it changes what the privacy features currently mean. With
retention consent explicitly granted, an upload followed by a photograph
listing returns `storedCount: 0` — `photo_storage` records a `local://`
placeholder when no object store is configured, so the image is analysed in
memory and never written anywhere.

Consequences, stated rather than implied:

- No facial photograph is retained in production today. That is the
  privacy-preferring outcome.
- The S3 delete path has therefore **not** been exercised against a real bucket
  in production. It is covered by tests, including the failure and retry cases,
  but tests are not a bucket.
- If storage is ever configured, re-run the photograph journey before claiming
  retention and deletion work end to end.

### 2. No physical-device testing

The manual checklist is in `RELEASE_VERIFICATION.md`. No amount of API testing
substitutes for it.

### 3. The legal documents have had no legal review

Both are now in the app, reachable from Settings → Help and from the privacy
screen, and both say so at the top. They are written clause by clause against
what the code does — the backup paragraph is asserted in a test to be byte-for-
byte the sentence the API returns — and they name no company, address or
support contact, because there are none to name. That is a truthful starting
point for a lawyer, not a substitute for one.

### 4. Onboarding, UX and visual work not started

P1. Accessibility has begun — colour is no longer the sole carrier of
selection state — but the wider audit (text scaling, screen-reader passes over
each flagship screen, focus order) has not been done.

The current APK predates the P1 work, so the legal screens and the swatch
changes are in `main` but not in any build yet.

---

## What the privacy implementation actually promises

Worth stating precisely, because these are the claims a user will rely on.

- **A photograph is not kept by default.** When an analysis completes, the
  image is deleted from object storage unless retention consent is on. The
  results stay.
- **Consent does something.** Withdrawing retention deletes what was already
  kept. Reuse consent cannot be on without retention.
- **A photograph can be deleted without losing the analysis.**
- **Deleting an account removes the rows and the files.** If object storage is
  unreachable, the account is still deleted and the response says how many
  files could not be reached, rather than reporting a clean success.
- **Export contains only the requesting user's data**, and never the password
  hash or a storage URL.
- **Backups are not claimed to be purged.** The wording says deleted data ages
  out of the providers' rolling encrypted backups rather than being removed
  from them individually, because that is what the providers actually do.
