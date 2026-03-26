# Planner App v2 — Phase Commands

> Copy and paste each command into a **new Cursor chat** when you're ready to start that phase.
> Each command @-references the spec and the phase-specific rule so the AI has full context.

---

## Phase 1: Project Foundation & Scaffolding

```
Build the Phase 1 foundation for Planner App v2 — a ground-up rewrite of a calendar ad sales management platform using Next.js 15 (App Router) + Convex + Clerk.

Reference these files for full context:
- @docs/SPEC.md — full project specification (architecture, schema, features, tech stack)
- @.cursor/rules/phase-1-foundation.mdc — exact scaffolding steps and dependency list

What to build:
1. Scaffold Next.js 15 project with App Router, TypeScript strict, Tailwind CSS v4, src/ directory
2. Install ALL dependencies (Convex, Clerk, shadcn/ui, React Hook Form, Zod, TanStack Table, FullCalendar, pdf-lib, Resend, React Email, Zustand, date-fns, lucide-react)
3. Initialize Convex and define the FULL schema in convex/schema.ts — all tables from the spec with all indexes. Every table gets orgId for multi-tenancy. Every content table gets isDeleted.
4. Set up Clerk authentication with ConvexProviderWithClerk integration in root layout
5. Create middleware.ts protecting /admin/* and /portal/* routes
6. Build admin layout shell: sidebar navigation (Calendars, Contacts, Advertisements, Purchases, Billing, Events, Layouts, Dashboard), header with Clerk UserButton, main content area
7. Install shadcn/ui components: Button, Input, Card, Dialog, Table, Form, Select, Tabs, Badge, DropdownMenu, Sheet, Tooltip, Calendar, Popover, Command, Separator, Skeleton, Textarea, Label, Switch, Checkbox, RadioGroup, Avatar, ScrollArea
8. Create shared utilities: src/lib/types.ts, src/lib/validators.ts (Zod schemas), src/lib/utils.ts (cn, date/currency formatters), src/lib/file-storage.ts
9. Create reusable components: DataTable (TanStack Table wrapper), PageHeader, ConfirmDialog, EmptyState, TableSkeleton
10. Create .env.local template with all required environment variables

Critical rules:
- All dates stored as Unix timestamps (v.number()), never strings
- Every Convex document has orgId for tenant isolation
- Derived billing state (amountPaid, isPaid, net) is NEVER stored — computed at query time
- Soft deletes use isDeleted boolean, all queries filter isDeleted !== true
```

---

## Phase 2: Core Admin CRUD

```
Build Phase 2: Core Admin CRUD pages for Planner App v2. The Phase 1 foundation (Next.js 15 + Convex + Clerk + shadcn/ui + admin layout) is already in place.

Reference these files for full context:
- @docs/SPEC.md — sections 1.2 (Calendar Editions), 1.3 (Advertisement Types), 1.4 (Contacts/CRM), 1.9 (Layouts), 1.10 (Events), plus schema in section 5
- @.cursor/rules/phase-2-admin-crud.mdc — exact build order, CRUD patterns, and page structure

What to build (in dependency order):

1. Address Books — convex/addressBooks/ queries + mutations, /admin/address-books page with list + create/edit dialog

2. Calendar Editions — convex/calendarEditions/ queries + mutations, /admin/calendars page with list (name, code, years active columns), create/edit dialog, soft-delete, year management

3. Advertisement Types — convex/advertisements/ + convex/adPricing/ queries + mutations, /admin/advertisements page with list (name, day/non-day type, pricing summary), create dialog with isDayType toggle, pricing config per calendar edition per year (12 monthly price fields), immutable after creation

4. Contacts / CRM — convex/contacts/ queries + mutations with full-text search index, /admin/contacts page with searchable TanStack Table (company, name, email), create/edit form with sections (basic info, address embedded object, telecom embedded object, address book multi-select), /admin/contacts/[id] detail page with tabs (Info, Purchases, Payments — purchase/payment tabs will be populated in Phase 3), soft-delete with email nullification

5. Events — convex/events/ queries + mutations, /admin/events page with list + FullCalendar alternate view, create/edit form (name, description, date, endDate, startTime, endTime, isYearly toggle, calendar edition multi-select)

6. Layouts & Ad Placements — convex/layouts/ + convex/adPlacements/ + convex/calendarEditionLayouts/ queries + mutations, /admin/layouts page with list, /admin/layouts/[id] layout builder with visual ad placement positioning (x, y, width, height, position), layout-to-edition+year assignment

Every entity follows the same pattern:
- Convex queries filter by orgId + isDeleted !== true
- Convex mutations include orgId from Clerk
- Page has list view with TanStack Table (sort, filter, paginate)
- Create/edit via Dialog or Sheet with React Hook Form + Zod validation
- Soft-delete with confirmation dialog
```

---

## Phase 3: Purchase Flow & Billing Engine

```
Build Phase 3: Purchase Flow & Billing Engine for Planner App v2. This is the HIGHEST-RISK phase — the billing logic is the core of the entire application. Phases 1-2 (foundation + admin CRUD) are already built.

Reference these files for full context:
- @docs/SPEC.md — sections 1.5 (Purchases) and 1.6 (Payment & Billing) — read these VERY carefully
- @.cursor/rules/phase-3-billing.mdc — NON-NEGOTIABLE billing rules, computation helpers, allocation engine, and build order

CRITICAL RULES (violating any of these creates the exact bugs we're rebuilding to fix):
- amountPaid = COMPUTED by summing payment allocations. NEVER stored.
- isPaid = COMPUTED by comparing amountPaid to net. NEVER stored.
- net = COMPUTED from totalSale - discounts + additionalSales - trade + lateFees - earlyDiscount. NEVER stored.
- Late fees = COMPUTED from dueDate < now AND not fully paid AND not waived. NO daily mutation. NO cron job. NO stored isLate field.
- Payment allocation = auto-allocate to EARLIEST unpaid scheduled payment first, in order.

What to build:

1. Billing Helper Functions FIRST (convex/billing/helpers.ts) — computeNet(), computeAmountPaid(), computeIsPaid(), computeLateFees(), isScheduledPaymentLate(), allocatePayment(), generateInvoiceNumber(). Build and verify ALL of these before touching any UI.

2. Purchase Creation Flow (/admin/purchases/new) — multi-step form:
   Step 1: Select Contact (searchable combobox)
   Step 2: Select Calendar Edition + Year
   Step 3: Select Ad Types + quantities per calendar
   Step 4: Assign Slots — day-type: month + slot number with 35-cap validation and real-time availability grid; non-day-type: quantity only
   Step 5: Payment Terms — totalSale, discount1, discount2, additionalSale1, additionalSale2, trade, earlyDiscountType/amount, lateFeeType/amount, dueDayOfMonth, splitEqually, deliveryMethod, invoiceMessage, statementMessage
   Step 6: Review & Confirm — summary with payment schedule preview

3. Slot Availability System — Convex query returning which slots (1-35) are taken per month, with real-time updates. Validate inside the mutation too, not just UI-side.

4. Purchase Creation Mutation — atomic: creates purchase + paymentTerms + adPurchases + adSlots + auto-generated scheduledPayments + invoice number (YY-NNNN format, sequential per edition+year)

5. Purchase Detail Page (/admin/purchases/[id]) — purchase info, ad placements table, payment terms display, scheduled payments table (with COMPUTED amountPaid, isLate, status), payment history table, actions (record payment, edit, delete)

6. Payment Recording — form (amount, date, method select, conditional check number), on submit: create payment + run allocation engine + create paymentAllocation records, UI updates reactively via Convex

7. Purchase Edit & Delete — edit reopens form with current values and recalculates scheduled payments, delete cascades: adPurchases → adSlots → scheduledPayments → payments → paymentAllocations

8. Late Fee Waiver — toggle on individual scheduled payments, excluded from net computation when waived
```

---

## Phase 4: Billing Views & Reporting

```
Build Phase 4: Billing Views & Reporting for Planner App v2. Phases 1-3 (foundation + CRUD + billing engine) are complete. The billing computation helpers from Phase 3 are ready to use.

Reference these files for full context:
- @docs/SPEC.md — sections 1.7 (Billing Views), 1.11 (Email), 1.12 (Print/Export)
- @.cursor/rules/phase-4-billing-views.mdc — view specifications, PDF generation, email integration

ALL financial figures MUST come from the Phase 3 computed helpers — never raw database fields.

What to build:

1. All Payments View (/admin/billing/payments) — TanStack Table with columns: date, contact (company), amount, method, check #, invoice #. Filters: year select, contact search. Sort by date desc default. Pagination 25/page. Query joins payments → purchases → contacts.

2. This Month View (/admin/billing/this-month) — scheduled payments due this month or overdue from past months. Columns: contact, invoice #, due date, amount due, amount paid (COMPUTED), status badge (paid/partial/overdue/upcoming). Red badge if isScheduledPaymentLate() returns true. Year filter. Quick "Record Payment" action per row.

3. Cash Flow Report (/admin/billing/cash-flow) — grid: rows = contacts, columns = Jan-Dec + Year Total. Each cell: projected (scheduled amount) vs actual (sum of allocations). Color coding: green (paid), yellow (partial), red (unpaid/overdue), gray (none due). MUST be scoped by calendar edition year (this fixes a critical v1 bug). Summary totals row. PDF export button.

4. Invoice View (/admin/purchases/[id]/invoice) — printable layout: operator header/logo, bill-to contact info, invoice #, line items (ad type, calendar, quantity, unit price, total), subtotals (total sale, discounts, additional sales, trade), net amount, payment terms, custom invoice message. Print + Download PDF buttons.

5. Statement View (/admin/contacts/[id]/statement) — contact header, all purchases table (invoice #, edition, year, net, amountPaid COMPUTED, balance COMPUTED), all payments table (date, amount, method, purchase), overall balance. Print + PDF download.

6. PDF Generation (src/lib/pdf/) — using pdf-lib: generateInvoicePdf(), generateCashFlowPdf(), generateStatementPdf(). Serve via Next.js API routes returning PDF downloads.

7. Email Integration — Resend setup in src/lib/email/, React Email templates in src/emails/ (invoice-email.tsx, statement-email.tsx). "Email Invoice" button on purchase detail. "Email Statement" button on contact detail. PDF attached to emails. Success/error toast notifications.
```

---

## Phase 5: Dashboard & Admin Polish

```
Build Phase 5: Dashboard & Admin Polish for Planner App v2. Phases 1-4 (foundation + CRUD + billing engine + billing views) are complete.

Reference these files for full context:
- @docs/SPEC.md — section 1.8 (Calendar Inventory / Dashboard)
- @.cursor/rules/phase-5-dashboard.mdc — inventory grid spec, stats, email, print, polish checklist

What to build:

1. Calendar Inventory Grid (/admin/dashboard) — filter bar: calendar edition select + year select. 12-column grid (Jan-Dec) showing ad slots per month. Day-type slots numbered 1-35 showing which company owns each. Non-day-type as separate section per month. Color-coded per advertiser (deterministic color from contact ID hash, legend at bottom). Click any occupied slot → link to purchase detail. Empty slots clearly shown.

2. Summary Stats Cards — 4 cards at top of dashboard: Total Revenue (sum of computed net values), Collection Rate (amountPaid/net as %), Outstanding Balance (net - amountPaid), Late Payments Count (count where isScheduledPaymentLate === true). ALL values computed from billing helpers.

3. Email Polish — verify Resend sends correctly with PDF attachments, professional React Email templates with operator branding, success/error toasts.

4. Print Optimization — @media print CSS: hide nav/buttons/chrome, clean layouts for calendar inventory, invoices, statements. window.print() from Print buttons.

5. Admin UX Polish — breadcrumb navigation on all sub-pages, active sidebar nav states, mobile responsive (sidebar → Sheet, tables → horizontal scroll), Skeleton loading states on every data view, error boundaries at route segment level with retry, empty states with friendly messages + action buttons, toast notifications (Sonner) on all mutations, consistent spacing and typography throughout.

This phase is about making the admin experience feel polished and production-ready. Every view should have proper loading, error, and empty states. Every action should give feedback. The dashboard should give Joyce an instant overview of her business.
```

---

## Phase 6: Public Community Site

```
Build Phase 6: Public Community Site for Planner App v2. The admin dashboard (Phases 1-5) is complete. Now build the public-facing community site.

Reference these files for full context:
- @docs/SPEC.md — sections 2.1-2.7 (Public Event Calendar, Business Directory, Coupons, Blog, Videos, User Accounts, Tenant Branding)
- @.cursor/rules/phase-6-public-site.mdc — architecture, SEO strategy, build order, Convex tables

Architecture: routes under src/app/(public)/ using route group (no /public in URL). ISR with 60-second revalidation. Lighter calendar than FullCalendar for bundle size. Tenant branding via CSS custom properties.

What to build:

1. Add Phase 2 Convex tables to schema: coupons, couponClaims, blogPosts, videos, categories, tenantBranding. With queries + mutations.

2. Public Layout (src/app/(public)/layout.tsx) — header (logo, nav: Events, Directory, Coupons, Blog, Videos, Sign In/Up), footer (operator info, copyright). Load tenantBranding from Convex, apply as CSS custom properties.

3. Homepage (/) — hero with operator branding, featured upcoming events, featured businesses (top advertisers), latest coupons grid, recent blog posts. All data server-side with ISR.

4. Event Calendar (/events) — interactive month view (lightweight custom component with date-fns, NOT FullCalendar), event cards per day, category filter, search. /events/[id] event detail page. /events/submit community event submission (requires auth, admin approval queue).

5. Business Directory (/directory) — grid/list view of active advertisers, search + category filter, sort by featured status. /directory/[slug] business detail with contact info, map embed (Google Maps or Leaflet), associated coupons/events.

6. Coupons (/coupons) — grid of active coupons (endDate >= today), card with image/title/business/dates. /coupons/[id] detail with claim button (requires auth, tracks in couponClaims). Expired auto-filtered.

7. Blog (/blog) — post list with featured image, title, excerpt, date. Category filter. /blog/[slug] full post with SEO meta, OG image, JSON-LD. Blog editor at /admin/blog/new using Novel rich text editor.

8. Videos (/videos) — video gallery grid, YouTube/Vimeo embed support, category filter, associated business links.

9. User Accounts — /auth/register community registration, /profile user profile with submissions, claimed coupons, favorites.

10. SEO — generateMetadata() on every page, OpenGraph images, JSON-LD structured data (Event, LocalBusiness schemas), sitemap.xml, robots.txt.

Public pages do NOT require auth to read. Use next/image for all images. Keep bundle lean — no heavy admin libraries on public pages.
```

---

## Phase 7: Client Self-Service Portal

```
Build Phase 7: Client Self-Service Portal for Planner App v2. Admin dashboard (Phases 1-5) and public site (Phase 6) are complete.

Reference these files for full context:
- @docs/SPEC.md — sections 3.1-3.6 (Client Dashboard, Ad Placement Requests, Payment History, Invoice Access, Asset Upload, Communication)
- @.cursor/rules/phase-7-client-portal.mdc — architecture, client-contact linking, portal query pattern

Architecture: routes under src/app/portal/, protected by Clerk middleware requiring 'client' role. Clients see ONLY their own data via contactId linked to their Clerk userId.

What to build:

1. Client-Contact Linking — add clientLinks table to Convex schema: { userId, contactId, orgId }. When admin invites a client (from contact detail page), create a Clerk invitation + clientLinks record. Portal queries resolve userId → contactId before fetching data.

2. Portal Layout (src/app/portal/layout.tsx) — simpler sidebar: Dashboard, My Ads, Payments, Invoices, Assets, Messages. Header with client company name + Clerk UserButton. Tenant-branded.

3. Client Dashboard (/portal) — summary cards: active ads count, next payment due (date + amount), outstanding balance. Upcoming payments list (next 3-5). Recent activity feed.

4. My Ads (/portal/ads) — list of all ad purchases for this client: calendar edition, year, ad types, slots, status. Browse available slots + submit placement request (creates pending request for admin approval).

5. Payment History (/portal/payments) — full payment history table: date, amount, method, invoice #, status. All computed from billing helpers. Year filter.

6. Invoices & Statements (/portal/invoices) — list of invoices, view/download individual invoices (reuse Phase 4 invoice view component), download account statement (reuse Phase 4 statement component).

7. Asset Upload (/portal/assets) — upload ad artwork images via Convex file storage. Add clientAssets table: { contactId, purchaseId, fileId, status (uploaded/reviewing/approved/rejected), feedback, orgId }. Status tracking for client.

8. Messages (/portal/messages) — add messages table: { contactId, orgId, content, senderRole, createdAt }. Simple real-time messaging via Convex subscriptions. Admin sees messages in /admin/contacts/[id] messages tab.

All portal Convex queries MUST: verify authenticated user's contactId via clientLinks, only return data for that contactId, use the same billing computation helpers as admin (never stored state).
```

---

## Phase 8: Data Migration & Launch

```
Build Phase 8: Data Migration & Launch for Planner App v2. All application features (Phases 1-7) are complete. Now migrate Joyce's production data from v1 PostgreSQL to v2 Convex.

Reference these files for full context:
- @docs/SPEC.md — sections 6 (Migration Plan) and 5 (Current Schema Issues & Fixes)
- @.cursor/rules/phase-8-migration.mdc — audit script, migration order, ID mapping, validation suite, cutover checklist

What to build:

1. Pre-Migration Audit Script (scripts/audit-v1-data.ts) — connects to v1 PostgreSQL (read-only), flags: amountPaid mismatches vs sum of allocations, incorrect isPaid flags, net values that don't account for late fees, orphaned FK records, null required fields. Output: migration-audit-report.json.

2. Migration Scripts (scripts/migrate/) — one file per table in FK dependency order:
   01-users.ts (create Clerk org + user, store mapping)
   02-address-books.ts
   03-contacts.ts (FLATTEN 4 v1 tables into 1 Convex document: Contact + ContactAddress + ContactTelecom + ContactInfo)
   04-calendar-editions.ts
   05-advertisements.ts
   06-layouts.ts (layouts + adPlacements + calendarEditionLayouts)
   07-events.ts (map calendarEdition many-to-many)
   08-purchases.ts (MERGE v1 PurchaseOverview + PaymentOverview into purchases + paymentTerms)
   09-ad-purchases.ts (adPurchases + adSlots, map from v1 AdvertisementPurchase + AdvertisementPurchaseSlot)
   10-scheduled-payments.ts (STRIP stored state — only migrate dueDate, amount, month, year, lateFeeWaived)
   11-payments.ts (convert date strings to Unix timestamps)
   12-payment-allocations.ts (map paymentId + scheduledPaymentId, drop paymentOverviewId)
   Plus: id-map.ts (Map<v1UUID, ConvexId> manager), utils.ts (date conversion, null handling), index.ts (orchestrator)

3. Idempotency — store v1 UUID in _migrationId field on each record. Before insert, check if _migrationId exists → skip. Safe to re-run.

4. Validation Suite (scripts/validate-migration.ts) — for every purchase: compute amountPaid/net/isPaid in v2, compare to v1 stored values, log mismatches (expected due to v1 bugs — v2 computed values are the correct ones). Count comparisons: contacts, purchases, payments, ad slots.

5. Delta Migration Script — for data entered during parallel testing period, migrate only new/changed records.

6. Cutover Checklist — deploy v2 to staging, Joyce parallel-tests 3-5 days, run delta migration, switch DNS, v1 to read-only 30 days, decommission after confirmation.

All date values must be converted from v1 mixed formats (strings/DateTime) to Unix timestamps. Migration uses individual Convex mutations (not bulk import) for better error handling and FK resolution.
```
