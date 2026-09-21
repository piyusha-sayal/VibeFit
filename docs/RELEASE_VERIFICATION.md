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

## DEVICE VERIFIED

**Claim:** a human installed the build on a physical Android device and used it.

Only a person can claim this label. An assistant cannot, and an emulator does
not earn it.

Record with the claim: the EAS build id, the `gitCommitHash` that build reports,
the device model, and the Android version.

Device verification depends on **PRODUCTION VERIFIED** — the APK talks to the
production host. Attempting it while production is down tests nothing.

---

## Recording a release

State each label, and state plainly which ones were not earned and why. An
unearned label is written as *not verified*, never left blank and never rolled
into a neighbouring pass.

### Current release

| Label | Status |
|---|---|
| LOCAL VERIFIED | Yes — backend 399 tests, mobile 117, tsc and lint clean |
| STAGING VERIFIED | **Not verified** — no Docker daemon available on this workstation |
| PRODUCTION VERIFIED | Yes, `58c70a7` — `/health` and `/health/db` both 200 from the real host, `x-render-origin-server: uvicorn`, migration `0006`, journey 21/21 |
| DEVICE VERIFIED | **Not verified** — no physical device testing has been performed |

Build under verification:

| field | value |
|---|---|
| EAS build | `8cacce00-11b3-4237-8ee1-c98f4ac5ec5f` |
| status | FINISHED |
| artifact | `https://expo.dev/artifacts/eas/JH4CJ_Ot404Ok3AfbnnWxPWRGoS7FkYAPQjiycWXcG8.apk` |
| source commit | `b064dfe` (local only — **not pushed**) |
| profile / distribution | `preview` / INTERNAL |
| package | `com.vibefit.app`, version 1.0.0 (1) |
| Expo SDK | 54.0.0 |

Note the mismatch worth knowing about: the APK was built from `b064dfe`, which
exists only on this workstation. The deployed backend is `0264fb3`. The three
commits between them are documentation only, so the APK's application code
matches the deployed backend — but "the build's commit is not on the remote" is
the kind of fact that is cheap to record now and expensive to reconstruct later.

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
