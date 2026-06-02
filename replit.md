# Zwyppy: Your First Principles Explorer

AI-powered first-principles breakdowns of any topic — hierarchical levels, interactive Mermaid flowcharts, innovation gap cards with public companies, and Grok Imagine visuals (Pro tier).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Frontend: `artifacts/first-principles/` (React + Vite). Entry: `src/App.tsx`, main page: `src/pages/Home.tsx`, pricing: `src/pages/Pricing.tsx`.
- Server: `artifacts/api-server/` (Express). Routes: `src/routes/{me,images,health}.ts`. Auth middleware: `src/middlewares/auth.ts`. Clerk proxy: `src/middlewares/clerkProxyMiddleware.ts`.
- API contract (source of truth): `lib/api-spec/openapi.yaml` → regenerates `lib/api-client-react/` (hooks + customFetch) and `lib/api-zod/` (zod validators).
- DB schema: `lib/db/src/schema/users.ts` (Drizzle).

## Architecture decisions

- **Self-serve Stripe checkout.** Pro is a $12/mo subscription via Stripe Checkout. Webhooks (`/api/stripe/webhook`) flip `users.is_pro` based on subscription status; users manage billing via the Stripe Customer Portal from the Pricing page. `stripe-replit-sync` mirrors Stripe data into the `stripe` Postgres schema and manages the webhook endpoint automatically.
- **Server-side image proxy.** xAI image generation runs only in the API server using a server-held `XAI_API_KEY`. The frontend never sees that key. Free users still bring their own xAI key for the text breakdown (`src/lib/grok.ts`); Pro users get hosted images at `/api/images`.
- **Auth via Replit-managed Clerk.** Same-origin cookies (frontend at `/` and API at `/api`) flow automatically; no token forwarding needed.
- **Monthly image quota.** 100 images/month for Pro, tracked in `users.image_count` + `image_count_reset_at`, reset on first request of a new UTC calendar month.
- **Tailwind v4 + Clerk layer.** `vite.config.ts` passes `tailwindcss({ optimize: false })` and `index.css` declares `@layer theme, base, clerk, components, utilities;` so Clerk's UI styles compose with Tailwind.

## Product

Type any topic ("how does a transistor work", "lithium-ion battery", etc.) and get:

1. A hierarchical first-principles breakdown (atoms → application).
2. An interactive Mermaid flowchart with clickable nodes that scroll to matching cards.
3. (Pro) Innovation-gap cards with real publicly traded companies positioned in each gap.
4. Grokipedia "learn more" links for every level.
5. (Pro) AI concept-art images on every level and every gap, with one-click regenerate.

## User preferences

_(none yet)_

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after editing `openapi.yaml`.
- Always run `pnpm --filter @workspace/db run push` after editing schema in `lib/db/`.
- Never use `console.log` in server code — use `req.log` in route handlers.
- The Clerk frontend-API proxy middleware (`/api/__clerk`) is a no-op in dev; only active in production.
- To grant a user Pro manually (e.g. comp): `UPDATE users SET is_pro = true WHERE id = '<clerk_user_id>';` — note the next Stripe webhook for that customer will overwrite this if the subscription is inactive.
- The Stripe webhook route is mounted in `app.ts` BEFORE `express.json()` because Stripe signature verification needs the raw body.
- **xAI calls are now resilient + circuit-aware** (see `lib/xai-text.ts` + `lib/xai.ts`): automatic retries (2–3 attempts, de-weighted to 1 when degraded) + per-call timeouts (shortened under load) + exp backoff + jitter. A **strengthened in-memory circuit breaker** now uses *separate counters* for RateLimit vs other transients (RateLimit threshold = 3, other = 5). De-weighting is smarter when RateLimit-heavy. Richer health data (`rateLimitCount`, `otherTransientCount`, `totalRecentTransients`) is exposed via `getXaiHealth()`, `/healthz`, and `/me`. Time-based decay still applies. Routes return 503 on open circuit. Direct analog of the previous HybridOrchestrator adaptive logic.
- The public `/healthz` endpoint now surfaces the AI health (`ai.status`, `ai.cooldownRemainingMs`, etc.) so the frontend can show a non-blocking banner (see `Home.tsx`). The React client already had the generated `useHealthCheck` hook — it is now actively used with 45s polling.
- For authenticated users (especially Pro), a tiny `aiStatus` string ("healthy" | "degraded" | "open") is also included in the existing `/me` response. This is the same circuit breaker value and requires zero extra calls from the client.
- Frontend now actively reacts: `handleSubmit` blocks new breakdowns when open for Pro users, image generation is skipped (with clear messaging), and the banner + result headers reflect the live state. Added time-based decay to the circuit counter for better long-term behavior.
- Health state now deeply influences loading experiences: AtomSpinner, ImageBlock loading states, and gap regeneration UI all adapt messaging, colors, and disabled states based on `effectiveAiStatus`.
- Added lightweight debug endpoint: `GET /api/debug/ai-circuit`.
  - Returns rich JSON for tools/cURL (full state + counts + thresholds).
  - When opened in a browser, serves a beautiful self-contained interactive dashboard (Tailwind + vanilla JS) with:
    - Live status + countdown timer
    - Visual progress bars for RateLimit vs Other counters
    - One-click buttons: Reset, Simulate RateLimit, Simulate Other
    - Auto-polling + action log + keyboard shortcuts (R, 1, 2)
  - Perfect for live demos and presentations. POST helpers (`/reset` and `/simulate-failure`) are called directly from the UI.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
