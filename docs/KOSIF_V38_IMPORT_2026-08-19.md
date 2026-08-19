# KOSIF v38 import provenance — 2026-08-19

Source package supplied by the project owner:

- `KOSIF-v38-Trusted-Audit-OS.zip`
- SHA-256: `2740bf77db1545a83c153349dbfcbc0e5b171f0a643d2949d3b0dfa4ba53037f`
- Declared product version: `38.0.0`
- Declared build: `2026.08.19-v38-trusted-audit-os`

Local pre-import validation executed successfully:

- `npm run build`
- `npm run check`
- legacy deterministic engine: 32/32
- v38 deterministic core: 12/12
- v38 Evidence Graph: PASS
- v38 owner/platform API tests: PASS
- v38 Synthetic Audit Lab validation: PASS
- v38 runtime smoke: PASS

Import hardening added before publication:

1. Cloudflare production verification now expects the v38 suite identity and checks v38 runtime assets.
2. Legacy v36.4 continuity accepts the explicit `v36.4-compatible` envelope of the v38 suite, preventing a false “release mismatch” banner.
3. iPhone app chrome yields to open dialogs/sheets so bottom navigation and release notices do not cover modal actions.
4. The synthetic audit lab is regenerated deterministically before build/check rather than requiring large generated CSV fixtures to be source-controlled.
5. The synthetic lab manifest uses a reproducible default generation timestamp.

The generated demo remains synthetic-only and is not a source of professional authority.
