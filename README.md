# First-Principles Explorer

**Break down any topic to its fundamental truths. Rebuild understanding hierarchically. Visualize connections. Spot innovation gaps. Generate concept art.**

An AI-powered web application that operationalizes first-principles thinking at scale.

## What is First-Principles Thinking?

Most reasoning happens by analogy ("this is like that thing I already know"). First-principles thinking starts from the ground up:

1. **Deconstruct** a topic into its most basic, undeniable components (physical laws, atomic behaviors, core mechanisms, axioms).
2. **Reconstruct** understanding layer by layer, connecting fundamentals to emergent complexity.
3. **Apply** the resulting model to identify leverage points, gaps, and opportunities.

This tool makes that rigorous process accessible, visual, and actionable for any domain — science, technology, business, engineering, or daily curiosity.

## Core Features

- **Hierarchical First-Principles Breakdowns**  
  Enter any topic (e.g., "lithium-ion battery", "how does a transistor work", "CRISPR"). Receive structured levels progressing from foundational truths → mechanisms → systems → real-world applications.

- **Interactive Mermaid Flowcharts**  
  Auto-generated diagrams with clickable nodes. Click a node to smoothly scroll to the matching content card. Perfect for tracing causal chains.

- **Innovation Gap Cards (Pro)**  
  At each hierarchical level, the system identifies "white space" — opportunities where no dominant solution or company fully addresses the fundamental need. Surfaces relevant publicly traded companies positioned to exploit (or be disrupted by) that gap.

- **Grok Imagine Concept Art (Pro)**  
  Server-proxied AI-generated visuals for every level and every innovation gap. One-click regenerate. Free tier users can still generate text breakdowns (bring your own xAI key); Pro unlocks hosted images with quota.

- **Grokipedia "Learn More" Links**  
  Every level includes curated deeper-dive links powered by Grok/xAI.

- **Pro Subscription ($12/mo)**  
  Self-serve Stripe Checkout + Customer Portal. Webhooks automatically manage `is_pro` status and image quotas. Monthly image allowance with UTC-monthly reset.

## Tech Stack

Built as a type-safe pnpm monorepo with clear separation of concerns:

- **Frontend**: React 19 + Vite (in `artifacts/first-principles/`), Tailwind v4, interactive Mermaid.js, Clerk components.
- **Backend**: Express 5 (Node 24), Zod (v4) validation, structured logging.
- **API Contract**: OpenAPI 3.1 spec (`lib/api-spec/openapi.yaml`) as the single source of truth. Orval generates React Query hooks + Zod schemas.
- **Database**: PostgreSQL + Drizzle ORM (`lib/db/`). User profiles, image quotas, Stripe sync.
- **Auth**: Clerk (Replit-managed) with same-origin cookie proxy for seamless frontend ↔ API communication.
- **Payments**: Stripe Checkout + webhooks + Customer Portal, mirrored via `stripe-replit-sync`.
- **Image Generation**: xAI Grok Imagine calls executed server-side only (never exposed to browser).
- **Tooling**: TypeScript project references, esbuild bundles, pnpm workspaces.

## Project Structure

```
First-Principles-Explorer/
├── artifacts/
│   ├── first-principles/     # React + Vite frontend (src/App.tsx, pages/Home.tsx, etc.)
│   └── api-server/           # Express backend (src/routes, middlewares/auth.ts, clerkProxyMiddleware.ts)
├── lib/
│   ├── api-spec/             # openapi.yaml (edit here → regenerate clients)
│   ├── api-client-react/     # Generated hooks & customFetch
│   ├── api-zod/              # Generated Zod validators
│   └── db/                   # Drizzle schema (users, image quotas, stripe mirror)
├── scripts/                  # Post-merge hooks, utilities
├── package.json              # Root workspace config
├── pnpm-workspace.yaml
├── tsconfig*.json
├── replit.md                 # Detailed development & operations guide
└── README.md                 # You are here
```

## Getting Started (Replit Development)

See the comprehensive `replit.md` for exact commands. Key workflows:

```bash
pnpm run typecheck                 # Full typecheck across libs + artifacts
pnpm run build                     # Typecheck + build everything
pnpm --filter @workspace/api-server run dev   # Start API (port 5000)
pnpm --filter @workspace/api-spec run codegen # After editing openapi.yaml
pnpm --filter @workspace/db run push        # After schema changes (dev)
```

**Environment requirements**:
- `DATABASE_URL` (Postgres)
- `XAI_API_KEY` (server-side only, for Pro image generation)

## Key Architecture Principles

- **Contract-first API**: The OpenAPI spec is edited by humans; everything else is generated. Prevents drift.
- **Defense in depth for secrets**: xAI key and Stripe webhook secrets live only on the server. Frontend never sees them.
- **Progressive enhancement**: Free tier delivers core first-principles value. Pro adds visuals + company intelligence.
- **Quota & billing integrity**: Image counts and subscription status are source-of-truth in Postgres, reconciled with Stripe webhooks.
- **Replit-native auth**: Leverages Replit's Clerk integration for zero-config same-origin sessions.

## Related Projects & Skills

- **Local First-Principles-Explorer Skill**: The core reasoning engine (`generateBreakdownWithXai`, hierarchical structuring, innovation gap identification, Mermaid generation) lives in your Grok environment as a skill. This web app is the polished, persistent, monetized experience layer on top.
- **PharmaClaw / OpenClaw**: Sister projects exploring multi-agent systems for scientific domains.

## License

MIT

---

*Built with a commitment to truth-seeking, hierarchical clarity, and turning deep understanding into actionable insight.*