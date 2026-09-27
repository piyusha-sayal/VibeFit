# TalkBack test script — MyLookFit (NOT RUN)

Status: **not verified.** Run on a physical Android phone (Device B in the QA matrix) with the first `com.mylookfit.app` APK.

## Setup
1. Settings → Accessibility → TalkBack → On. Learn the gestures first: swipe right or left = next or previous item, double-tap = activate, two-finger swipe = scroll, swipe down-then-left = back.
2. Settings → Accessibility → TalkBack → Settings → Verbosity: turn on "Speak element type" and "Speak usage hints".
3. Use a fresh disposable email account.
4. Record each step as `P` / `F-P0` / `F-P1` / `F-P2`, with what TalkBack actually said.

Severity: a step you can't complete with TalkBack is **P0**. A wrong or missing label on a primary control, or focus that gets trapped, is **P1**. Awkward wording or redundant announcements are **P2**.

## Journey

| # | Screen | Do | Expect to hear / check | Result |
|---|---|---|---|---|
| 1 | Launch | Open the app | "MyLookFit", then the login screen. No silent blank screen for more than 5 s. If the server is waking, the waking screen is announced | |
| 2 | Login | Swipe through every element | Logical order: logo/heading → email → password → Sign in → Google → Register link. Every field says its label and "edit box". Buttons say "button" | |
| 3 | Login error | Sign in with a wrong password | The error is **announced automatically** (live region) without moving focus by hand | |
| 4 | Register | Create the account | Fields labelled; the submit button's disabled/enabled state is announced | |
| 5 | Eligibility | 18+ screen appears | Heading "One quick check" announced as a heading; the explanation is read; "I'm 18 or older, button", "I'm under 18, button"; the disclaimer is read | |
| 6 | Eligibility | Double-tap "I'm 18 or older" | Moves on to onboarding; focus lands on the new screen's heading | |
| 7 | Onboarding | Complete all steps | Each option announces its **selected/not selected** state; Skip and Next are reachable; progress is announced | |
| 8 | Scan | Start a scan, pick a photo | Camera/gallery buttons labelled; the crop screen is usable; "Analysing" progress is announced; the quality/retake prompt is announced | |
| 9 | Result | Read the result | Season name and confidence are read as text; nothing depends on colour alone | |
| 10 | Color Studio | Swipe across palette chips | Each chip says a **colour name** (not just "button"); explorers are reachable; horizontal lists can be scrolled | |
| 11 | Create My Look | Generate, swap one piece | Look cards read title and pieces; the swap control is labelled; modal pickers trap focus inside and close with back | |
| 12 | Save look | Save | A confirmation is **announced** (live region or focus move) | |
| 13 | Beauty Passport | Open | Headings navigable by the headings reading control; sections read in visual order | |
| 14 | Settings | Swipe all rows | Every row is labelled; toggles announce on/off; Delete account is clearly announced as destructive | |
| 15 | Back | System back from each screen above | Returns to the previous screen; focus isn't lost to the top of an unrelated screen | |

## Also check
- **Focus order** follows the visual order on every screen above.
- **Headings**: each screen title is announced as a heading.
- **Images**: decorative images are skipped; informative ones (diagrams, face-shape art) have a description.
- **Touch targets**: every control is at least 48 dp (explore by touch finds it easily).

## 200% font scale (TalkBack off)
Settings → Display → Font size **max** and Display size **max**. Repeat steps 2, 5, 7, 9, 11 and 14. Pass means no clipped text, no overlapping controls, every button still reachable (scroll allowed), and the 18+ buttons are fully readable.

## Sign-off
Tester · device · Android version · APK build ID · date · overall result. Mark TalkBack **verified** in `RELEASE_VERIFICATION.md` only if every step is `P` or `F-P2`.
