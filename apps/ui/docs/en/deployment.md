---
title: UI Deployment
lang: en
audience: both
applies_to:
  - apps/ui
translation: ../ko/deployment.md
read_when: Changing or reviewing Dockerfile, Cloudflare Pages config, or vite build settings
---

# UI Deployment

## Production

The UI is deployed to Cloudflare Pages as a static site.
CI runs `vite build`, which produces a `dist/` directory of static assets.
Cloudflare Pages serves those assets directly — there is no server-side runtime in production.

The API base URL is determined at build time by the `VITE_API_BASE_URL` environment variable,
which Vite inlines into the static bundle via `import.meta.env`.
This variable is set in the Cloudflare build environment, so the real API URL is baked into the deployed assets.
The `/api` fallback in `src/main.tsx` is used only during local development with `vite dev`.

## Dockerfile

`apps/ui/Dockerfile` is for the **E2E test runtime only**.
It runs `vite build` without `VITE_API_BASE_URL`, so the bundle is built with the `/api` fallback.
`vite preview` then proxies `/api` requests to the real API at runtime using the `API_BASE_URL`
environment variable injected at container startup.

The Dockerfile is not used in production and is not part of the Cloudflare Pages pipeline.

When changing the Dockerfile, treat it as a change to the E2E test harness, not to the production deployment.
