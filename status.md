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

## Verified State (2026-08-27)
- Backend: **129/129 pytest passing** (was 126; +3 firebase_auth unit tests)
- Mobile: **tsc 0 errors**
- Auth: Firebase ID token (email/password + Google) + internal JWT fallback
- Storage: AWS S3 (boto3 singleton client)
- AI cost: Gemini/Groq only — no OpenAI dependency

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
