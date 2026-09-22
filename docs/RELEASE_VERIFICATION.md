# Release verification

A release is verified at four levels. They are separate claims about separate
things, and a pass at one level says nothing about the others. There is no
combined "PASS" — a release is described by which of the four labels it has
earned, and which it has not.

The failure this guards against is real: Phase 5 passed all 21 journey checks
against a local instance running the deployed commit and the deployed
migration, and the production API was unreachable the whole time. A single
"PASS" would have hidden that. Four labels could not.

---

## LOCAL VERIFIED

**Claim:** the code is correct on a workstation.

- `cd backend && python -m pytest -q` — all pass
- `cd mobile && npx tsc --noEmit` — zero errors
- `cd mobile && npm run lint` — clean
- `cd mobile && npm test` — all pass

**Does not establish:** that the image builds, that migrations apply to
Postgres, or that anything is deployed.

---

## STAGING VERIFIED

**Claim:** the deployed artefact starts, in a container, against a real
database that is not production.

- `docker build -t vibefit-api backend/` succeeds
- The container is run with `PORT` set and a **non-production** `DATABASE_URL`
- `Applying database migrations...` and `Starting API on port ...` both appear
  in the container log, in that order
- `GET /health` returns 200 from the container
- `GET /health/db` returns 200 from the container

**Does not establish:** anything about the production service.

Run against a scratch database only. Never point this at production.

---

## PRODUCTION VERIFIED

**Claim:** the production host serves the commit that was pushed.

This label may only be claimed from requests made to the real production
origin. A local server running the same commit does not count, however faithful
the environment.

```
curl -s -o /dev/null -w "code=%{http_code} ttfb=%{time_starttransfer}\n" \
  --max-time 120 https://vibefit-api-awx9.onrender.com/health
```

- `/health` returns 200
- `/health/db` returns 200 with `"database": "reachable"`
- The Render dashboard shows the live deploy at the expected commit
- The journey script passes against the production base URL

Record the measured cold start with the result. The free plan sleeps after 15
minutes idle; a first request that takes ~60s is the plan, not a fault. A
request that returns **no bytes at all** is not a cold start, and must not be
recorded as one.

**Does not establish:** that the mobile app works.

---

## ANDROID BUILD VERIFIED

**Claim:** an APK exists, it was built from a known commit, and the backend it
talks to has not changed underneath it.

- The EAS build reports `status: FINISHED`
- Its `gitCommitHash` is recorded, and whether that commit is on the remote
- `EXPO_PUBLIC_API_URL` points at the production host
- Nothing in the backend's API surface changed after that commit — check with
  `git diff --name-only <build commit>..HEAD`, and say what did change
- The APK installs and its process survives launch

**Does not establish:** that a person can use the app. An emulator launch, even
a clean one, is evidence about the package, not about the experience.

---

## ANDROID DEVICE VERIFIED

**Claim:** a human installed the build on a physical Android device and used it.

Only a person can claim this label. An assistant cannot, and an emulator does
not earn it.

Record with the claim: the EAS build id, the `gitCommitHash` that build reports,
the device model, and the Android version.

This depends on **PRODUCTION VERIFIED** — the APK talks to the
production host. Attempting it while production is down tests nothing.

---

## Recording a release

State each label, and state plainly which ones were not earned and why. An
unearned label is written as *not verified*, never left blank and never rolled
into a neighbouring pass.

### Current release

| Label | Status |
|---|---|
| LOCAL VERIFIED | **Yes** — backend 407 passed (incl. 8 startup config tests), mobile 117 passed across 15 suites, `tsc --noEmit` clean, ESLint clean |
| STAGING VERIFIED | **Not verified** — no Docker daemon on this workstation, so the image was never run as a container |
| PRODUCTION VERIFIED | **Yes**, behaviour consistent with `58c70a7` — see below |
| ANDROID BUILD VERIFIED | **Yes** — build FINISHED, installs, launches, process survives; API base URL correct; no API-surface change since the build commit |
| ANDROID DEVICE VERIFIED | **Not verified** — no physical device testing has been performed |

**PRODUCTION VERIFIED, in detail.** Measured against
`https://vibefit-api-awx9.onrender.com`:

| check | result |
|---|---|
| `/health` first request (asleep) | 200, 41.6s — free-plan cold start |
| `/health` × 5 sequential | all 200, median 260 ms |
| `/health` × 4 concurrent | all 200, 267–491 ms |
| `/health` after 45s idle | 200, 273 ms |
| `/health/db` | 200, `"database": "reachable"`, 1434 ms |
| origin header | `x-render-origin-server: uvicorn` |
| Alembic version | `0006_create_my_look` |
| Phase 5 tables and constraint | `look_drafts`, `look_feedback`, `saved_looks.client_token`, `uq_look_client_token_per_user` all present |
| user data | 23 users, 8 saved looks, 0 orphans — counts only, nothing written |
| five flagship experiences | 26 / 26 endpoint checks |
| Phase 5 journey | **22 / 22**, including reauthentication and re-read |
| passport reliability, 30 bounded requests | 30 / 30, avg 1866 ms, max 3704 ms — **not reproduced during this verification** |

**One caveat, kept separate from the HTTP results.** Which commit Render is
actually running could not be read: there is no `RENDER_API_KEY` and no
authenticated dashboard session on this workstation. The host answers, the
origin header names uvicorn, and the behaviour matches `58c70a7` — but that is
inference from HTTP, not a reading of Render's own deploy record. Pushing a
commit is not proof it was deployed, and this row is written as inference for
that reason.

Build under verification:

| field | value |
|---|---|
| EAS build | `8cacce00-11b3-4237-8ee1-c98f4ac5ec5f` |
| status | FINISHED |
| artifact | `https://expo.dev/artifacts/eas/JH4CJ_Ot404Ok3AfbnnWxPWRGoS7FkYAPQjiycWXcG8.apk` |
| source commit | `b064dfe` — now on `origin/main` as an ancestor of `9e9285c` |
| profile / distribution | `preview` / INTERNAL |
| package | `com.vibefit.app`, version 1.0.0 (1) |
| Expo SDK | 54.0.0 |

`git diff --name-only b064dfe..HEAD` touches only `.claude/CLAUDE.md`,
`.gitignore`, `backend/Dockerfile`, `backend/requirements-dev.txt`,
`backend/start.sh`, `backend/tests/test_startup_command.py`, `docs/` and
`render.yaml` — deployment configuration, a test and documentation. No route,
schema or response shape changed after the build, and `git diff` over `mobile/`
is empty. The APK does not need rebuilding.

What the emulator run did and did not show: the APK installed on an x86_64
Android 15 emulator, `MainActivity` resumed, and the process stayed alive with
no `FATAL EXCEPTION` from `com.vibefit.app`. No UI-level verification was
obtained — under headless software rendering the emulator's own launcher and
System UI went unresponsive and `com.google.android.gms` crashed with a
`NoSuchFieldError` from its own bundled dex, none of which is this app. So the
package is sound and the experience is untested.

---

## Device testing checklist

For whoever performs DEVICE VERIFIED. Confirm production answers `/health`
first; none of this is meaningful otherwise.

1. Install the APK. It launches without a crash.
2. Sign in. The session survives a force-quit and relaunch.
3. Open Create My Look with an empty profile. Looks are offered, no colours are
   invented, and the missing-analysis prompt names what is missing.
4. Swap one garment. Hair, makeup and jewellery are unchanged.
5. Leave the builder mid-edit and return. The draft is where it was left.
6. Save a look. Kill the app during the save and retry the same save. Exactly
   one look exists afterwards.
7. Duplicate a saved look. The original is untouched.
8. Compare two looks side by side.
9. Open the Beauty Passport. The saved look appears in the recent list and in
   the timeline.
10. Put the device on a slow or flaky connection and repeat step 6. The app
    reports the failure; it does not silently duplicate.

Record the device model and Android version with the outcome of each step.

---

## Onboarding: what to check before a release

Six states, and the first four are the ones that break silently.

1. **New account.** Register → the welcome screen appears. It must not be
   possible to reach the home screen first, even briefly.
2. **Returning account.** Sign out, sign back in → the home screen, with no
   onboarding. Force-quit and relaunch → the home screen, immediately.
3. **Partially completed.** Start onboarding, choose interests, force-quit at
   screen 3 → relaunching returns to onboarding with those interests still
   selected.
4. **Offline launch.** Turn off the network and launch while signed in → the
   home screen, never onboarding. Classifying a returning user as new is the
   failure this guards against.
5. **Skipped everything.** Welcome → Skip → Skip → Skip → Explore. The home
   screen must still be useful, and all five experiences present.
6. **Second account on the same device.** Sign out, register a different
   account → onboarding appears for the new one. The completion flag is per
   account.

Also check that selection is legible in greyscale: every selected chip and
interest card carries a tick, not only a tint.

---

## The two audits that run on every suite

`theme/layout.test.ts` and `theme/routes.test.ts` replace two checks that used
to be done by reading code. Run them before a release; a failure in either is a
real break, not a style opinion.

- A layout failing means a screen will change background colour mid-navigation
  in light mode.
- A route failing means a button somewhere does nothing when pressed.

---

## Android device-testing checklist

Nobody has run MyLookFit on a phone. Until someone does, this is the list.

**Install and launch**
1. APK installs on Android 10 or later without a Play Protect block.
2. Cold launch reaches a screen — splash does not hang.
3. App icon and name read **MyLookFit**.

**Account**
4. Register a new account; onboarding appears.
5. Complete onboarding; the home screen appears and does not bounce back.
6. Force-quit, relaunch: home screen, no onboarding, no logout.
7. Sign out and back in: home screen, no onboarding.

**The five experiences**
8. Discover My Colors — run an analysis, open the report, open a palette.
9. Discover My Face — face shape, then Hair Studio and Makeup Studio.
10. Discover My Style — decline body categorisation, browse garments.
11. Create My Look — generate, replace a component, compare, save.
12. Beauty Passport — attributes, saved looks, collections, goals, timeline.

**Settings and privacy**
13. Switch light / dark / system. **Every screen above must change with it** —
    this is what §4 changed, and it is the one thing only a device can confirm.
14. Turn on reduced motion; transitions stop.
15. Privacy: the retention switch is disabled with the reason shown.
16. Export data; the share sheet opens with JSON.
17. Delete a disposable account; access is revoked.

**Robustness**
18. Back navigation from every screen; nothing traps the user.
19. Android system text size at maximum: no clipped or overlapping text.
20. Aeroplane mode at launch: the home screen appears, not onboarding.
21. Slow network: loading states appear rather than blank screens.

**Watch for, and record with a screenshot**
Crashes · frozen screens · cut-off text · horizontal scrolling · wrong colours
for the chosen theme · buttons that do nothing · failed saves · unexpected
logout · lost drafts.
