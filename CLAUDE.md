# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. TypeScript validation is now active via `.claude/hooks/tsc.js`.

@AGENTS.md

## Commands

```bash
# Development
npm run dev           # Start Next.js dev server
npx convex dev        # Start Convex backend (run alongside next dev)

# Build & Lint
npm run build
npm run lint

# Testing
npm test              # Vitest in watch mode
npm run test:once     # Single run (all tests)
npm run test:coverage # With coverage report

# Run a specific test file
npx vitest run path/to/file.test.ts

# Data migration
npm run migrate:audit
npm run migrate:run
npm run migrate:validate
```

## Architecture

This is a B2B SaaS platform for managing calendar ad sales — editions, placements, contacts, billing, portals, and community management.

**Stack:**
- **Next.js 16** (App Router, React 19) — frontend + API routes
- **Convex** — real-time backend-as-a-service (database, queries, mutations, actions)
- **Clerk** — authentication with multi-tenant org support
- **shadcn/ui** (Base Nova style) + Tailwind CSS v4

**Key integrations:** Resend (email), PDF-lib (PDF generation), FullCalendar, Tiptap (rich text), Leaflet (maps), React Email

### Schema

The full database schema is defined in `convex/schema.ts` — **always reference it when you need to understand data structure**. Key tables:

| Table | Purpose |
|---|---|
| `calendarEditions` | Calendar products (name, code, orgId) |
| `advertisements` | Ad types (isDayType, slotsPerMonth) |
| `adPricing` | Monthly prices per ad × edition × year |
| `adSlots` | Actual slot assignments (month, year, slotNumber) |
| `contacts` | CRM records with full address, geo, search index |
| `purchases` | A contact's buy for a year across editions |
| `adPurchases` | Line items within a purchase (ad × edition × qty) |
| `paymentTerms` | Billing config per purchase (schedule, discounts, fees) |
| `scheduledPayments` | Individual payment due dates generated from terms |
| `payments` | Actual payments received |
| `paymentAllocations` | Maps payments → scheduled payments |
| `communities` | Groups of calendar editions with public pages |
| `tenantBranding` | Per-org public site branding (logo, colors, social) |
| `portalInvites` | Token-based invite system for contact portal access |
| `orgPermissions` | User roles (admin/contact/user) and permission arrays |
| `clientAssets` | Uploaded artwork files with review workflow |
| `orgSettings` | Publisher business info (used in PDFs) |
| `dashboardStatsCache` | Precomputed revenue stats per edition/year |

All tables include `orgId: v.string()` for multi-tenancy. Soft deletes use `isDeleted: v.optional(v.boolean())`.

### Convex Backend (`convex/`)

All backend logic lives in `convex/`. Each domain module contains:
- `queries.ts` — read operations (exposed via `api.*`)
- `mutations.ts` — write operations
- `*.test.ts` — backend tests (run in `edge-runtime` environment)

The schema (`convex/schema.ts`) defines ~46 tables. Every table includes `orgId: v.string()` for multi-tenancy. All Convex queries are scoped to `orgId` from the authenticated Clerk session.

Use `useQuery(api.module.fn, args)` and `useMutation(api.module.fn)` in components. The `@convex-dev/react-query` integration allows using React Query hooks on top of Convex subscriptions.

### Frontend (`src/`)

**Route structure:**
- `app/(public)/` — marketing/public pages
- `app/admin/` — internal admin dashboard (~23 sub-routes: contacts, calendars, ads, billing, blog, communities, events, etc.)
- `app/portal/` — tenant-facing portal (ads, assets, invoices, payments, messages)
- `app/auth/` — Clerk auth pages
- `app/api/` — API routes for PDF generation, email sending, portal lookup

**Component organization:**
- `components/ui/` — shadcn base components (31+)
- `components/admin/` — admin-specific components
- `components/portal/` — portal-specific components
- `components/shared/` — cross-section reusable components

**State management:**
1. Server state: Convex subscriptions (+ React Query via `@convex-dev/react-query`)
2. Global client state: Zustand (`src/stores/use-year-store.ts`) — year selection persisted to localStorage
3. URL state: community filter via `searchParams`
4. Forms: React Hook Form + Zod resolvers

**Key hooks** (`src/hooks/`):
- `use-org.ts` — Clerk organization context
- `use-portal-auth.ts` — portal authentication
- `use-community-filter.ts` — URL-synced community filtering
- `use-default-year.ts` — year selection with fallback

### Testing

Vitest is configured with **two separate project environments**:

| Project | Pattern | Environment |
|---------|---------|-------------|
| `convex` | `convex/**/*.test.{ts,js}` | `edge-runtime` |
| `frontend` | `src/**/*.test.{ts,tsx,js,jsx}` | `jsdom` |

Frontend tests use `src/test-setup.ts` for Testing Library setup. To run only one project: `npx vitest run --project convex` or `--project frontend`.

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/register
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

### Path Alias

`@/*` maps to `./src/*` (configured in both tsconfig and vitest).
