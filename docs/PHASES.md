# Planner App v2 — Phased Implementation Plan

> Each phase is independently deployable. Phases build on each other sequentially.
> Cursor rules are provided per phase in `.cursor/rules/` to give the AI agent maximum context.

---

## Phase 1: Project Foundation & Scaffolding
**Duration:** ~2 days | **Cursor Rule:** `phase-1-foundation.mdc`

### What Gets Built
- Next.js 15 App Router project with `src/` directory
- Convex backend setup with schema definitions
- Clerk authentication integration with org-based multi-tenancy
- Admin layout shell with navigation sidebar
- shadcn/ui component library installation and theme
- Project configuration: ESLint, Prettier, TypeScript strict mode
- Environment variable setup (`.env.local` template)

### Key Deliverables
- [ ] `npx create-next-app` with App Router, TypeScript, Tailwind v4, `src/`
- [ ] `npx convex dev` with full schema defined (all Phase 1 tables)
- [ ] Clerk provider + proxy (Next.js 16) protecting `/admin/*`
- [ ] Admin layout: sidebar nav, header with user button, main content area
- [ ] shadcn/ui installed with: Button, Input, Card, Dialog, Table, Form, Select, Tabs, Badge, DropdownMenu, Sheet, Tooltip, Calendar, Popover, Command, Separator, Skeleton
- [ ] Zod validation schemas mirroring Convex schema
- [ ] Shared types file (`src/lib/types.ts`)
- [ ] File storage abstraction (`useFileUrl` / `getFileUrl`)

### Cursor Command to Start Phase 1
```
Build the Phase 1 foundation for Planner App v2. Reference @docs/SPEC.md for full context
and @.cursor/rules/phase-1-foundation.mdc for specific instructions. Scaffold the
Next.js 15 + Convex + Clerk project from scratch.
```

---

## Phase 2: Core Admin CRUD
**Duration:** ~3 days | **Cursor Rule:** `phase-2-admin-crud.mdc`

### What Gets Built
- Calendar Editions management (CRUD + year management)
- Advertisement Types management (CRUD + day/non-day distinction + pricing)
- Contacts/CRM (unified contact model, search, address books)
- Events management (CRUD, recurring, calendar association)
- Layouts & Ad Placements (layout builder, position management)

### Key Deliverables
- [ ] `/admin/calendars` — Calendar editions list, create/edit dialog, soft-delete
- [ ] `/admin/advertisements` — Ad types list, create/edit with pricing per month
- [ ] `/admin/contacts` — Contact list with search, create/edit form (address, telecom embedded), address book tagging
- [ ] `/admin/contacts/[id]` — Contact detail: info, purchase history, payment history
- [ ] `/admin/events` — Events list, create/edit with multi-day and recurring support
- [ ] `/admin/layouts` — Layout list, layout builder with ad placement positioning
- [ ] All Convex queries/mutations for CRUD operations with server-side orgId from `ctx.auth.getUserIdentity()` (never client args)
- [ ] TanStack Table integration for all list views (sort, filter, paginate)
- [ ] Full-text search on contacts (company, name, email)

### Cursor Command to Start Phase 2
```
Build Phase 2: Core Admin CRUD pages. Reference @docs/SPEC.md sections 1.2-1.4, 1.9-1.10
and @.cursor/rules/phase-2-admin-crud.mdc for specific patterns. The Phase 1 foundation
is already in place — extend it with the admin CRUD pages.
```

---

## Phase 3: Purchase Flow & Billing Engine
**Duration:** ~5 days | **Cursor Rule:** `phase-3-billing.mdc`

### What Gets Built
- Complete purchase creation wizard/flow
- Payment terms configuration
- Scheduled payment auto-generation
- Payment recording with auto-allocation
- All derived state computation (amountPaid, isPaid, net, late fees)
- Invoice number generation

### Key Deliverables
- [ ] `/admin/purchases/new` — Multi-step purchase flow: contact → year → calendar editions (multi-select) → ad types → slots → pricing → payment terms (with scheduledMonths selection)
- [ ] Slot availability checking with real-time conflict detection
- [ ] Day-type slot assignment with 35-slot cap validation
- [ ] Payment terms form with all fields (discounts, additional sales, trade, early discount, late fee, due day, split equally, delivery method, messages)
- [ ] Scheduled payment auto-generation mutation
- [ ] `/admin/purchases/[id]` — Purchase detail with all placements, payment terms, scheduled payments, payment history
- [ ] Payment recording form (amount, date, method, check number)
- [ ] Payment allocation engine: auto-allocate to earliest unpaid scheduled payments
- [ ] Computed helpers: `getAmountPaid()`, `getIsPaid()`, `getNet()`, `getLateFees()`
- [ ] Invoice number generation (atomic, `YY-NNNN` format, sequential per org per year)
- [ ] Purchase edit with recalculation, soft-delete only (no cascade hard-delete)
- [ ] Late fee waiver toggle on scheduled payments

### Cursor Command to Start Phase 3
```
Build Phase 3: Purchase flow and billing engine. Reference @docs/SPEC.md sections 1.5-1.6
and @.cursor/rules/phase-3-billing.mdc for critical billing logic. This is the highest-risk
phase — derived state must NEVER be stored, only computed. Follow the billing rules exactly.
```

---

## Phase 4: Billing Views & Reporting
**Duration:** ~3 days | **Cursor Rule:** `phase-4-billing-views.mdc`

### What Gets Built
- All Payments list view
- This Month view (due/overdue scheduled payments)
- Cash Flow Report (projected vs actual)
- Invoice generation and view
- Statement generation and view
- PDF generation for all reports

### Key Deliverables
- [ ] `/admin/billing/payments` — All payments tab: paginated, searchable, filterable by year, contact info, method, amount, date
- [ ] `/admin/billing/this-month` — Scheduled payments due/overdue this month with late indicators, year filter
- [ ] `/admin/billing/cash-flow` — Cash flow report: projected vs actual by month per contact, year totals, scoped by edition year
- [ ] `/admin/billing/cash-flow` — PDF export of cash flow report
- [ ] `/admin/purchases/[id]/invoice` — Invoice view: printable, all line items, payment terms, messages
- [ ] `/admin/contacts/[id]/statement` — Statement view: payment history, balance across editions
- [ ] PDF generation utility using pdf-lib (invoice PDF, cash flow PDF)
- [ ] Email invoice action (Resend integration)

### Cursor Command to Start Phase 4
```
Build Phase 4: Billing views and reporting. Reference @docs/SPEC.md sections 1.7, 1.11-1.12
and @.cursor/rules/phase-4-billing-views.mdc for view specifications. All financial
data must use the computed helpers from Phase 3 — never query stored state.
```

---

## Phase 5: Dashboard & Admin Polish
**Duration:** ~2 days | **Cursor Rule:** `phase-5-dashboard.mdc`

### What Gets Built
- Calendar inventory dashboard with visual grid
- Summary statistics
- Email integration (Resend + React Email)
- Print views
- Admin UX polish and navigation refinement

### Key Deliverables
- [ ] `/admin/dashboard` — Calendar inventory grid: slot occupancy per month per edition per year
- [ ] Color-coded advertiser slots with click-to-view
- [ ] Summary stats cards: total revenue, collection rate, outstanding balance, late payments count
- [ ] Resend email setup with React Email templates
- [ ] Send invoice email action with PDF attachment
- [ ] Send statement email action
- [ ] Print-optimized CSS for calendar inventory, invoices, statements
- [ ] Admin navigation polish: breadcrumbs, active states, mobile responsive sidebar
- [ ] Loading states (skeletons) and error boundaries throughout admin

### Cursor Command to Start Phase 5
```
Build Phase 5: Dashboard and admin polish. Reference @docs/SPEC.md sections 1.8, 1.11-1.12
and @.cursor/rules/phase-5-dashboard.mdc. Focus on the visual inventory grid,
email integration, and polishing the entire admin experience.
```

---

## Phase 6: Public Community Site
**Duration:** ~5 days | **Cursor Rule:** `phase-6-public-site.mdc`

### What Gets Built
- Public event calendar with interactive views
- Business directory with search and map
- Coupons & deals browsable grid
- Blog with Novel rich text editor
- Video gallery
- Community user accounts
- Tenant branding
- SEO optimization (ISR with 60s revalidation)

### Key Deliverables
- [ ] `/` — Public homepage with featured events, businesses, coupons
- [ ] `/events` — Interactive calendar (lighter than FullCalendar for public), event detail pages
- [ ] `/events/submit` — Community event submission (requires account, admin approval)
- [ ] `/directory` — Business directory: search, filter by category, map integration
- [ ] `/directory/[slug]` — Business detail page
- [ ] `/coupons` — Coupon grid with active deals, claim tracking
- [ ] `/blog` — Blog listing with category filter
- [ ] `/blog/[slug]` — Blog post with SEO meta, OG images, structured data
- [ ] `/blog/admin` — Blog editor with Novel (admin only)
- [ ] `/videos` — Video gallery with embeds
- [ ] `/auth/register` — Community member registration
- [ ] `/profile` — User profile, submissions, claimed coupons
- [ ] Tenant branding system: CSS variables from `tenantBranding` table
- [ ] ISR with 60-second revalidation on all public pages
- [ ] All Phase 2 Convex tables with queries/mutations

### Cursor Command to Start Phase 6
```
Build Phase 6: Public community site. Reference @docs/SPEC.md sections 2.1-2.7
and @.cursor/rules/phase-6-public-site.mdc. Public pages must be SEO-optimized
with ISR. Use a lighter calendar component than FullCalendar for the public site.
```

---

## Phase 7: Client Self-Service Portal
**Duration:** ~3 days | **Cursor Rule:** `phase-7-client-portal.mdc`

### What Gets Built
- Client dashboard with account overview
- Ad placement request system
- Payment history view
- Invoice/statement access
- Asset upload
- Admin-client communication

### Key Deliverables
- [ ] `/portal` — Client dashboard: active ads, upcoming payments, balance
- [ ] `/portal/ads` — Browse available slots, request placements
- [ ] `/portal/payments` — Full payment history with status
- [ ] `/portal/invoices` — View/download invoices and statements
- [ ] `/portal/assets` — Upload ad artwork for admin review
- [ ] `/portal/messages` — Communication with admin
- [ ] Clerk role integration: `client` role with portal access
- [ ] Admin approval workflow for client-submitted placements

### Cursor Command to Start Phase 7
```
Build Phase 7: Client self-service portal. Reference @docs/SPEC.md sections 3.1-3.6
and @.cursor/rules/phase-7-client-portal.mdc. Clients access via Clerk with
the 'client' role. They can view but not directly modify billing data.
```

---

## Phase 8: Data Migration & Launch
**Duration:** ~3 days | **Cursor Rule:** `phase-8-migration.mdc`

### What Gets Built
- Pre-migration data integrity audit script
- PostgreSQL → Convex migration scripts
- Data validation suite
- Parallel testing setup
- Cutover plan execution

### Key Deliverables
- [ ] Pre-migration audit: flag `amountPaid` mismatches, incorrect `isPaid`, wrong `net` values in v1
- [ ] Migration script with correct table ordering (users → contacts → ... → paymentAllocations)
- [ ] ID mapping system: `Map<v1UUID, ConvexId>`
- [ ] Idempotent migration (v1 UUID as dedup key)
- [ ] Validation suite: computed v2 values match v1 stored values for every purchase
- [ ] Count comparison: contacts, purchases, payments, ad slots
- [ ] Staging deployment for parallel testing
- [ ] Delta migration script for data entered during parallel testing
- [ ] Cutover checklist and rollback plan

### Cursor Command to Start Phase 8
```
Build Phase 8: Data migration scripts. Reference @docs/SPEC.md section 6 (Migration Plan)
and @.cursor/rules/phase-8-migration.mdc. Migration must be idempotent, ordered by
FK dependencies, and validate every computed value against v1 stored values.
```
