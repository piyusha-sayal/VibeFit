# VibeFit expansion — audit, gap analysis, phase status

Living document. Each phase records what shipped, what it preserved, and what
is genuinely left. A feature counts as done only when it persists real data and
has a passing test.

## 1. Audit of the existing app (2026-09-21)

| Area | What exists today |
|---|---|
| Backend | FastAPI, async SQLAlchemy, Postgres (Neon), Alembic at `0002_profile_plan`, 24 routes, in-process cache keyed by image SHA-256 |
| Auth | Firebase ID-token verification (`core/firebase_auth.py`, no service-account file) plus a legacy email/password JWT path; anonymous guest sign-in behind `EXPO_PUBLIC_ENABLE_GUEST_LOGIN` |
| Vision/ML | MediaPipe + OpenCV, offline and free: `face_analysis`, `color_analysis`, `hair_analysis`, `body_analysis`, `skin_analysis`, `feature_analysis`, `quality`, `overlay` |
| Rules | `rules/face_shape_rules.py` (9 face shapes → hair/neckline/glasses/earrings/makeup), `body_guidance.py`, `action_plan_engine.py` |
| AI text | `services/ai_service.py` — Gemini/Groq, both optional; **no key set in production**, so the rules engine serves every recommendation today |
| Tables | users, analyses, recommendations, chat_sessions, chat_messages, onboarding_responses, profile_corrections, plan_actions, action_feedback |
| Mobile | Expo SDK 54 / RN 0.81, expo-router, zustand + React Query, 4 tabs (index, scan, results, chat), detail screens for body/hair/makeup/wardrobe/accessories/facial-canon, plan, vibe-profile |
| Design | Dark, gold-accented theme in `constants/colors.ts`; no light mode |
| Tests | 157 backend (pytest), 14 mobile (jest); both green |
| Deploy | Render free tier (Docker, one uvicorn worker); EAS `preview` profile builds the internal APK |

## 2. Gap analysis against the specification

**Keep as-is:** auth, upload/analysis pipeline, hash cache, quality gate, PDF
report, summary card, chat, action plan, face-shape rules (they already cover
the 9 shapes the spec asks for), onboarding questionnaire (it already collects
climate, maintenance tolerance, modesty preference, style preferences).

**Extend:** colour analysis (today: undertone + contrast + one 6-swatch palette
— no season system at all), face analysis (no eye/brow/lip/cheek modules),
recommendations (no occasion or look-level composition), home screen, navigation.

**Build new:** 12-season colour engine and report, colour explorers, Hair Studio
catalogue, Makeup Studio, questionnaire-driven body styling, Create My Look,
Beauty Passport, collections, goals, activity timeline, Academy, Settings,
light/dark theming, shareable passport.

**Flagged conflict — body photographs.** The spec forbids requesting, storing or
analysing body photographs. `ml/body_analysis.py` derives shoulder/hip ratios
from pose landmarks in the *same selfie* the user already uploaded; no separate
body photo is ever requested. Resolution: Discover My Style is driven entirely
by the questionnaire and a self-selected body type, and never by pose-derived
numbers. The existing module stays for the current Body screen so nothing
regresses, and is not wired into any new styling surface.

## 3. Phase plan and status

| Phase | Scope | Status |
|---|---|---|
| 1 | Shared beauty-profile spine, persistence, navigation, home redesign, design system | backend landed; mobile pending |
| 2 | Discover My Colors — 12-season engine, report, explorers | engine + API landed; screens pending |
| 3 | Discover My Face — eye/brow/lip/cheek, Hair Studio, Makeup Studio, accessories | not started |
| 4 | Discover My Style — questionnaire, global + Indian fashion library | not started |
| 5 | Create My Look | not started |
| 6 | Beauty Passport, collections, journey, goals | not started |
| 7 | Academy, Settings, privacy, accessibility, polish | not started |

### Phase 1 — persistence spine (backend landed, 2026-09-21)
- `models/beauty.py` + migration `0003_beauty_passport`: beauty_profiles,
  saved_looks, look_collections, collection_items, beauty_goals,
  beauty_activities, guide_progress, user_settings. Nothing existing altered.
- Deliberately **not** duplicated: climate, maintenance tolerance, modesty
  preference, style preferences and budget stay in `onboarding_responses` and
  are read from there by the passport.
- `services/passport_service.py` aggregates the passport. An attribute with no
  data comes back as `missing` with the action that fills it — never a
  placeholder value.
- `api/routes/passport.py`: passport, styling profile (partial upsert), saved
  looks (list/create/patch/delete, owner-scoped), goals, settings. Saving a
  look, trying a look, starting a profile and completing a goal each append one
  real timeline entry; nothing is seeded.
- Body type is self-selected, including `unsure` and `uncategorised`. No body
  photograph is requested anywhere in this path.

### Phase 2 — colour engine (landed)
- `rules/color_palettes.py`: the twelve seasons with clothing, lipstick, blush,
  eyeshadow, hair-colour and metal palettes, plus Indian and global garment notes.
- `rules/color_season.py`: deterministic classification from undertone, depth,
  chroma and contrast, with an explicit confidence and a stated limitation when
  the photo's lighting cannot support a firm call.
- No AI call, no paid service: pure data and arithmetic over values the existing
  MediaPipe/OpenCV pass already produces.
