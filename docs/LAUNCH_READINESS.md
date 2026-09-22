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
| Account deletion | **Done, not deployed** | 22 backend tests; commit `6885e84` |
| Data export | **Done, not deployed** | 22 backend tests; commit `6885e84` |
| Photograph retention and deletion | **Done, not deployed** | 22 backend tests; commit `6885e84` |
| Photograph consent that does something | **Done, not deployed** | withdrawal deletes kept photos |
| Authentication | Done | Firebase ID token, local JWT fallback |
| User-data isolation | Partly verified | privacy routes tested cross-user; wider audit outstanding |
| Onboarding redesign | **Not started** | — |
| UX consistency audit | **Not started** | — |
| Visual refinement | **Not started** | — |
| Accessibility audit | **Not started** | — |
| Settings completion | Partly | Privacy and Delete account added; Help is a single screen |
| Legal documents | **Not started** | no Privacy Policy or Terms in the app |
| Performance measurement | Partly | cold start ~41s measured; in-app timings not measured |
| Production API | Live | `58c70a7` behaviour, `/health` and `/health/db` 200 |
| Database | `0006` live, `0007` written | `0007` is not applied to production yet |
| Android build | FINISHED | `8cacce00-11b3-4237-8ee1-c98f4ac5ec5f` |
| Physical-device testing | **Not performed** | — |

---

## Verification labels, as they actually stand

| label | status |
|---|---|
| LOCAL VERIFIED | **Yes** — backend 429 passed, mobile 122 across 16 suites, `tsc` clean, ESLint clean |
| STAGING VERIFIED | **Not verified** — no Docker daemon on this workstation |
| PRODUCTION VERIFIED | **Yes, for the currently deployed commit.** The privacy work in `6885e84` is *not* deployed |
| ANDROID BUILD VERIFIED | **Yes** — installs, launches, process survives; API base URL correct |
| ANDROID EMULATOR VERIFIED | **No** — the emulator booted and installed the APK, but its own launcher and System UI went unresponsive under software rendering and `com.google.android.gms` crashed on its own dex. Nothing about the app's screens was observed |
| ANDROID PHYSICAL DEVICE VERIFIED | **No** — no physical device has run this build |

---

## Blockers

### 1. Migration 0007 is not applied to production — deliberately

The privacy features need two columns and one nullability change. Pushing the
branch would deploy them, because Render runs `alembic upgrade head` on
container start. The Phase 6 brief says not to modify the production database
schema, so the push is held rather than made quietly.

What 0007 does on Postgres, rendered offline without touching a database:

```sql
BEGIN;
ALTER TABLE analyses ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE analyses ADD COLUMN photo_deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_settings ADD COLUMN photo_retention_consent BOOLEAN DEFAULT false NOT NULL;
COMMIT;
```

Three plain ALTERs in one transaction. No table rewrite, nothing dropped, no
existing row invalidated. It is about as small as a schema change gets — but it
is still a schema change, and the instruction was explicit, so it waits for a
decision rather than being applied as a side effect of a push.

**Until it is deployed, account deletion and data export do not exist for real
users.** That is the single largest launch blocker.

### 2. No physical-device testing

The manual checklist is in `RELEASE_VERIFICATION.md`. No amount of API testing
substitutes for it.

### 3. No legal documents in the app

There is no Privacy Policy and no Terms of Service reachable from a screen.
The retention wording now used in the app (`privacy_service.RETENTION_NOTE`)
is written to match what the code does and is the right starting text, but it
is not a policy and has had no legal review.

### 4. Onboarding, UX, visual and accessibility work not started

P1 items. Deliberately left until the P0 privacy work was finished and tested,
per the brief's own ordering.

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
