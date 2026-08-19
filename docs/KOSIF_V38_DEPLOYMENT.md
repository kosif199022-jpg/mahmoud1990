# KOSIF v38 deployment notes

## Build and verify

```bash
npm run build
npm run check
```

Before production deployment, run a Wrangler preview/dry-run in the deployment environment and verify the configured KV and service binding IDs.

## Required existing bindings

`wrangler.toml` currently expects:

- KV binding: `DATA`
- Service binding: `MAFATEEH`
- Assets binding: `ASSETS`

## Public / Local AI provider (optional)

Set server-only values:

```text
KOSIF_PUBLIC_AI_BASE_URL=https://your-approved-gateway.example
KOSIF_PUBLIC_AI_ALLOWED_HOSTS=your-approved-gateway.example
KOSIF_PUBLIC_AI_MODE=responses
KOSIF_PUBLIC_AI_MODEL=your-model
KOSIF_PUBLIC_AI_KEY=<secret>
```

Never expose the base URL as a browser-provided request field. The v38 provider intentionally ignores browser endpoint/base-url fields.

## OpenAI Live

The browser uses WebRTC. The Worker performs the SDP exchange with OpenAI Realtime only after the owner session is active and an OpenAI key has passed the provider connection test. The UI defaults to `gpt-realtime` and can use `gpt-realtime-mini`.

## Source Intelligence

- Core authoritative sources are built into the registry.
- Custom sources are owner-only.
- Bulk custom registration supports up to 500 per request and 5,000 total.
- Custom entries do not auto-promote to authoritative tiers.
- Network refresh is throttled to 20 sources/request and is not intended to bypass site terms, robots policies, licenses or copyright restrictions.
- Full licensed standards text should be handled only under an appropriate license; metadata/link/version tracking is the default.

## Audit Council

The council supports OpenAI, Anthropic, Gemini and the configured Public/Local provider. Credentials are tested per owner session. AI analysis is advisory; the human reviewer is the final approval authority.
