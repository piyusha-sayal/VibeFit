# VibeFit — Feature Roadmap

Vision: complete face + body analysis, better than a generic chatbot, all in one
place, with a shareable report. Everything free / on-device (MediaPipe, OpenCV,
scikit-learn) + the existing rules engine. LLM (Gemini/Groq) only personalizes text.

**Status:** 🔴 not started · 🟡 in progress · 🟢 done

| # | Area | Feature | Impact | Effort | Free? | Status |
|---|------|---------|--------|--------|-------|--------|
| F1 | Face | **Skin analysis** — texture, evenness, redness, under-eye, oiliness zones | High | Med | ✅ | 🟢 |
| F2 | Face | **Feature scoring** — eyes/nose/lips/brows/jaw symmetry + proportion (fills unused `FacialFeatureScores`) | High | Med | ✅ | 🟢 |
| F3 | Face | **Annotated overlay** — thirds/fifths/golden-ratio drawn on the photo, returned to app | High | Med | ✅ | 🟢 |
| F4 | Face | **Eyebrow mapping** — ideal arch/start/end for the face | Med | Low | ✅ | 🟢 |
| F5 | Report | **PDF face report** — scores + season + skin + rules recs, shareable | High | Med | ✅ | 🟢 |
| F6 | Report | **Shareable summary card** — single-image social summary | Med | Low | ✅ | 🟢 |
| F7 | Body | **Pose-quality gate** — reject partial/bad photos before analyzing | High | Low | ✅ | 🟢 |
| F8 | Body | **Posture read** — shoulder tilt, head-forward | Med | Low | ✅ | 🟢 |
| F9 | Body | **Proportion → size/balance guidance** | Med | Med | ✅ | 🟢 |
| F10 | Engine | **Multi-photo aggregate** — average N angles for stabler scores | High | Med | ✅ | 🟢 |
| F11 | Engine | **Per-metric quality flags** — lighting/blur/angle confidence | High | Low | ✅ | 🟢 |
| F12 | Engine | **Image-hash caching** — skip recompute (uses existing cache_service) | Med | Low | ✅ | 🟢 |
| F13 | History | **Progress tracking** — trend deltas over time (DB already supports) | Med | Med | ✅ | 🟢 |

## Priority path
1. **F1 skin analysis** (building now) — clearest "better than ChatGPT" signal.
2. **F2 feature scoring** — fills already-defined-but-empty types; deepens face report.
3. **F5 PDF report** — ties F1+F2+existing color/rules into the shareable deliverable.
4. **F7 quality gate** — stops garbage-in/garbage-out, raises trust across all metrics.

## Notes
- Sensitive features (age/ethnicity/attractiveness ranking) intentionally **excluded** —
  bias/privacy risk, low value. Focus on actionable styling/grooming guidance.
- All scores ship with quality flags (F11) so the UI can show "low confidence — retake".

---

## F1 — Skin Analysis  🟢 done
Built `ml/skin_analysis.py` + `skin_analysis` JSON column/schema/type, wired into
`analysis_service` gather. 9 unit tests. Backend 44/44, mobile tsc clean.
**Migration note:** new `skin_analysis` column needs an Alembic migration (or
recreate dev DB); tests use create_all so they pass without one.

## F5 — PDF Face Report  🟢 done
`services/report_service.py` (reportlab, free/pure-Python) → branded PDF: facial
structure, color/season, skin, hair, recommendations. Endpoint
`GET /analysis/{id}/report` streams `application/pdf`. 4 tests; conftest now
overrides `get_cache` with in-memory fake (no Redis needed in tests). Backend 48/48.
**Mobile (done):** `expo-file-system` + `expo-sharing` installed; `services/reportService.ts`
downloads the auth'd PDF and opens the share sheet; "Download Face Report (PDF)"
button on the results screen. Note: SDK 54 — classic `downloadAsync`/`cacheDirectory`
imported from `expo-file-system/legacy`. mobile tsc clean.

**Outputs** (`ml/skin_analysis.py`, stored as `skin_analysis` JSON):
- `texture` (smooth / normal / textured) — local variance over cheek/forehead patches
- `evenness` (0-100) — tone uniformity across facial skin regions
- `redness` (low/med/high) — a*-channel (LAB) elevation in skin zones
- `under_eye` (bright/neutral/dark/puffy hint) — region luminance vs cheek
- `oiliness` (matte/normal/shiny zones) — specular-highlight ratio per T-zone/cheeks
- `concerns` — derived list (e.g. ["uneven tone", "under-eye darkness"])
- `quality` — {face_found, lighting_ok} so UI can prompt a retake

**Method:** MediaPipe FaceMesh regions → OpenCV LAB/HSV stats + Laplacian variance.
Deterministic, offline, free. No new heavy deps.

**Wiring:** new analyzer runs in `analysis_service` alongside face/color/hair/body;
new `skin_analysis` JSON column + schema field + mobile type + screen binding.

---

## F2–F13 — all implemented (2026-06-01)  🟢
Backend **94/94 pytest**, mobile **tsc 0 errors**.

- **F2 feature scoring + F4 eyebrow** — `ml/feature_analysis.py` (one FaceMesh pass):
  symmetry/eyes/eyebrows/nose/lips/jawline 0-100 + `canon` block + `eyebrow` map.
  Merged into `face_analysis` by `_merge_features` (no new column); also sets `overallScore` (/10).
  Rendered as real ScoreBars on the results screen.
- **F3 annotated overlay** — `ml/overlay.py` draws facial thirds/fifths; stateless
  `POST /analysis/overlay` streams an annotated PNG (no storage needed).
- **F6 summary card** — `services/card_service.py` (Pillow) → `GET /analysis/{id}/card` PNG.
- **F7 quality gate + F11 flags** — `ml/quality.py` (`assess_quality`): blur/brightness/
  face-angle/pose-complete → `overall` verdict + retake `flags`. New `quality` JSON column;
  retake banner on results screen.
- **F8 posture** — `_posture` in `body_analysis.py`: shoulder tilt + head lean (frontal-safe).
- **F9 size/balance** — `rules/body_guidance.py`: per-shape balance/emphasize/fit notes,
  merged into `body_analysis.guidance`.
- **F10 multi-photo** — `services/aggregate.py` + `POST /analysis/upload-multi` (≤5 frames):
  mean numerics, majority-vote categoricals, best-quality frame for colors/hair/body.
- **F12 image-hash caching** — `_run_ml` keys ML results by sha256 of bytes (1h TTL).
- **F13 progress** — `services/progress.py` + `GET /analysis/progress`: per-metric series + deltas.

**Migration:** `alembic/versions/0001_add_skin_and_quality.py` adds `skin_analysis` + `quality`.
**New mobile types:** `ImageQuality`, `EyebrowMap`, `BodyPosture`, `BodyGuidance`; `featureScores`/`canon` now populated.
**Mobile wiring (done):** results screen has Report (PDF), Share Summary Card, and Facial Overlay buttons
(`services/reportService.ts`: `downloadAndShareCard`, `downloadAndShareOverlay`). Overlay shows only when
`imageUrl` is an http(s) URL (needs cloud-stored image). Color type drift fixed: `skinColor` (was `skinTone`).

**UAT (2026-06-01):** `tests/test_uat_endpoints.py` drives the real API end-to-end
(register → upload, upload-multi, report, card, overlay, progress). Caught + fixed a latent bug:
the `recommendations` relationship lazy-loaded during response serialization outside the async
greenlet (`MissingGreenlet`); `_finalize` now `refresh(..., attribute_names=["recommendations"])`.
Backend **97/97**.
