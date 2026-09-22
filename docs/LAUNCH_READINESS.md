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

---

## Phase 6 P1 §3 — onboarding (22 September 2026)

**Five screens** replace the eight-question form: Welcome (logo, "Find what
fits you."), Interests, Personal Style, optional Personalisation, and a closing
screen that recommends a starting experience from what was actually chosen.

- Nothing is mandatory after the welcome. Skipping records the field as skipped
  rather than storing an invented answer, and "Not sure yet" stays
  distinguishable from an unanswered question.
- No photograph and no body classification is requested anywhere in the flow —
  pinned by tests, not only by intent.
- Selection is a tick as well as a tint, on both `Chip` and the interest cards.
- Region orders what is shown first and restricts nothing, in either direction.
- The home screen orders the five experiences by the chosen interests and
  **hides none of them**.

**Routing.** `app/index.tsx` now resolves one of four states before rendering:
signed out, new, partially completed, returning. A returning user never sees
onboarding again; a new user never sees the home screen flash first.

### What is verified, and what is not

| Label | State |
|---|---|
| LOCAL VERIFIED | **Yes** — backend 456 passed, mobile 183 passed across 21 suites, `tsc --noEmit` clean, ESLint clean |
| STAGING VERIFIED | n/a — no staging environment exists |
| PRODUCTION VERIFIED | **§2 yes** (17/18, the one failure the checker's own). §3 backend is committed but **not yet deployed or verified in production** |
| ANDROID BUILD VERIFIED | **No** — the current APK predates both §2 and §3 |
| ANDROID EMULATOR VERIFIED | **No** |
| ANDROID PHYSICAL DEVICE VERIFIED | **No** — no device testing has been performed |

### Remaining P1 work

§4 homepage sections A–J, §5 UI consistency audit, §6 premium visual
refinement, §7 visual content quality, §8 the full accessibility audit across
each flagship screen, §9 performance measurement, §10 settings and help,
§12 the eight consumer journeys, §13 a release-candidate APK, §14 device
testing.

---

## Phase 6 P1 — release candidate (22 September 2026)

### Verification labels

| Label | State | Evidence |
|---|---|---|
| LOCAL VERIFIED | **Yes** | Backend 456 passed; mobile 245 passed across 23 suites; `tsc --noEmit` clean; ESLint clean |
| STAGING VERIFIED | **n/a** | No staging environment exists |
| PRODUCTION VERIFIED | **Yes** | Onboarding 23/24 (one checker bug, not a defect); Phase 5 journey 22/22; privacy 26/27 (one stale assertion, see below); `/health` and `/health/db` both 200 |
| ANDROID BUILD VERIFIED | **Yes** | Build `190d360f-28a4-438e-9dda-2c943225bb69` FINISHED from commit `f5032ca`. APK: https://expo.dev/artifacts/eas/FMhH3_CKTHJeYapnZGg5lgtjyBfzkIIcChrdbzLepN8.apk |
| ANDROID EMULATOR VERIFIED | **No** | Not attempted this session |
| ANDROID PHYSICAL DEVICE VERIFIED | **No** | No device has run this application at any point |
| LEGAL REVIEW COMPLETE | **No** | No lawyer has read the documents. The app says so on the screen itself |

The privacy script's single failure is `retention and reuse can both be
granted`. That assertion was written before §2 and is now **wrong on purpose**:
production has no object storage, so granting retention correctly returns 409.
The behaviour is right and the check is stale.

### Done this session

- Onboarding production-verified across new, partial, returning and legacy
  accounts, plus cross-account isolation
- Provisional completion: an offline answer no longer masquerades as a
  server-confirmed one, and reconciles when connectivity returns
- Light mode fixed behind the auth and analysis stacks
- Duplicate home section removed; newcomer CTA follows the stated interest
- Navigation audit: 43 routes, all resolve
- Layout audit: 16 layouts, all theme-driven

### Not done, and not claimed

- **Twelve screens still use the legacy primitives.** Listed by name in
  `docs/EXPANSION.md`. They work; they do not follow the theme.
- **Parts 4–7 of the brief were not completed**: premium visual refinement,
  illustration quality review, the wider accessibility audit beyond swatches,
  onboarding and layouts, and performance measurement. No before/after numbers
  were taken, so none are reported.
- **No device or emulator testing.** The eight product journeys are verified at
  the API level only — that establishes the backend contract, not that a person
  can complete them on a phone.

### Launch blockers

1. No physical-device testing has ever been performed.
2. No independent legal review.
3. Twelve screens ignore the theme in light mode.
4. The S3 delete path has never run against a real bucket, because no bucket is
   configured. Unchanged, and stated in the app.
5. The `GET /passport` transient remains **unresolved** — not reproduced in
   bounded testing, and not claimed fixed.

---

## Phase 6 P1 §4 (22 September 2026)

### Done

- **All twelve legacy screens migrated**, plus the nine shared primitives they
  depend on. No file under `app/` or `components/` imports the fixed palette.
- **Light and dark mode are now consistent throughout**, including the gradient
  headers that used to be near-black slabs on ivory.
- **The stale production assertion is corrected**, not removed, and asserts more
  than it did. The privacy journey is **29/29**.

### Measurements

| Check | Before | After | Method |
|---|---|---|---|
| Mobile tests | 245 / 23 suites | **355 / 24 suites** | `npx jest --watchAll=false --ci` |
| Backend tests | 456 | **456** | `python -m pytest -q` |
| Files importing the fixed palette | 21 | **0** | `theme/palette.test.ts`, 108 files checked |
| Production privacy journey | 26/27 | **29/29** | live API, disposable accounts |
| Production Phase 5 journey | 22/22 | 22/22 | live API |

### Not done in this session, and not claimed

- **Part 3 premium visual refinement** beyond making both themes correct. No
  new visual language was designed.
- **Part 5 illustration audit** — `GarmentFigure`, `FaceFigure`,
  `ReferenceImage`, `LookComposition` were not reviewed or improved. A bob and
  a long layered cut may still share an illustration; that remains unverified
  either way.
- **Part 6 per-screen accessibility audit** — shared controls (swatches, chips,
  onboarding selections, progress) carry labels, ticks and states from earlier
  work. The per-screen walk of Look Builder, Color Studio, the body
  questionnaire and the passport was **not** done.
- **Part 7 performance measurement** — the table above is test and API counts,
  not runtime measurement. **No startup time, frame rate, render count or
  memory figure was taken**, because no device or profiler was available here.
  None is reported.
- **Part 8 settings matrix** — not walked control by control.
- **Part 14 device testing** — neither emulator nor physical device.

### Labels

| Label | State |
|---|---|
| LOCAL VERIFIED | **Yes** — backend 456, mobile 355 / 24 suites, tsc and ESLint clean |
| STAGING VERIFIED | n/a — no staging environment |
| PRODUCTION VERIFIED | **Yes** — privacy 29/29, Phase 5 journey 22/22, onboarding 23/24 (one checker bug), `/health` and `/health/db` 200 |
| ANDROID BUILD VERIFIED | **Yes** — build `28702cc2-10ef-4e02-b5fa-f65d1faa429f` FINISHED from `cb13c25`. APK: https://expo.dev/artifacts/eas/O5XsgZKH7XkW2dpU9pz4pHjIaBQW0laF3ggMIUJZmWs.apk |
| ANDROID EMULATOR VERIFIED | **No** |
| ANDROID PHYSICAL DEVICE VERIFIED | **No** |
| LEGAL REVIEW COMPLETE | **No** |

### Launch blockers

1. No device or emulator testing has ever been performed.
2. No independent legal review.
3. The illustration quality question is **open** — not audited.
4. No runtime performance figure exists for this application on any device.
5. S3 deletion unexercised; no bucket configured.
6. `GET /passport` transient **unresolved**.
