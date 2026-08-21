# KOSIF Motion Workspace

KOSIF uses two complementary motion toolchains without coupling either one to production accounting or audit logic.

## Remotion

Location: `motion/remotion/`

Use Remotion for React-driven motion, animated dashboards, deterministic data explainers, product demos, and repeatable video compositions.

```bash
npm run motion:remotion:install
npm run motion:remotion:studio
npm run motion:remotion:check
npm run motion:remotion:render
```

## HyperFrames

Location: `motion/hyperframes/`

Use HyperFrames for HTML/GSAP cinematic sequences, title cards, transitions, captions, and motion prototypes that follow `DESIGN.md`.

Requirements: Node.js 22+ and FFmpeg.

```bash
npm run motion:hyperframes:doctor
npm run motion:hyperframes:lint
npm run motion:hyperframes:inspect
npm run motion:hyperframes:preview
npm run motion:hyperframes:render
```

## Guardrails

- `config/design-tokens-v44.json` + `DESIGN.md` are the visual identity authority.
- Motion workspaces remain isolated from production audit/accounting logic.
- Financial values are deterministic and must never be visually altered by animation.
- Product UI keeps `prefers-reduced-motion` support.
- Arabic/RTL layout is first-class.
- Lint/inspect/check before rendering or importing motion assets into the application.
