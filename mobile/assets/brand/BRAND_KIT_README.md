# MyLookFit | Black + Gold Complete App Brand Kit

Brand line: **Find what fits you.**

This kit uses the **woman-profile-in-circular-swoosh + four-point sparkle** mark from the FIRST black-and-gold board approved in chat, not the later 12-option concept sheet. The source design is included under `reference/`. The symbol has been traced from that approved image into true scalable SVG contour paths. Outlined wordmark typography is a close reconstruction of the image and may not be pixel-identical to the AI-rendered brand board; SVG fonts are converted to paths so that recipients do not need any font files.

## Folders

- `vector/`: editable scalable SVG files for the symbol, horizontal/stacked logos, inverted and monochrome variations. No image embeddings or external fonts.
- `print/`: vector PDFs and EPS for designers and printers, generated from the SVGs. PDFs have transparent backgrounds where named transparent.
- `png/logos/`: transparent/on-black/on-ivory horizontal and stacked logos in 800-3200 px sizes.
- `png/symbols/`: standalone full-color and single-color symbols at 128-2048 px.
- `app-icons/`: app icon exports at 16-1024 px, Apple AppIcon.appiconset with Contents.json, Android launcher/adaptive assets plus suggested XML.
- `web/`: PNG favicon sizes, SVG favicon, ICO, PWA manifest and Apple touch icon.
- `social/`: avatars, link-sharing banners, Google Play feature art, vertical story.
- `splash/`: dark and champagne launch art at common phone/tablet resolutions. For iOS/Android prefer platform-native splash placement at runtime rather than relying on one fixed image size.
- `webp/`: web-optimized copies of frequent assets.
- `reference/`: original approved brand board for visual comparison.

## Brand palette

| Role | Hex |
|---|---|
| Primary black | `#080808` |
| Secondary charcoal | `#1E1E1E` |
| Rich gold | `#D4AF37` |
| Champagne gold | `#F1D9A7` |
| Soft ivory | `#FAF7EE` |

The gradient fills are visual effects, not single flat color values; `Rich Gold` is the stable flat fallback.

## Quick start

- iOS App Store: `app-icons/ios/AppStore-1024.png`, Apple source set `app-icons/ios/AppIcon.appiconset/`.
- Google Play icon: `app-icons/android/google-play-512.png`; promotional feature art: `social/app-store-feature-1024x500.png`.
- Android adaptive: use mipmap-anydpi-v26 XML, color resource and dpi foreground/monochrome assets from `app-icons/android/res` (copy into your app resources). Foreground has built-in clear area for safe cropping.
- PWA: copy files from `web/`, update manifest icon paths to match your deployed root.
- Dark UI header: `vector/primary-horizontal-transparent.svg` or `vector/primary-horizontal-on-black.svg`.
- Light backgrounds: `vector/primary-horizontal-on-ivory.svg` or `vector/mono-black-horizontal.svg`.
- Tiny controls: use standalone symbol; the long wordmark and slogan are unsuitable below ~200 px width.

## Vector file note

SVG, vector PDF and EPS are editable in Illustrator, Inkscape and most print-production software. Native `.ai` / Figma files are **not** included; simply open/import the SVG in your preferred editor. EPS gradient handling can vary by printer; vector PDF is preferable for print.

## Implementation disclaimer

Naming and trademark clearance for MyLookFit has not been legally verified. Asset dimensions are useful defaults, not a promise that every store/OS version uses every listed dimension.
