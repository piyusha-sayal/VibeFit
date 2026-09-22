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
