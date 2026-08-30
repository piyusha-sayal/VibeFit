# VibeFit — Status

## Concept
AI personal stylist app. Analyzes face, hair, body, color from photos → gives
styling recs (hairstyles, necklines, glasses, makeup, outfit fit). NOT a
beauty-scoring app — no attractiveness ratings, no good/bad labels. Answers
"what suits me" not "what's wrong with me."

Monetization (planned): free tier (limited scans), premium full report,
affiliate fashion links, subscription AI stylist.

## Core Structure

```
VibeFit/
├── backend/     FastAPI + Postgres + Redis (dockerized)
├── mobile/      Expo / React Native app
├── docs/        roadmap + improvements logs
├── UI/          design refs
└── docker-compose.yml
```

### Backend (`backend/`)
- `api/routes/` — analysis, auth, chat, user
- `ml/` — analyzers: face_analysis, hair_analysis, skin_analysis, quality,
  feature_analysis, overlay (all MediaPipe + OpenCV, offline/free)
- `rules/` — deterministic face_shape → style guidance engine (works with
  zero AI keys; LLM only rephrases/personalizes on top)
- `services/` — analysis_service (orchestrates ML pipeline), ai_service
  (Gemini/Groq text layer, no OpenAI), report_service (PDF), card_service
  (summary PNG), aggregate (multi-photo), progress, cache_service
- `core/` — config, database, firebase_auth, redis, security
- `models/`, `schemas/` — SQLAlchemy models + Pydantic contracts
- `alembic/` — migrations (1 so far: skin_analysis + quality columns)
- `tests/` — 97 tests incl. real ML-pipeline + UAT end-to-end

### Mobile (`mobile/app/`)
- `(auth)/` — login, register, onboarding
- `(tabs)/` — index, scan, results, chat
- `analysis/` — body, hair, makeup, wardrobe, accessories, facial-canon
- `services/api.ts` — snake↔camel + envelope bridge to backend
- `services/reportService.ts` — PDF/card/overlay download+share

## Analysis Pipeline (Layer model)
1. **Detection** — MediaPipe facial landmarks + pose, OpenCV color sampling
2. **Feature mapping** — raw landmarks → face shape, symmetry, undertone,
   contrast, body proportions, hair texture
3. **Rules engine** — deterministic shape/undertone → styling guidance dict
4. **LLM layer** (optional) — Gemini/Groq rephrases + personalizes rule
   output in natural language; app fully functional without it

## Feature Status (F1–F13, roadmap) — all 🟢 done
Skin analysis, feature scoring, annotated overlay, eyebrow mapping, PDF
report, shareable summary card, pose-quality gate, posture read, body
proportion guidance, multi-photo aggregate, per-metric quality flags,
image-hash caching, progress tracking.

## Verified State (2026-08-28)
- Backend: **145/145 pytest passing** (was 129). Suite runtime 142s → 38s once
  Redis connection timeouts were gone.
- Deployment surface: **Render + Neon only** (+ optional Cloudflare R2)
- Database: **Neon Postgres 18.6 live**, `alembic upgrade head` applied, all 9
  tables + `alembic_version` at `0002_profile_plan`
- Mobile: **tsc 0 errors**, `expo export --platform ios` exit 0
- Auth: Firebase ID token (email/password + Google) + internal JWT fallback
- Storage: AWS S3 (boto3 singleton client)
- AI cost: Gemini/Groq only — no OpenAI dependency

## Deployment readiness (2026-08-28)

Decision: **keep the Python backend, don't port ML on-device.** Sized the port
first — `feature_analysis` (197 LOC), `overlay` (65), `body_analysis` (150) and
the whole `rules/` layer (~490) port trivially, but `skin_analysis` (236),
`hair_analysis` (118), `quality` and `color_analysis` need `cv2.Laplacian`
convolutions, `cv2.kmeans` and LAB/HSV conversions (~574 LOC), thresholds are
tuned to MediaPipe's 468-landmark indices, mobile has zero ML packages (would
force EAS dev builds, leaving Expo Go), and LLM keys can't ship in a bundle.
Revisit only if on-device privacy becomes a product differentiator.

Instead: host the backend, and stop its availability gating the UX.

- **Git repo initialized.** Root `.gitignore` excludes both `.env` files —
  verified with `git check-ignore` before the first `git add`. No remote yet.
- **Security fix**: `backend/.env.example` held a populated `SECRET_KEY`
  byte-identical to the live `backend/.env`, and that value was a weak
  placeholder containing dictionary words. It signs internal JWTs and was
  committed. Key rotated to a 64-char random token; example blanked. Caught
  before any push — nothing left the machine.
- **`CacheService` degrades instead of failing** (`services/cache_service.py`).
  It sat on the hot path of `_run_ml` with no error handling, so an unreachable
  Redis turned every scan into a 500. Reads now return `None`, writes no-op.
  Redis is now genuinely optional to deploy.
- **Analysis is asynchronous.** `create_and_analyze` split into `create_pending`
  + `run_pending`/`run_pending_multi`; `POST /analysis/upload` returns a
  `processing` row immediately and schedules the ML pipeline via
  `BackgroundTasks`. Reuses the existing `_run_ml`/`_finalize` helpers unchanged.
  Rows stuck `processing` past 10 min are reported `failed` (`_is_stale_processing`).
- **Session factory is injectable** (`core/database.py: get_session_factory`).
  The background job can't reuse the request session (`get_db` commits and
  closes on response); hardcoding `AsyncSessionLocal` made background work
  bypass the test DB override entirely. Now a dependency, overridden in conftest.
- **Mobile polls + caches.** `analysisStore.upload` polls `getAnalysis(id)` every
  2s (3 min ceiling) holding the existing `isAnalyzing` state, so the scan
  animation covers the wait. `services/localCache.ts` persists the last complete
  analysis and hydrates the store synchronously at startup, so home / Vibe
  Profile paint instantly even with the backend asleep.
  MMKV is loaded **lazily behind try/catch** — it is a JSI module absent from
  Expo Go, so eager construction would crash the current test workflow; it falls
  back to an in-memory store there.
- `backend/README.md` carries HF Space frontmatter (`sdk: docker`,
  `app_port: 8000`) and the `git subtree push --prefix=backend` recipe, since a
  Space needs the Dockerfile at its root.
- `docs/ENVIRONMENT.md` documents every backend + mobile env key.

### Simplified to Render + Neon (2026-08-28)

Hugging Face now gates the Docker SDK behind a paid plan, so Spaces is out.
Retargeted to Render free tier — and **measured** the memory rather than
assuming it: peak RSS through all 7 analyzers is **~212 MB** (197 MB of that is
imports) against the 512 MB limit. The RAM worry that originally ruled Render
out was wrong. Keep one uvicorn worker; each extra costs another ~200 MB.

- **Redis removed entirely.** `core/redis.py` deleted, lifespan hook dropped,
  `REDIS_URL` gone from config, `redis[hiredis]` out of requirements. The only
  consumer was image-hash reuse in `_run_ml`, so `CacheService` is now an
  in-process TTL + LRU cache (capped at 128 entries — results embed 468
  landmarks each, and this runs in a 512 MB container). One fewer service, and
  the test suite went 142s → 38s because it had been waiting on Redis timeouts.
- **Storage is S3-compatible, pointed at Cloudflare R2.** Added
  `S3_ENDPOINT_URL` + `S3_PUBLIC_BASE_URL` (R2's public URL is unrelated to its
  API endpoint, unlike S3's). Upload now runs off the event loop via
  `asyncio.to_thread` and is non-fatal on failure — storage is not on the
  critical path, so a scan never fails because the bucket is down. With no
  credentials, photos are analyzed in memory and never retained.
- `Dockerfile` CMD is shell form so `${PORT:-8000}` expands — Render injects
  `$PORT` and exec form would have passed the literal string.
- `render.yaml` Blueprint added; every secret is `sync: false`.
- `docker-compose.yml` no longer runs Redis.

Deployment is now: **Render (compute) + Neon (Postgres)**, with R2 optional.
GitHub is not required — Render can deploy from its own git remote or the CLI.

### Migration chain was broken (fixed 2026-08-28)

Found while running the first real `alembic upgrade head` against Neon:
`0001_baseline` called `Base.metadata.create_all()` with **no table filter**, so
it created whatever the models defined *at that moment* — including the four
tables `0002_profile_plan` owns. `0002` therefore always died with
`DuplicateTableError`. The chain had been broken since `0002` was written and
was never exercised: `conftest.py` builds schema with `create_all()` directly
and never invokes alembic, so it first failed at deploy time. Prior status.md
wrongly reported migrations as healthy.

Fix: `0001` now creates an explicit frozen `BASELINE_TABLES` tuple (users,
analyses, recommendations, chat_sessions, chat_messages). A migration is a
snapshot of history, not a live mirror of the models — the old form meant every
future model would break the chain the same way.

`tests/test_migrations.py` now runs `upgrade head` + `downgrade base` against a
scratch SQLite DB, and asserts `0001` never lists a later revision's tables.
Verified red/green: reverting `0001` reproduces `table onboarding_responses
already exists`. Its fixture restores the session event loop, since alembic's
`env.py` calls `asyncio.run()` and would otherwise leave no current loop and
break every async test after it.

**Not done — needs your accounts:** creating the HF Space, setting Space secrets,
and pointing `EXPO_PUBLIC_API_URL` at the Space. Neon is live and migrated.

## Login fix (2026-08-27)
Mobile login/register/Google-sign-in UI was already fully built and mobile's
Firebase config was already fully populated — but the backend could not
verify any of those tokens, so every authenticated request 401'd regardless
of which login method was used:
- `firebase-admin` was in `requirements.txt` but **never actually installed**
  in the venv.
- Installing it pulled in `google-cloud-firestore`/`google-api-core`, whose
  current releases require `protobuf>=6.33.5` — directly conflicting with
  `mediapipe==0.10.14`'s hard `protobuf<5` pin (the facial-scan pipeline).
  Forcing a resolution either way breaks one of the two features.

Fix: `core/firebase_auth.py` rewritten to verify Firebase ID tokens with the
lightweight `google-auth` package (`google.oauth2.id_token.verify_firebase_token`
— public-key JWT verification over HTTPS) instead of the full firebase-admin
SDK. No firestore/storage/grpc pulled in, no protobuf conflict, and no
service-account JSON file needed — just the public Firebase **project id**.
`requirements.txt`: `firebase-admin==6.5.0` → `google-auth==2.53.0`.
`core/config.py`: `firebase_credentials_file` → `firebase_project_id`.
Added `tests/test_firebase_auth.py` coverage for the new verifier directly
(disabled-without-project-id, bad-token-rejected, claims-mapped).

**One manual step left** (blocked from editing `.env` directly — by design):
add `FIREBASE_PROJECT_ID=vibefit-a897e` to `backend/.env` to match the value
already in `mobile/.env`'s `EXPO_PUBLIC_FIREBASE_PROJECT_ID`. Not a secret —
it's already public in the mobile bundle and in every ID token's `aud` claim.

Google Sign-In: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is set in `mobile/.env`
(web/Expo-Go OAuth flow works). `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and
`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` are empty — fine for Expo Go/web
testing, but a native EAS build will need those added when that's next.

## Vertical Slice: Goal-first onboarding → Vibe Profile → Action Plan
Status: **done, backend + mobile wired end to end**.

- Backend (already present from a prior session): `models/profile.py`
  (OnboardingResponse, ProfileCorrection, PlanAction, ActionFeedback),
  `schemas/profile.py`, `schemas/plan.py`, `services/profile_service.py`,
  `services/plan_service.py` + deterministic `action_plan_engine`,
  routes `api/routes/profile.py` (`/profile/onboarding`, `/profile/vibe`,
  `/profile/corrections`) and `api/routes/plan.py` (`/plan`,
  `/plan/{id}/feedback`), migration `0002_add_profile_and_plan.py`.
- Mobile (built this session — was entirely missing):
  - `types/index.ts`: `OnboardingAnswers`, `VibeProfile`, `VibeAttribute`,
    `ActionPlan`, `PlanAction`, `ActionFeedbackType`.
  - `services/profileService.ts`, `services/planService.ts`.
  - `app/(auth)/onboarding.tsx` rewritten from a 3-step marketing walkthrough
    into a real goal-first questionnaire (primary goal required, everything
    else skippable — budget, maintenance, time, style, hair texture,
    allergies/sensitivities, current routine, climate with explicit opt-in
    consent). Saves progress via upsert after each step.
  - `app/plan.tsx` — new Action Plan screen: goal, top 3 actions with why +
    confidence label + limitations, avoid/postpone list, save/done/not-for-me
    feedback buttons per action, check-in date.
  - `app/vibe-profile.tsx` — new Unified Vibe Profile screen: goal, areas of
    interest, onboarding/scan status, per-attribute cards showing value,
    confidence, source-derived explanation, limitations, and a tap-to-correct
    flow that posts to `/profile/corrections` (original scan value preserved,
    shown alongside the correction — provenance not overwritten).
  - Home screen (`(tabs)/index.tsx`) gained a "Your Plan" entry point in both
    empty and populated states; root `_layout.tsx` registers `plan` and
    `vibe-profile` as stack screens.

## Repairs made this session
- **Attractiveness scoring removed from the consumer UI**
  (`app/analysis/facial-canon.tsx`): the screen rendered a "/10 Overall"
  score, per-feature 0–10 bars (eyes/lips/jawline/etc — literal beauty
  ratings), and a "Golden Ratio" score tile. This directly violated the
  product's "never rate attractiveness" rule. Replaced with a neutral face
  shape display and unscored proportion labels; the geometric measurement
  code in `backend/ml/feature_analysis.py` is untouched (still useful input
  to styling rules), only the scored/ranked presentation was removed.
- **21 zero-byte junk files** at `backend/` and `mobile/` root (e.g.
  `list[Analysis]`, `MAX_IMAGE_BYTES`, `dict[str`, `{,-`) — leftovers from a
  broken shell heredoc in a prior session, not real code, unreferenced.
  Confirmed empty, confirmed with user, deleted.
- Stale expo-router typed-routes file (`mobile/.expo/types/router.d.ts`,
  checked into the repo) didn't include the new `/plan` and `/vibe-profile`
  routes, breaking `tsc`. Added the missing entries.

## Open Risks
- **No git repo** — no version control on the project
- `.env` key population not verified (which of Gemini/Groq/Firebase/AWS are
  actually filled vs blank)
- No hosting/deploy target chosen yet for Postgres+Redis stack
- Action Plan and Vibe Profile screens not manually tested against a running
  Expo app / live backend this session (tsc + backend pytest verified only;
  no device/simulator smoke test was run)
- Vibe Profile correction UI accepts free text only — no per-attribute input
  widgets (e.g. re-picking a face shape from a list) yet
- `mobile/.expo/types/router.d.ts` is a generated file checked into git and
  now hand-edited; a real `expo start` run will regenerate it correctly, but
  until then any other route added by hand needs the same manual patch

## Recommended next slice
Product/routine compatibility checker → outcome tracking → shopping/item
checks (per prior product direction). Do not start until this slice has a
real device/simulator smoke test.

## Deployed (2026-08-30)

Live at **https://vibefit-api-awx9.onrender.com** (Render free tier, Docker,
one uvicorn worker, bound on port 10000). Render appends a random suffix to
the service name from `render.yaml`, so the host is `vibefit-api-awx9`, not
`vibefit-api`.

Verified against the running service, not just the build log:
- `/health` → 200
- `/openapi.json` → all 24 paths registered
- `POST /api/v1/auth/register` → 201, `POST /auth/login` → JWT,
  `GET /auth/me` → 200 reading the row back. Neon, auth and JWT signing all
  confirmed working in production, which `/health` alone does not prove.

First request after idle takes ~50s: the free plan sleeps after 15 minutes
and the ML imports are heavy. The mobile app's local cache covers this for
home/Vibe Profile; a first scan of the day will feel slow.

### Three dependency drifts the first deploys exposed
`requirements.txt` had diverged from the dev venv, so 145 green tests were
passing against an environment the image never reproduces.

- **`email-validator` missing** — `schemas/auth.py` uses pydantic `EmailStr`,
  which resolves email-validator at *import* time. The venv happened to have
  it; a clean image did not. This is what killed the first deploy.
- **`numpy` undeclared** — `ml/` imports it directly but only ever received
  it transitively via opencv/mediapipe. Same bug, not yet triggered.
- **`httpx` pinned wrong** — file said 0.28.1, venv had 0.27.0. httpx 0.28
  dropped `AsyncClient(app=...)`; 21 tests fail against the declared pin.
  Pinned down to 0.27.0 — httpx is test-only here, present at runtime only as
  a transitive dep of groq (`httpx<1,>=0.23.0`).

**Guard against the class:** build a venv from `requirements.txt` alone and
import `main` / run the suite. The dev venv is a superset of the image, so it
structurally cannot catch a missing declaration. Clean venv now: 145 passed.

### Deployment caveats
- **Repo is PUBLIC**, temporarily. Render's GitHub App repo picker would not
  list the repo (a known Render bug), so the service was created from a public
  Git URL instead. Flipping back to private will likely break auto-deploy,
  since nothing but the public URL links Render to the repo.
- `.env` files are gitignored and were never in history; the weak SECRET_KEY
  noted above was rotated before `git init`, so it never entered any commit.
- One smoke-test user (`claude-smoketest-*@example.com`) exists in the
  production database from the verification above.
- Optional env vars are all unset: no Gemini/Groq key (rules engine serves
  everything), no R2 (photos analyzed in memory, `local://` placeholder).
- Local Docker never verified the image — Docker Desktop's WSL distro is
  broken (`WSL_E_USER_NOT_FOUND`). Render's build is the only one that has run.
