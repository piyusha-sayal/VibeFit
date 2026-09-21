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
| 1 | Shared beauty-profile spine, persistence, navigation, home redesign, design system | landed |
| 2 | Discover My Colors — 12-season engine, report, explorers | landed |
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

## 4. Production migration (applied 2026-09-21)

`0003_beauty_passport` is live on Neon. Verified before and after:

| | before | after |
|---|---|---|
| alembic_version | 0002_profile_plan | 0003_beauty_passport |
| tables | 10 | 18 |
| users | 6 | 6 |
| analyses | 4 | 4 |

The revision is additive: eight `CREATE TABLE`s, no `ALTER`, no `DROP`, no data
touched. A `--sql` dry run was inspected before applying.

**Recovery:** Neon point-in-time restore covers the window, and
`alembic downgrade 0002_profile_plan` drops only the eight new tables — no
pre-existing table is in the revision's blast radius.

**Repeatable from here:** the image no longer starts uvicorn directly.
`backend/start.sh` runs `alembic upgrade head` and then execs uvicorn, so a
deploy migrates itself. `upgrade head` is a no-op once the schema is current.
This is safe with the single worker this plan runs; if the service is ever
scaled to multiple instances, move the migration to a Render pre-deploy command
so two containers cannot race the `alembic_version` row.

## 5. Phase 1 and 2 — mobile (landed 2026-09-21)

### Design system
`constants/theme.ts` holds one token set in two themes: warm ivory ground,
charcoal ink, and blush / peach / lavender / sage / gold used on small areas
rather than as washes. `theme/ThemeProvider.tsx` resolves light / dark / system,
honours the OS reduce-motion setting, and persists both to the device so the
first paint after launch is already correct. Settings mirrors the choice to the
backend, which is what makes it follow the account.

`components/ds/` carries the primitives — Txt, Card, Button, Chip, Swatch,
SectionHeader, ProgressBar, and Loading / Empty / Error states as components,
because every data screen owes the user all three.

The legacy gold-on-near-black palette in `constants/colors.ts` still backs the
older analysis screens. Those migrate screen by screen in Phase 3 rather than in
one sweep that would break working surfaces.

### Navigation
Five experiences, one route each: Home, Discover, Create, Passport, More. The
scan, results and chat routes are unchanged, so existing links and deep links
keep working; they are reached from Home, Discover and More instead of owning a
tab.

### What is genuinely functional
- **Home** reads the passport: hero copy, recommendations, journey counters and
  timeline are all real. A missing attribute renders as its completion action.
  Tools that do not exist yet carry `available: false` and are filtered out
  rather than shipped as dead buttons.
- **Colour Studio**: report, palette, lipstick, blush, eyeshadow, hair colour,
  jewellery, clothing and the outfit matcher, plus the twelve-season browser.
  Every explorer compares two swatches side by side and saves a real SavedLook.
- **Passport**: attributes, saved looks (status changes, deletion), goals and
  the activity timeline, all persisted.
- **Discover My Style**: the questionnaire, body type (including "Not sure" and
  "Rather not"), and the wardrobe library.
- **Settings**: theme, reduce motion, country, photo-reuse consent, sign out.
- **Academy**: six guides with real bodies, and device-local completion.

### Confidence, stated honestly
The report turns the engine's confidence into words — "reasonably confident",
"a working estimate", "a loose estimate" — rather than a decimal. A selfie
cannot support "83.4%". Reports built from pre-engine analyses say on screen
that depth and clarity were estimated rather than measured.

### Colour maths, not AI
`utils/colorHarmony.ts` classifies a pair of colours with HSL geometry. Three
bugs in it were caught by its own tests: HSL saturation alone called ivory a
colour (#f2ece3 reports s = 0.37 at l = 0.92), so neutrality now uses chroma;
20° of hue separation was classified monochrome rather than analogous; and
together those made a colour-on-neutral pair read as analogous.

### Known gaps after Phase 2
- Guide progress was device-local. Phase 3 moved it to the account.
- The older analysis screens still use the legacy dark palette.
- Account deletion and data export are specified but not built.

## Phase 3 — Discover My Face, Hair, Makeup, Accessories

### What is measured, what is derived, and what is asked
The honest split drives the whole phase:

| Attribute | Source | Why |
| --- | --- | --- |
| Face shape | measured | Nine categories from four landmark ratios. |
| Brow shape | measured | The brow landmarks already produce an arch position. |
| Facial contrast | derived | Read from the colour analysis that already ran. |
| Eye shape | self-select | No reliable landmark rule separates hooded from deep-set at selfie resolution. |
| Lip shape | self-select | Lip width is measured; the balance between the two lips, which technique depends on, is not. |
| Cheek contour | self-select | Photographic lighting moves apparent cheek contour more than the cheek does. |

Guided self-selection was chosen over a paid vision provider, per the standing
constraint that no new paid dependency ships without approval — and because a
fabricated classification is worse than an honest question.

### The nine-shape classifier
`classify_face_shape` returns shape, the closest alternative, a confidence and
the four ratios behind the call. Bad landmarks return **no shape** rather than
the old silent fallback to "oval". Confidence is rendered in words, never as a
decimal.

### One face profile, three studios
`services/face_service.studio_context()` is the single source Hair, Makeup and
Accessories personalise from, so they cannot drift apart. A user's own
selection always wins for recommendations, and the scan reading is kept beside
it rather than overwritten — overrides reuse the existing append-only
`profile_corrections` table with a `face.` key prefix.

### Libraries
- 29 haircuts, 8 fringes, 14 hair colours, 4 partings, plus a salon script per
  cut. Braids, twists, locs and coily-specific cuts are first-class entries;
  Korean-inspired cuts are 2 of 29. Filters exclude; face shape only reorders.
- 14 makeup aesthetics with technique keyed to confirmed attributes, and colour
  drawn from the season engine rather than a second palette.
- Accessories include jhumkas, chandbalis and ear chains alongside Western
  forms. Nothing is filtered away by face shape — an accessory is the cheapest
  thing in styling to simply try.

Foundation guidance names undertone and depth families and explicitly refuses
to match an exact shade: that needs real skin in real light.

### Guide progress on the account
`guide_progress` gained resume state in migration 0004 (additive, two nullable
columns). Endpoints are owner-scoped on every read and write. Sync is additive
only: a device never tells the server to forget something.

### Diagnostics
Every response now carries `X-Request-ID`. The request log records method, the
route *template*, status and duration — never a filled path, user id, email,
token, header or body. `/health/db` proves the database is reachable separately
from the app being up.

### Known gaps after this phase
- The `GET /passport` transient is **not** root-caused. 48/48 clean on a warm
  production instance (25 sequential, 15 concurrent, 8 interleaved). The new
  diagnostics exist to catch the next occurrence; `pool_recycle` is a
  mitigation for the most plausible class of cause, not a proven fix.
- A cold start from sleep measures 62s. A client timeout shorter than that will
  fail on the first request after idle. Not asserted to be the cause above.
- Hairstyle and makeup libraries are text and swatches. There is no photo
  library and no hairstyle visualisation; the disclaimer says so wherever a
  cut is shown.
- The legacy analysis screens (hair, makeup, accessories, facial-canon) still
  work and are still reachable. They are deliberately not deleted.
- No physical-device testing has been performed by the assistant.
