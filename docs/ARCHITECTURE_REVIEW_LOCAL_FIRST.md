# Review: a local-first architecture, and whether MyLookFit could adopt it

**Date:** 2026-09-23
**Status:** Review only. Nothing was changed, and nothing is committed to.
**Subject:** A backend architecture document from another mobile app
(Kotlin Multiplatform, SQLDelight, Clerk auth, optional Firebase), offered as
a possible model for MyLookFit.

---

## Verdict

The document is sound for the app it was written for: a greenfield,
single-developer mobile app with no users yet. Three of its five "worth
copying" decisions should not be copied. Wholesale adoption is **not feasible**
for MyLookFit; a hybrid is, and the valuable half can be taken without the
risky half.

---

## What is genuinely worth taking

**Local-first as the default rather than a fallback.** This is the strongest
idea in the document and the one that would most help MyLookFit. It is also
exactly the failure we spent 2026-09-22 and 2026-09-23 fighting: the app
blocked on a sleeping free-plan container and showed nothing for up to a
minute. An app whose data is already on the device has no cold start, works
without a connection, and needs no explaining in the privacy policy.

**Conditional plugin application** so the repository builds with no cloud
configuration present. Ordinary, low-risk, fine.

**Secrets injected at build time rather than committed.** Already how
MyLookFit handles `EXPO_PUBLIC_*`.

---

## What should not be copied

### 1. The hand-rolled Clerk Frontend API client

Clerk's Frontend API is the protocol its own SDKs speak, not a
stability-contracted public interface for third-party clients.
Re-implementing session refresh and the OAuth nonce callback by hand means
owning every breaking change Clerk ships, and the failure mode — users
silently signed out — is the kind discovered through store reviews.

Deriving the FAPI host by base64-decoding the publishable key is real; the key
does encode the domain. It is still an implementation detail being relied on
as though it were an API.

For MyLookFit this is moot. Authentication is already Firebase ID tokens
verified with `google-auth`. Moving to Clerk would cost a migration and buy
nothing.

### 2. Reaching Firebase through runtime reflection

`Class.forName` to keep the module compiling without Firebase on the classpath
is clever and carries a poor trade. It defeats compile-time type checking,
requires R8/ProGuard keep rules or it breaks in release builds only, and turns
a missing dependency into a runtime surprise rather than a build failure. The
stated goal is achievable with a source-set split or a thin interface plus an
optional module, with none of those costs.

### 3. Session tokens in SharedPreferences

The document flags this itself as a pre-ship fix, correctly. Worth noting the
same distinction applies to MyLookFit's biometric lock added on 2026-09-22:
it gates *access* to a stored token. It does not encrypt it, and it has never
claimed to.

---

## What the document does not mention, and should

- **Local schema migration is harder, not easier.** There is no central place
  to run a migration. Every device migrates itself, and users on a
  two-year-old version exist indefinitely.
- **Retrofitting sync onto a local-first schema is brutal.** If cloud sync is
  "optional, later", the local schema needs `updated_at`, tombstones for
  deletions and a change log *now*, even while unused. Without change
  tracking, reconciliation is guesswork.
- **Local-only is not "no backup", it is data loss.** Phone lost, phone reset,
  app uninstalled: gone. For a Beauty Passport that accumulates value over
  months this is a product risk, not a technical one. The document notes the
  multi-device gap but not this.
- **Every rules change becomes a store release.** Today a styling-rule
  correction is a deploy.

---

## Feasibility for MyLookFit, piece by piece

| piece | verdict | why |
|---|---|---|
| Deterministic rules on device | **Yes, high value** | `look_composer`, `color_season`, and the hair, makeup, garment and accessory engines are pure functions. Benchmarked 2026-09-22 at 2.92 ms for three looks, 0.01 ms for a colour report. Nothing about them needs a server. |
| ML analysis on device | **No, not realistically** | The colour, face, hair and skin pipeline is `cv2` + `mediapipe` + `numpy`. MediaPipe has a mobile Tasks story; OpenCV does not, and the numpy pipeline would need a full rewrite. This is the hard blocker. |
| Clerk for authentication | **No** | Firebase is already in place and working. A lateral move at full migration cost. |
| Removing the backend | **No** | There are real users and real rows in Neon today. The document describes a greenfield app; this is not one. |
| Local-first *caching* | **Yes, and next** | Distinct from local-first storage: the server stays the record, the device keeps a usable copy, the app never blocks on the network. |

---

## Recommendation

1. **Local-first caching.** Open on cached state, fetch behind it, reconcile
   when the answer lands. This makes the free plan's cold start a background
   event rather than a wall. It is the same instinct as the launch fix in
   `2f3d53a`, applied to every screen rather than only the gate.
2. **Port the rules engines to TypeScript, gradually.** Highest value and no
   ML dependency: the colour report, Create My Look and hair recommendations
   stop needing a round trip at all. Real cost: multi-week, and the 461
   backend tests *are* the specification. They would have to be ported too, or
   the safety net that caught the saree, sharara and blunt bob defects is lost.
3. **Keep the backend** for ML, accounts and the durable record. That is what
   it is genuinely for.

The author of that document had the luxury of designing before shipping.
MyLookFit has users and a working system. The parts worth taking are the ones
that make the app independent of the server's mood — not the ones that delete
the server.

---

## Not decided here

Whether to do any of this. This review was requested as a review; no work has
been scheduled and no commitment has been made.
