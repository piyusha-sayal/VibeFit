# MyLookFit — product quality audit

22 September 2026. Findings from opening the components, not from reading
their interfaces. Where something was not inspected, it says so.

---

## 1. The four visual components

| Component | Lines | What it actually draws |
|---|---|---|
| `GarmentFigure` | 90 | An abstract croquis — head, neck, limbs, no features — with one filled path for the garment |
| `FaceFigure` | 126 | A face ellipse, hair mass, brows, eyes, lips, with makeup zones highlighted in an accent colour |
| `ReferenceImage` | 96 | A wrapper: fixed aspect ratio, loading state, fallback on error, caption |
| `LookComposition` | 225 | Labelled tiles — garment, colours, Hair / Makeup / Jewellery — each with a value |

`ReferenceImage` and `LookComposition` were **already sound**. `ReferenceImage`
falls back to an illustration when a source is missing or errors, so no screen
depends on a network image, and it carries `INSPIRATION_NOTE` — "Reference
illustrations, not a prediction of your own result." `LookComposition` is
structured and labelled, not a heap of icons.

The defects were all in the two figures.

---

## 2. Hairstyles — the measured finding

`FaceFigure` had **three** hair outlines (`short`, `medium`, `long`). The
backend library has **29 haircuts**. Texture varied only an edge squiggle,
which cannot separate a crew cut from a French bob.

| Length | Cuts sharing one drawing |
|---|---|
| short | **12** — pixie, bob, french_bob, blunt_bob, layered_bob, textured_crop, crew_cut, fade, undercut, two_block, buzz_cut, tapered_coils |
| medium | **9** — lob, shoulder_layers, shag, wolf_cut, butterfly_cut, hush_cut, medium_curls, twists, box_braids |
| long | **8** — long_layers, face_framing, long_curls, u_cut, v_cut, straight_cut, locs, medium_flow |

So the brief's questions, answered as they stood:

- Bob vs long layers — **different** (medium vs long)
- Pixie vs textured crop — **identical**
- Butterfly cut vs blunt cut — **identical**
- Bangs variants — **not drawn at all**. The front hairline was one fixed path,
  and `app/hair/bangs.tsx` had no illustration of any kind: eight fringes
  described in words only, on the one screen whose entire job is showing what a
  fringe looks like.
- Curly and coily — represented as an **edge squiggle only**, not as volume

### Fixed

Eight silhouettes — `cropped`, `rounded`, `blunt`, `layered`, `voluminous`,
`tapered`, `braided`, `flowing` — mapped per cut and scaled by length. Eight
fringes drawn over the forehead as their own layer, and the fringe finder now
shows each one beside its description.

**What still shares a drawing, stated rather than hidden:** buzz cut, crew cut
and pixie. They are the same shape at different lengths. A test asserts that
list exactly, so if a fourth cut ever collapses into it, the suite says so.

Labels now read "schematic illustration".

---

## 3. Makeup

`EMPHASIS` already varied *which zones* were highlighted per aesthetic, which
is real differentiation. Two things it could not show:

- **Blush placement was one fixed pair of circles** at (42, 72) and (78, 72).
  Every placement looked identical — the one question a blush screen exists to
  answer.
- **Eyeliner had no representation at all.**

### Fixed

Four placements that sit in genuinely different places (`apples`, `cheekbone`,
`draped`, `sunburst`) and five liner shapes (`tightline`, `winged`, `graphic`,
`smudged`, none), mapped per aesthetic — so a Korean gradient sits on the
apples and full glam runs along the bone, and smokey is soft and wide where
editorial is sharp.

---

## 4. Garments

`GarmentFigure` had 15 real shapes behind 20 names — five were aliases.
The larger finding: **no Indian garment had a shape**. Saree, lehenga, kurta
and anarkali all fell through to `straight`, which is a Western shift dress.
A library that draws a saree as a shift is not covering both wardrobes,
whatever its item list says.

### Fixed

Thirteen outlines added: saree (pleats and pallu), lehenga (blouse, midriff,
flared skirt), kurta (tunic over narrow trousers), anarkali, sharara, dhoti,
sherwani, plus blazer, skirt, outerwear, shirt, trousers and dress.

---

## 5. Settings — the functionality matrix

| Control | Stored where | Persists | Result |
|---|---|---|---|
| Sign out | — | n/a | Works; clears cached analysis and onboarding resolution |
| Delete account | `/privacy/delete-account` | n/a | Works; production-verified 29/29 |
| Country / region | `user_settings.country` | Yes, on blur | Works |
| Styling preferences | routes to `/style` | n/a | Navigates; target exists |
| Theme light/dark/system | `user_settings.theme` + provider | Yes | Works |
| Reduced motion | `user_settings.reduced_motion` | Yes | Works |
| **Reuse my photo** | `user_settings.photo_reuse_consent` | Yes | **DEFECT — fixed, see below** |
| Photograph retention | `/privacy/consent` | Yes | Correctly refused (409) with reason shown |
| Photograph deletion | `/privacy/photos` | n/a | Works |
| Data export | `/privacy/export` | n/a | Works |
| Privacy policy / Terms | `constants/legal.ts` | n/a | Works; both reachable |
| Photo guidelines and FAQ | `/settings/help` | n/a | Navigates; target exists |

### The defect

`PATCH /passport/settings` wrote `photo_reuse_consent` **straight onto the
row**. `PATCH /privacy/consent` refuses to let reuse exceed retention, and
refuses retention outright when there is no object storage. Two routes, one
setting, one of them enforcing nothing — so the settings screen could put the
app into precisely the state the privacy work exists to prevent: reuse
reported as on while no photograph is kept anywhere.

Fixed: the route delegates to `privacy_service.set_consent` and returns 409
where that refuses. The switch now reads what is in effect and is disabled
with a reason when nothing can be stored.

**Two existing tests asserted the bypass.** They were wrong rather than
redundant, so they were corrected to the real contract and carry a comment
saying what they used to claim. Neither was deleted.

---

## 6. What was not done

- **Per-screen accessibility walk** of Look Builder's bottom sheets, the
  Personal Color Studio comparison view and the body questionnaire's opt-out
  controls. Shared components carry labels, roles, states, ticks and minimum
  touch targets; the screen-level walk did not happen.
- **TalkBack verification** — nothing here was tested with a screen reader.
  Static analysis cannot establish screen-reader usability, and this audit does
  not claim it.
- **Runtime performance measurement** — no startup time, frame rate, render
  count or memory figure was taken, because no device or profiler was available
  in this environment. None is reported.
- **Whether the new drawings are any good.** The tests prove different styles
  resolve to different path data. Whether the `blunt` outline reads as a blunt
  bob to a person needs eyes on a screen, and stays unverified until someone
  looks.

---

# Visual acceptance — 22 September 2026

## How the shapes were actually looked at

React Native cannot render in this environment and no SVG rasteriser is
installed. So the path strings were read **out of the TypeScript source** —
not retyped — parsed (M/L/Q/Z, quadratics flattened) and filled with PIL, then
printed as text grids at roughly 60×40 so the geometry could be inspected
directly.

This shows the geometry, not the app: no theme colours, no strokes, no
layering. It is enough to answer the question the tests cannot — *does a bob
look like a bob* — and not enough to sign off typography, colour or spacing.
Those still need a device.

## Hair — accepted, with one correction

| Style | Silhouette | Verdict |
|---|---|---|
| Buzz cut, crew cut, pixie | `cropped` | Sits above the ear, nothing below. Reads as short. **All three identical**, as documented |
| Bob | `rounded` | Curved mass to the jaw. Distinct |
| Blunt bob | `blunt` | **Was a defect** — see below |
| Long layers, shag, wolf cut | `layered` | Stepped edges clearly visible |
| Butterfly cut, curls, coils | `voluminous` | Width well away from the head |
| Box braids, twists, locs | `braided` | Sections clearly divided |
| V-cut, face-framing, fade | `tapered` | Narrows to a visible point |

**Defect found and fixed:** `blunt` was square across the crown as well as the
bottom (`M26 30 L26 96 L94 96 L94 30 ...`). Rendered, it read as a helmet or a
box rather than a haircut. Now rounded over the crown and hard along the
bottom, which is what makes a blunt bob blunt.

## Indian garments — two defects found and fixed

| Garment | Verdict |
|---|---|
| Lehenga | **Accepted** — cropped blouse, visible midriff gap, full flared skirt |
| Kurta | **Accepted** — long straight tunic with two narrow legs below; the legs are what stop it reading as a Western shift |
| Anarkali | **Accepted** — fitted to a high waist then a much wider flare than the kurta |
| Dhoti | **Accepted** — tapers to a point between the legs |
| Sherwani | Accepted — long straight coat |
| **Saree** | **FAILED, now fixed** |
| **Sharara** | **FAILED, now fixed** |

**Saree.** The pleats were written as zero-width lines (`M56 96 L56 176`)
inside a fill-only path, so they did not render at all, and the pallu merged
into the body. Rendered, a saree was an undifferentiated column —
indistinguishable from a straight dress, which is the exact failure the
previous fix was supposed to correct. The pleats are now filled wedges and the
pallu is a separate panel with a visible gap.

**Sharara.** The two legs met again one pixel below the split, so it rendered
as an ordinary flared skirt. The split now runs the full length.

Both were only visible by rendering. Neither the type checker, the tests, nor
reading the path strings would have caught them — the tests asserted the paths
*differed*, and they did.

## What visual acceptance still does not cover

- Colour, contrast and typography in either theme
- How the figures look at real size on a phone screen
- Whether the labels sit correctly beside them
- Look composition on a real mobile viewport
- Makeup diagrams were inspected as data only; the blush zones and liner paths
  are provably distinct, but were not rendered

---

# Per-screen accessibility and Settings — 22 September 2026

## The finding that mattered

`accessibilityLiveRegion` appeared **zero times across 79 screens**.

Every error banner, every loading label and the Look Builder's own
"Draft saved" line was visible text that a screen reader never spoke. The
half of the audience that cannot see the change was the half never told about
it. Part 7's questions "whether the selection changed" and "whether the look
was saved" had no answer at all for a screen reader user.

Fixed in the shared components, which is the right lever for a defect of this
shape — one change reaches every screen:

| Component | Change |
|---|---|
| `ErrorState` | `accessibilityLiveRegion="assertive"` + `role="alert"` — an error is the one thing worth interrupting for |
| `LoadingState` | `accessibilityLiveRegion="polite"` and its label attached; `role="progressbar"` alone announced nothing useful |
| `EmptyState` | title marked as a heading so it can be navigated to |
| `Txt` | optional `live` prop, `polite` or `assertive` |
| Look Builder | status line and "Updating the look…" now announce |

`components/ds/announce.test.ts` pins all of it.

## What was already correct

The audit is not all bad news, and it would be dishonest to imply otherwise.

| Screen / component | State |
|---|---|
| `ComponentSheet` (Look Builder) | `accessibilityViewIsModal`, `onRequestClose`, labelled close control, header role — **a screen reader user can understand and leave the sheet** |
| `OptionRow` | `role="button"`, `accessibilityState={{ selected }}`, named label — which alternative is selected is conveyed |
| `ComponentRow` | Change control labelled with the component it edits ("Change hair") |
| `Swatch` | name + hex label, tick mark, `MIN_TOUCH` floor, hint — selection is not colour alone |
| `Chip` | tick as well as tint, selected state |
| Onboarding | progress bar with "Step 3 of 5", skip hint, labelled select cards |

## Settings — verified against production, not by reading handlers

14/14 with a disposable account that deleted itself:

| Control | Persistence | Verified |
|---|---|---|
| Theme (light/dark/system) | `user_settings.theme` | Written, re-read in a fresh request |
| Reduced motion | `user_settings.reduced_motion` | Written and re-read |
| Country / region | `user_settings.country` | Written and re-read |
| Language | `user_settings.language` | Written and re-read |
| Invalid theme | — | **422, and the stored value is unchanged** |
| Photograph retention | `/privacy/consent` | **409**, correctly refused |
| Photograph reuse | via `privacy_service` | Cannot be granted — bypass closed |
| Photograph deletion | `/privacy/photos` | 200 |
| Data export | `/privacy/export` | 1243-byte document, `Content-Disposition` present, **no password hash** |
| Profile | `/auth/me` | Correct account |
| Account deletion | `/privacy/delete-account` | 200, and access **401** afterwards |

## Still device-dependent, and not claimed

- **TalkBack.** Nothing here was tested with a screen reader. A live region
  attribute is necessary, not sufficient — whether Android announces it at the
  right moment needs a real TalkBack session.
- **Text scaling.** No layout was observed at a large font size.
- **Touch targets in practice.** `MIN_TOUCH` is applied in shared components;
  whether every screen honours it at real density is unobserved.
- **Focus order.** Cannot be established without a device.
- **Runtime performance.** No measurement of any kind was taken this session.
