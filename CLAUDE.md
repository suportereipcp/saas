# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant SaaS platform (PCP) built with Next.js 16 (App Router) + TypeScript + Supabase + Tailwind CSS. Hosts multiple internal industrial apps (press scheduling, inventory, OEE metrics, quality control, notes) under a single deployment. The project documentation and UI are in **Brazilian Portuguese**.

## Commands

```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build (standalone output)
npm start        # Start production server
npm run lint     # ESLint (Next.js core web vitals + TypeScript)
```

No test framework is configured. Docker build: `docker build -t saas .` (multi-stage, Node 20-alpine).

## Architecture

### Multi-Tenancy via Supabase Schemas

The core architectural pattern: one Supabase instance, multiple PostgreSQL schemas per tenant.

- **`public` schema** — shared data only: `profiles`, `users`, `apps`, `permissions`, `audit_logs`
- **Per-app schemas** — isolated data (e.g., `app_controle_prazo_qualidade`, `app_anotacoes`, `datasul`)
- **`NEXT_PUBLIC_DB_SCHEMA`** env var selects the active schema at build/runtime

### Supabase Clients (src/lib/)

Three client singletons — always use these, never instantiate new ones:

- `supabase.ts` — browser client, auto-configured to the active schema via `NEXT_PUBLIC_DB_SCHEMA`
- `supabase-server.ts` — server-side client (cookie-based auth via `@supabase/ssr`)
- `supabase-admin.ts` — service-role client for privileged operations

**Querying the active schema:** `supabase.from('table')` (schema is pre-configured).
**Querying shared/public data:** `supabase.schema('public').from('profiles')` — must explicitly force schema.

### Auth & Middleware

- Supabase Auth with email/password (src/middleware.ts)
- Public routes: `/login`, `/`, `/api/auth`, `/api/webhook`
- All other routes require authentication; unauthenticated users redirect to `/login`
- User profiles in `public.profiles` with `is_super_admin` flag for admin access

### App Structure (src/app/)

Each business app is a top-level route directory with its own components in `src/components/`:
- `/portal` — app launcher dashboard
- `/admin` — super-admin console
- `/agenteprensa` — AI agent for press scheduling (Gemini 2.0)
- `/anotacoes` — notes app with Gemini memory + tldraw canvases
- `/controle-prazo-qualidade` — quality deadline control (JAT, integrates with Datasul ERP)
- `/apont-rubber-prensa` — press machine operator data entry
- `/inventario-rotativo` — rotating inventory management
- `/oee-teep` — OEE/TEEP machine efficiency metrics
- `/shift-app` — shift management
- `/dashboards` — analytics dashboards

### API Routes (src/app/api/)

- `/api/chat` — Gemini AI chat with tool use (catalog search, web search, notes)
- `/api/transcribe`, `/api/transcribe-background` — audio transcription
- `/api/tts` — text-to-speech (Kokoro)
- `/api/webhook` — Datasul ERP webhook receiver (public, excluded from auth middleware)
- `/api/approve-layer`, `/api/send-layer-email` — quality workflow endpoints

### Server Actions (src/actions/)

Business logic for inventory, OEE metrics, user management, and settings.

## Code Conventions

- **UI components:** use existing shadcn/ui components in `src/components/ui/` (Radix UI based). Use `cn()` from `src/lib/utils.ts` for conditional classes.
- **Icons:** `lucide-react` only.
- **Path alias:** `@/*` maps to `src/*`.
- **Styling:** Tailwind CSS with HSL custom properties defined in `src/app/globals.css`. Dark mode via class strategy.
- **PWA:** enabled via `@ducanh2912/next-pwa` in `next.config.mjs`, service worker registered in `src/components/pwa-registry.tsx`.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`): push to `main` triggers Docker Hub build and Easypanel webhook deployment. Environment variables are injected as Docker build args.
