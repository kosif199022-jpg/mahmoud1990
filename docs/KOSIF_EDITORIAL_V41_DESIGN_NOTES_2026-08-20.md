# KOSIF Editorial v41 design record

## Outcome

KOSIF v41 adds a reversible presentation layer over Studio v40. The functional authority remains the deterministic v38 accounting, audit, security, evidence and human-approval core. The new layer does not read, calculate, persist, transmit or approve engagement data.

## Canva direction

Four Canva concept boards were generated for this release. Their shared direction was adopted rather than copying any single board: warm paper, deep evergreen ink, champagne gold, bounded cobalt/teal/coral accents, editorial spacing, large Arabic headlines, frosted navigation and controlled dimensional shadows.

The implementation combines the strongest cues from the earlier KOSIF visual concepts:

- structured editorial dashboard composition;
- quiet luxury in the masthead and report covers;
- warmer reading surfaces for long professional sessions;
- bright functional color used only for navigation, state and emphasis;
- cinematic movement that remains subordinate to comprehension.

## External product principles reviewed

- Apple Human Interface Guidelines: legibility, hierarchy, restrained materials and motion that supports continuity.
- Linear Method: clarity first, progressive power and reduced interface noise.
- Stripe accessible color systems: expressive color with perceptual contrast and state legibility.
- Workiva platform principles: governed workflows, traceability, collaboration and human oversight.
- Material Design motion/elevation: consistent depth cues and spatial continuity.

No third-party app layout, logo, artwork or proprietary asset is copied. The sources informed principles only.

## System decisions

- Typography: locally bundled Alexandria at 500/700 weights for reliable Arabic shaping, one-family hierarchy and offline use.
- Palette: evergreen `#102825`, porcelain `#FFFCF5`, limestone `#F7F0E2`, champagne `#D7AE58`, cobalt `#315BE8`, teal `#0B8B7C`, coral `#D8654D` and plum `#65435F`.
- Depth: layered low-opacity shadows with borders; glass is limited to mastheads, navigation and overlays.
- Motion: staggered reveal, page continuity, cover micro-parallax and pointer spotlight. All are disabled by `prefers-reduced-motion`; pointer effects run only with a fine hover-capable pointer.
- Mobile: single-column quick actions, stacked image covers, safe-area-compatible controls and no hover dependency.
- Dark mode: identical semantic accents on deep green paper rather than a simple color inversion.
- Print: motion, install controls and decorative folios are removed; report surfaces flatten to white.

## Runtime boundary

`public/kosif-editorial-v41.js` only sets presentation attributes, mounts an ornamental folio, and coordinates visual reveals. A release gate rejects storage, API, fetch, IndexedDB and WebSocket access in this file. All accounting and professional judgment continue to come from existing governed modules.
