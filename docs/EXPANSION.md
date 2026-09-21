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


## Phase 4 — Discover My Style, brand integration, visual system

### The brand conflict, and what was decided
The supplied kit is branded **MyLookFit**, not VibeFit: `brand-colors.json`
says so, and every wordmark spells it. That was reported before any asset was
touched. The decision was to rename the app, so the kit is used in full.

What did **not** change, deliberately: the EAS slug (`vibefit`), the Android
package `com.vibefit.app`, the URL scheme, and the API host. Those are tied to
the existing build project and every installed copy; renaming them is a
separate job with real breakage risk.

Theme tokens now come from the kit: `#080808` ground, `#1E1E1E` surface,
`#FAF7EE` ivory. The dark gold is the kit's champagne `#F1D9A7` rather than
its rich gold `#D4AF37`, which reads dull as UI text on near-black.

### Body styling stays questionnaire-only
Unchanged and permanent. No body photographs, no measurement from a selfie, no
inference of body type from anything. "Not sure" and "prefer not to
categorise" are first-class answers that fall back to stated preferences, and
every section can be skipped.

Body type orders results and changes the explanation. It never hides a
garment — asserted by a test that counts the library for every body type.

### One library, two traditions
54 garments across all 14 categories. Sarees, lehengas, anarkalis, sharara and
gharara sets, sherwanis, Nehru jackets and dhoti trousers sit beside blazers,
jeans, trench coats and athleisure. Region tags describe a garment's
tradition, never a prediction about the reader: both traditions are offered to
everyone by default, and stating a preference reorders rather than filters.

### The visual system
Original vector artwork, bundled with the app. No hotlinked images, nothing
licensed from elsewhere, nothing that can fail to load.

Representation is an input, not an accident: six skin tones spanning a genuinely
wide range and four hair textures, assigned deterministically per item so a
list of hairstyles shows a spread rather than one appearance repeated. Tested
as a product property.

`ReferenceImage` fixes the aspect ratio, shows a loading state and falls back
to an illustration, so an image failure degrades a card instead of breaking a
screen. Adding photography later is a change to one prop.

### Cold start, honestly
The request timeout moved to 90s, which covers the 62.5s measured cold start.
**This does not fix the cold start.** The server is still asleep and the first
request still waits; the change stops the app failing a request that would have
succeeded, and a banner now explains the wait.

Retries are limited to idempotent methods and to network errors or 502/503/504.
A POST or PATCH is never retried, so a save cannot become a duplicate saved
look or goal.

### Known gaps after this phase
- The `GET /passport` transient is still not root-caused. The Phase 3
  diagnostics remain in place; Render logs are still unread from here.
- The cold start itself is unchanged.
- The visual system is vector illustration. There is no photography, and
  everything is labelled as inspiration rather than a predicted result.
- The EAS slug, Android package, URL scheme and API host still say vibefit.
- No physical-device testing has been performed by the assistant.

---

## Phase 5 — Create My Look

The flagship. Everything the other four experiences produce is composed into
one coordinated look that the user can then take apart and rebuild.

### Composition, not a second recommender
`rules/look_composer.py` calls the engines that already exist and owns none of
their knowledge: `outfit_rules` for garments, `hair_rules` for cuts and colour,
`makeup_rules` for looks, `accessories_rules` for jewellery, `outfit_colors`
for harmony. Deterministic throughout — no AI call, no network, no per-request
cost, nothing new that is paid for.

### Flexible outfit structures
A saree is a drape plus a blouse. Jeans are a top plus a bottom. A dress is one
piece. `rules/look_structures.py` models fourteen structures with their own
slots rather than forcing all of them through one top-and-bottom schema, which
is why a lehenga carries a dupatta slot that a shirt-and-trouser look simply
does not have. Every `garment_keys` entry resolves against the existing
54-garment library — asserted by a test, so a structure can never name a
garment that is not there.

When an occasion filter would empty a required slot it is dropped for that slot
alone: a saree blouse is not tagged "wedding" in its own right, and an outfit
that cannot be completed is worse than a companion piece chosen without a tag.

### Three levels, none of them required
A user with no colour analysis, no face scan and no questionnaire still gets a
complete, coherent look. It is explained by the occasion, and the explanation
says so. A missing palette produces an empty palette and a prompt, never an
invented swatch; there is no lipstick suggestion and no hair colour suggestion
without a season to reason from.

Individual attributes can also be left out of one particular look. Excluding a
colour analysis affects that look only; the stored profile is untouched and the
next look sees it again.

### Explanations name their basis
Every explanation carries one of `personal_colour`, `face_shape`, `preference`,
`occasion` or `general`, and the UI prints the basis in words. An occasion
default can therefore never be presented as personal analysis. Nothing frames a
recommendation as a judgement about how anyone looks.

### Replacing one component leaves the rest alone
`apply_selection` returns a new composition with exactly one component changed.
A parametrised test asserts that after a hair swap the outfit, makeup,
jewellery, accessories and lipstick are byte-identical, and vice versa. The
smart variations — more casual, more formal, softer or bolder makeup, new
colours, another hairstyle — preserve everything they do not name; a formality
shift keeps the user's own hair, makeup and jewellery.

A variation with nowhere to go says so instead of silently returning the same
look.

### Persistence
Migration `0006_create_my_look` is additive only: one nullable column on
`saved_looks` plus a unique constraint scoped to `(user_id, client_token)`, and
two new tables. Nothing is dropped, altered or moved, and no existing saved
look, collection or user row is read or rewritten. Batch mode is used so the
constraint can be added under SQLite in tests as well as under Postgres in
production; the downgrade removes exactly what the upgrade adds.

- **Drafts** live in their own table. A draft is not something the user kept,
  and counting unfinished work as "saved looks" would misreport the Passport.
- **Saving and duplicating are idempotent** on a client token, so a request
  replayed after a slow network returns the look already saved.
- **Feedback** is one upserted row per item. A rejected item is demoted in
  future recommendations and never removed from the library.

Saved looks are `SavedLook` rows of kind `complete` — the Passport's existing
store. There is no second saved-items system.

### Reopening a saved look
A garment or cut the catalogue has since lost is reported as unavailable and
the stored selection is kept verbatim. It is never silently swapped for
something else: that would rewrite a decision the user made. A look saved
before Phase 5 opens read-only rather than crashing.

### The builder
Nine independently replaceable components: outfit (per slot), outfit colours
(per slot), hairstyle, hair colour, makeup, lipstick, jewellery (metal,
earrings, necklace), hair accessories and footwear. Each opens a bottom sheet
of real alternatives with a love / not-my-style verdict beside each one.

Every edit posts the whole composition to the server, which recomposes and
hands the document back, so the styling rules are not re-implemented in the
client. That makes a composition server-owned data, and those requests opt out
of the client's snake_case conversion — it would otherwise rewrite the
document's inner keys and corrupt it silently.

One shared draft store: changing the hairstyle does not reset the outfit, and
opening another tab does not lose the work. It autosaves into a single draft
row updated in place. Editing a saved look is a separate mode that never
autosaves and rewrites that look on save; duplicating is a deliberate action.

### Visual composition
The existing vector system, extended rather than replaced — `GarmentFigure` for
the outfit, `FaceFigure` for hair and makeup, the real palette for the colours.
The stage is labelled "styling illustration — not a photograph or a try-on" on
the screen itself. There is no photography, no virtual try-on and no body
photograph anywhere in this phase.

### Accessories
Necklaces were added to the accessories library and are ordered against the
neckline a structure presents, with "no necklace" always available as an
option rather than an omission. Traditional Indian pieces surface when the
*outfit* is traditional — never because of anything about the person.

### Completion, reconciled
The Beauty Passport counts attributes; the style questionnaire counts answers.
They were two different numbers both labelled "completion", which is why a
journey could show 0.33 on one screen and 0.31 on another. Both payloads now
carry a `completionOf` label and both screens print it.

### Known gaps after this phase
- The `GET /passport` transient is still not root-caused. Render logs remain
  unreadable from here.
- The cold start is unchanged at roughly 62s. The 90s timeout and the waking
  banner remain; neither makes the server faster.
- The visual system is still illustration. No photography, no try-on.
- The EAS slug, Android package, URL scheme and API host still say vibefit.
- No physical-device testing has been performed by the assistant.

## Incident: production API unreachable after the Phase 5 deploy (2026-09-21)

**Status: unresolved.** The root cause has not been confirmed. What follows is
the evidence, not a conclusion.

### What happened
`0264fb3` was pushed at about 14:05 local. The API at
`https://vibefit-api-awx9.onrender.com` has not answered an HTTP request since.
Probes at 14:44, and again across the following hours, all end the same way:
TCP and TLS complete, the request is written, and nothing comes back.

```
/health      code=000 ttfb=0.000000 total=90.017513
/health/db   code=000 ttfb=0.000000 total=90.004202
/            code=000 ttfb=0.000000 total=90.004498
```

`ttfb=0` matters. Not one byte of a response header arrives. This is not a slow
response; it is no response.

### What the evidence rules out

**The container started, and it reached the database.** A read-only
`alembic current` against the production database reports
`0006_create_my_look (head)`. Migration 0006 ships with `0264fb3` and has never
been run from a workstation. Something on Render ran `start.sh` far enough to
complete `alembic upgrade head`. That disposes of "the build never finished"
and "the migration hung".

**The database is healthy and fast.** Three consecutive `alembic current` runs
against production took 3327 ms, 2739 ms and 3130 ms end to end, Python
interpreter startup included. Neon is not asleep and is not the thing being
waited on.

**The migration is not destructive.** Rendered offline against a Postgres
dialect, 0006 emits two plain `ALTER TABLE`s, two `CREATE TABLE`s and two
`CREATE INDEX`es. No table is recreated and nothing is dropped.

**The image inputs did not change.** `git diff --name-only c6b97f4..0264fb3`
over `requirements.txt`, `requirements-dev.txt`, `Dockerfile` and `start.sh` is
empty. Phase 5 added no dependency.

**The application is not slower to start.** Importing `main` under the same
interpreter and the same production-shaped environment:

| commit | import | modules | routes |
|---|---|---|---|
| `c6b97f4` last known good | 6.24 s | 2129 | 83 |
| `0264fb3` deployed | 5.96 s | 2133 | 106 |

Phase 5 costs four modules and adds 23 routes. It does not cost start-up time.

**The app has no start-up hook that could hang.** `main.py` registers no
`lifespan` and no `on_event`. `/health` returns a literal dict and touches
nothing.

**The edge knows the service.** This is the sharpest piece of evidence:

| request | result |
|---|---|
| `https://` on an unknown `*.onrender.com` host | `404` in 0.34 s, `x-render-routing: no-server` |
| `http://` on the real host | `301` to `https://`, served instantly by the edge |
| `https://` on the real host | nothing, for 300 s |

The router resolves the hostname and answers at the edge in milliseconds. When
it forwards to the origin, the origin never replies — and no previous
deployment answers either.

### What that leaves
The service exists and is routed; its instance accepts forwarded connections
and never responds. That is a Render-side instance state. It is not visible
from a workstation and it did not reproduce locally: the same commit, the same
migration and the same `uvicorn main:app` command serve `/health` and pass all
21 journey checks against a local instance.

Root cause remains **unresolved**, and will remain so until the service logs
are read.

### The exact information needed to close this
From the Render dashboard, service `vibefit-api`:

1. The **Events** tab — the deploy triggered by `0264fb3`: its status, and
   whether it was ever promoted to live.
2. Whether the **commit** Render shows for the live deploy is `0264fb3` or an
   earlier one.
3. The **deploy log** tail — specifically whether `Applying database
   migrations...` and `Starting API on port ...` were both printed, and what
   follows the second line.
4. The **restart count** since the deploy, which separates a crash loop from a
   single stuck instance.
5. Any `Out of memory` or `Exited with status` line in the log.
6. Whether the **health check** at `/health` ever passed after the deploy.
7. The **Metrics** tab — memory and CPU at the time of the deploy, against the
   512 MB limit.

Items 3, 4 and 5 are the ones that decide it. A screenshot or a paste of the
log tail is enough; no key needs to be shared to obtain them.

### What was deliberately not done
No migration was downgraded. No production data was written or deleted. Neon
was not reset, the service was not recreated, and no paid plan was purchased.
The only production access used was one read-only query for the schema version.

### The structural risk this exposed
`start.sh` runs `set -e`, then `alembic upgrade head`, then `exec uvicorn`.
Nothing is served until the migration returns. That is correct for a
single-instance deploy, and the migration was not the culprit here, but it does
mean any future failure between those two lines presents identically to this
one: a port that never opens and an edge that hangs. The log line after
`Starting API on port ...` is the only thing that distinguishes them, which is
why item 3 above is the deciding question rather than a formality.
