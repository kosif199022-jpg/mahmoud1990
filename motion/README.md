# KOSIF Motion Workspace

KOSIF uses two complementary motion toolchains without coupling either one to the production accounting runtime.

## Remotion

Location: `motion/remotion/`

Use Remotion for React-driven motion, animated dashboards, data-safe explainers, product demos, and repeatable video compositions.

```bash
cd motion/remotion
npm install
npm run studio
npm run check
npm run render
```

## HyperFrames

Location: `motion/hyperframes/`

Use HyperFrames for HTML/GSAP cinematic sequences, title cards, transitions, captions, and motion prototypes that follow `DESIGN.md`.

Requirements: Node.js 22+ and FFmpeg.

```bash
cd motion/hyperframes
npm run doctor
npm run lint
npm run inspect
npm run preview
npm run render
```

## Guardrails

- `DESIGN.md` is the visual identity source of truth.
- Motion assets are isolated from production audit/accounting logic.
- Financial values must be deterministic and must never be visually altered by animation.
- Production UI must keep `prefers-reduced-motion` support.
- Arabic/RTL layout is first-class.
- Lint/inspect/check before rendering or importing motion assets into the application.
