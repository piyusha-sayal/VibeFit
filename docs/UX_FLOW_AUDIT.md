# MyLookFit — UX Flow Audit and Release Gate

Date: 2026-09-30. Scope: the redesigned mobile app (`mobile/`) after the seven
redesign streams were merged. Method: static code audit (routes, journeys,
states, accessibility) by three read-only reviewers, findings verified in code
before fixing, then fixes with tests. Nothing here was verified on a device.

Redesign commits audited: `57ea805` Home/Progress/Profile · `cb30412` Analyze ·
`67031c4` Passport + Colour · `6ebc8bc` Face/Hair/Accessories · `60ce7f4`
Makeup + Style · `71d2940` + `98b2cc4` Create My Look + secondary · `7eb0eab`
Settings/auth/legacy primitives. Foundation: `71bd994`.

---

## A. Route map

71 screen files. Tabs visible in the bar: Home, Progress, Analyze, Passport,
Profile. Screens pushed inside the tab group (not tabs): Create, Results,
Chat, More, Discover.

| Area | Routes | Entered from | Back |
|---|---|---|---|
| Entry | `/(auth)/welcome`, `login`, `register`, `forgot-password`, `onboarding` | `app/index.tsx` redirects by auth → lock → eligibility → onboarding state | stack back; onboarding has none (first step) |
| Tabs | `/(tabs)` Home, `progress`, `scan`, `passport`, `profile` | tab bar | none (tabs) |
| Pushed in tab group | `create`, `results`, `chat`, `more`, `discover` | Home tools, scan → results, Profile → More | BackBar / PageHeader |
| Analyze | `/camera` (modal) → `/(tabs)/results` | scan | camera closes to caller |
| Colour | `/colors`, `report`, `seasons`, `palette`, `lipstick`, `blush`, `eyeshadow`, `hair`, `clothing`, `outfit`, `jewellery` | Home Colours tile, Results "See your colours", Home recommendations | PageHeader (5 PaletteExplorer pages use legacy ScreenHeader) |
| Face | `/face`, `shape`, `features` | Home, Results, Passport face rows | PageHeader |
| Hair | `/hair`, `cuts`, `bangs`, `parting`, `colour`, `salon/[style]` | Home, Results, Home recommendation | PageHeader |
| Makeup | `/makeup`, `looks/[key]` | Home, Results | PageHeader |
| Accessories | `/accessories`, `[category]` (glasses, earrings, necklines, hair, metals) | Home secondary, Results | PageHeader |
| Style | `/style`, `aesthetics`, `body`, `silhouettes`, `colours`, `outfits`, `library`, `wardrobe`, `questionnaire` | Home, Create | PageHeader |
| Create My Look | `/look/new` → `builder` → `[id]`, `compare` | Create, Home hero, Passport looks | BackBar (added) |
| Content | `/academy`, `[slug]`, `/plan`, `/vibe-profile` | Home secondary, Profile | PageHeader |
| Settings | `/settings`, `account`, `privacy`, `help`, `legal`, `delete-account` | Passport, Profile | PageHeader |
| Legacy | `/analysis/hair`, `facial-canon` (linked from Discover/Academy); `makeup`, `accessories`, `wardrobe` (no entry point); `body` (redirect to `/style/body`) | — | PageHeader |

Route integrity: every literal route string resolves (`theme/routes.test.ts`,
`constants/navigation.test.ts`). Backend passport routes are now normalised
(`utils/appRoute.ts`) and tested. No dynamic route is pushed without its
param. No circular loops found.

## B. The ten journeys

| # | Journey | Result after fixes |
|---|---|---|
| A | New user: launch → register → 18+ → onboarding → Home | ~10 taps. Onboarding is short and skippable after step 1. Home now explains "nothing here is guessed" directly under the hero, before any catalogue; streak/level hidden until there is activity. Open: 18+ is asked after account creation. |
| B | Analyze: Home → scan → camera → quality → processing → results | 3–4 taps. Staged processing; ring no longer reads complete before the result. Results ends in one "Start here → See your colours" step, then the explore grid. Skin score removed. |
| C | Colours → season → palette → lipstick | 2–3 taps. Season hero first. Open: the same swatches appear on four screens. |
| D | Hair → cuts → style → salon card | 3 taps. Top cut now marked "Best match for you". Salon save confirms. |
| E | Makeup → recommended look → detail → save | 2–3 taps. "Picked for you" kept. Save now gives haptic + "View in Passport". |
| F | Style → questionnaire → aesthetic → silhouette → outfit | Variable; questionnaire sections are optional and autosave. Open: aesthetic is asked in onboarding, questionnaire and aesthetics screen. Body type is self-selected everywhere. |
| G | Create look → generate → replace → why → compare → save → reopen | ~8 taps. No engine vocabulary. Back control added on every step (was none). Strongest save moment in the app. |
| H | Passport empty / partial / complete | Known vs "Not yet discovered" clear. Next action is now the one primary button; section prompts secondary. Open: no "why completing matters" line. |
| I | Returning user | Session restore routes correctly; drafts surface in hero (before a colour scan) and in "Your recent work", which now sits above the studio tiles. Reopening mid-scan resumes polling. |
| J | Quick intents | Lipstick 1–2 taps, hairstyle 1–3 (recommendation now opens the real haircut finder), glasses 2, outfit 2+, complete look 1–2. |

## C. Tap / screen counts (from Home)

| Outcome | Taps |
|---|---|
| See colour season | 2 |
| Best lipstick | 1 (recommendation) / 2 |
| Find a haircut | 2 (list) / 3 (salon card) |
| Find glasses | 2 |
| Create complete look | 3 |
| Open saved look | 2 |
| Edit gender / age | 1 (in place on Profile) |
| Edit name | 2 |
| Delete photo / export data | 2 |
| Delete account | 3 |

Nothing common exceeds three pushes.

## D. Home clutter

Before: Greeting (streak + level for everyone) → Hero → biometric offer →
snapshot → 6 core tiles → 6 more tiles → Today → recent work → recommended →
inspiration → Academy → new-user explainer (last). Order was NEXT ACTION →
CATALOGUE → PERSONAL VALUE → CONTENT; a new user met 12 tool names before any
explanation.

After (`e0735e1`): Greeting (streak/level only once active) → Hero → new-user
explainer → snapshot → recent work → recommended → core tiles → more tiles →
biometric offer → Today → inspiration → Academy. That is NEXT ACTION →
PERSONAL VALUE → EXPLORE → CONTENT. Nothing removed.

Classification: CORE — hero, core tiles, recommended; SUPPORTING — snapshot,
recent work; ADVANCED — biometric offer, Today; CONTENT — inspiration, Academy.

## E. 12-tool hierarchy

| Tier | Tools |
|---|---|
| First-level (Home core cards) | Colours, Face, Hair, Makeup, Style, Create My Look |
| Secondary (Home list) | Accessories, Wardrobe, Discover, Academy, AI Stylist, Plan |
| Inside parent studio | Face features, Hair cuts/bangs/parting/colour, Makeup looks, Accessory categories, Style sub-areas |
| Contextual only | `/analysis/hair`, `/analysis/facial-canon` |

Kept as is: six equal core cards are justified by task scope; secondary tools
are visibly secondary.

## F. Duplicate experiences

| Pair | Verdict |
|---|---|
| Progress vs Passport vs Home snapshot | Same completion ring in three places. **Open (P2)**: Progress could link to Passport instead of repeating the checklist. |
| Results vs Passport | Different (one scan's reveal vs cumulative record). |
| Vibe Profile vs Passport | Near-duplicate; Vibe Profile shows confidence metadata and corrections. Profile labels it "Style preferences", colliding with Passport's Style section. **Open (P2)**. |
| Discover vs Home inspiration | Discover is mostly another entry point to studios. Acceptable. |
| Profile vs Settings vs More | Biometric toggle and Sign out on both Profile and Settings — intentional per the redesign brief; More is a secondary sitemap. |
| Plan vs Progress | Different (recommendation feed vs journey). |
| Wardrobe vs Style | Two entries, same screen. Fine. |
| `/analysis/*` vs studios | Legacy. `analysis/wardrobe` uses a hard-coded palette (**open P2**); `analysis/makeup|accessories|wardrobe` have no entry point (P3). |
| `colors/outfit` vs `style/colours` | Both answer "colours that go together". **Open (P3)**. |

## G. Context preservation

| Case | Finding |
|---|---|
| Look builder → component sheet → back | Draft kept (zustand store + 1.2 s server autosave). Killed within 1.2 s of an edit loses that edit. |
| Hair cuts → salon → back | Filters kept: the native stack keeps the list mounted under the pushed screen (reviewer's "lost" claim not reproduced in code). |
| Colours → lipstick → back | No selection concept to lose. |
| Style questionnaire leave/return | Server-saved per answer. Open (P2): height field needs its Save button. |
| Restart mid-onboarding | Draft persisted in AsyncStorage; resumes. |
| Restart mid-scan | **Fixed** (`cafe968`): resumes polling. |

## H. Interruptions

| Interruption | Handling |
|---|---|
| Render cold start / slow request | WakingScreen / WakingBanner, 90 s timeout, 2 retries on GET only. Good. |
| Offline | No proactive detection; failures now say "We couldn't reach MyLookFit. Check your connection" (was raw axios text). Open (P2): no global offline banner. |
| Expired auth | **Fixed**: 401 → one forced token refresh + retry; then "Your session has ended. Please sign in again." |
| Failed upload / poor photo / no face | Quality flags from `backend/ml/quality.py` shown as Lighting/Framing/Sharpness with retake. Scan error banner now says earlier results are unchanged. |
| Background / restart during analysis | **Fixed**: polling resumes. |
| Chat send fails | **Fixed**: banner, "nothing was lost", Try again resends. |

## I. Empty / loading / error states

- Empty states with a CTA: no analysis (results, colour pages, face shape, Home), no saved looks, compare, chat, academy not found.
- Open (P3): wardrobe, library and outfits filter-empty states have no "Clear filters" action; not-found states on accessory category, makeup look and salon rely on the header back.
- Loading: `LoadingState` (spinner + label) everywhere; `Skeleton`/`SkeletonCard` exist but are unused (P3).
- Analysis processing: named stages with real upload %; ring capped below full until the result (`3e8eb8a`).
- Errors: 28 screens render `ErrorState` with retry; raw technical text no longer leaks.

## J. Gamification

Supports rather than competes once placed correctly. Points and badges come
only from real actions; the daily quiz explains every answer. The problem was
placement: "🔥 0 · L1" sat above the hero for brand-new users. Now hidden until
there is activity; still on Profile chips and the Progress tab. Recommendation:
keep it on Progress and Profile, keep the Home pill small, and reframe the quiz
copy around learning rather than points (open, P3).

## K. Personalisation

Already strong: Makeup ("Picked for you", reasons per technique), Style
("Outfits for you"), Face/Accessories heroes, Create My Look explanations.

Added: "Best match for you" on the top face-shape-ordered haircut.

Open (data already on screen, no new feature): Home core tile subtitles could
name the known season / face shape; `hair/bangs` and `hair/parting` could name
the face shape; undertone/contrast chips on Results could reuse the one-line
definitions from `colors/report`.

## L. Issue matrix (counts)

| Severity | Found | Fixed | Open |
|---|---|---|---|
| P0 | 0 | 0 | 0 |
| P1 | 6 | 6 | 0 |
| P2 | 20 | 11 | 9 |
| P3 | 15 | 3 | 12 |

P1 (all fixed): Create My Look flow had no back control · Results showed a
skin score out of 100 · Results ended in a menu with no next step · Home put
the new-user explanation last · Chat failures vanished silently · App stuck on
"processing" after reopening mid-scan.

P2 fixed: tab bar lit Home on pushed screens · Create/Results/Chat had no back
· backend passport routes untested/unnormalised · 401 not refreshed · raw
error text · misleading scan "Try again" · Home section order · streak/level
for new users · Passport competing CTAs · makeup/salon save dead end ·
progress ring read complete before the result.

P2 open: completion ring repeated on Home/Progress/Passport · aesthetic asked
three times · undefined undertone/contrast chips on Results · Vibe Profile
naming vs Passport Style · `analysis/wardrobe` hard-coded palette · no global
offline banner · questionnaire height needs Save · no success confirmation on
most other mutations · 18+ asked after account creation.

P3 open: legacy ScreenHeader back unguarded on 5 palette pages · three orphan
`analysis/*` screens · unused `FloatingNav` · legacy `analysis/hair` and
`facial-canon` beside the studios · same swatches on four colour screens ·
Create screen's seven entry points · static Home tile subtitles · unused
`SMALL_TOOLS` · duplicated confidence dictionary in `plan`/`vibe-profile` ·
filter-empty states without "Clear filters" · Skeleton unused · quiz copy
framed around points.

## M. Fixes implemented

| Commit | Fix |
|---|---|
| `7e7f1b4` | Hair hub → Passport link resolved |
| `7020dba` | BackBar on look flow + Create; tab highlight only for owning tab; backend routes normalised + tested |
| `cafe968` | Resume polling after restart; chat error + resend + back; 401 refresh-and-retry; friendly error text; honest scan error banner |
| `e0735e1` | Home order and new-user explainer; streak/level wait for activity; no skin score; Results "Start here"; Passport primary next action; haircut best match; makeup/salon save feedback; auth link roles; GoldShimmer reduced motion |
| `3e8eb8a` | Processing ring capped until the result |

Regression tests added: `components/ds/TabBar.test.ts` (tab ownership),
`constants/navigation.test.ts` (every backend passport route resolves),
`store/analysisStore.test.ts` (resume polling), `services/apiErrors.test.ts`
(friendly errors, 401 refresh once), `components/analyze/skinWords.test.ts`
(no numeric skin score).

## N. Device-only questions

Static analysis cannot tell whether the app feels good. After each journey,
the owner should answer:

1. Did I know what to tap?
2. Was anything overwhelming?
3. Was I ever lost?
4. Did anything feel repetitive?
5. Did I understand the result?
6. Did I know what to do next?
7. Did the app respond immediately to my actions?
8. Was anything boring or too text-heavy?
9. Was anything unexpectedly fun or useful?
10. Would I voluntarily keep exploring?

Also check on the device: BackBar clears the status bar on your phone; Home
scroll length for a returning user; processing stage timing vs real analysis
time; TalkBack reading of selectable cards and banners; 200 % font scale on
Home, Results and Passport; light mode across the redesigned screens.
