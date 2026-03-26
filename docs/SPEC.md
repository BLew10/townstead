# PLANNER APP v2 — Full Specification

> **Ground-Up Rewrite: Next.js 15 + Convex + Clerk**
> Multi-Tenant Calendar Ad Sales & Community Platform

---

## 1. Executive Summary

The Planner App v2 is a ground-up rewrite of Joyce's calendar ad sales management tool. It expands from an internal admin-only app into a full platform with three surfaces:

1. **Admin Dashboard** — for operators like Joyce
2. **Client Portal** — self-service for advertisers
3. **Public Community Site** — for local residents

Designed for multi-tenancy from day one (future TownPlanner-style operators).

### What Stays the Same

Core domain logic: calendar editions, ad types (day/non-day), ad slot purchasing, scheduled payments with allocation, late fee management, invoice generation, cash flow reporting.

### What Changes

| Layer | v1 | v2 |
|-------|----|----|
| Data | Prisma/PostgreSQL | Convex (reactive, TS-native schema) |
| Auth | NextAuth + bcrypt | Clerk (multi-tenant, role-based) |
| Schema | Over-normalized, circular refs, stored derived state | Clean, computed derived state |
| UI | Current patterns | Modern shadcn/ui + Radix + Tailwind v4 |
| Scope | Admin only | Admin + Public + Client Portal |

### Key Architectural Decisions

- Single Next.js App Router codebase: `/` (public), `/admin` (operators), `/portal` (clients), `/auth` (shared)
- Convex as backend — reactive queries, server functions, file storage, no separate API layer
- Clerk for auth with organization-based multi-tenancy (each operator = one Clerk org)
- Derived state (`amountPaid`, `isPaid`, `net` with late fees) computed at query time, never stored
- Cloudflare R2 for media storage via Convex file storage or direct R2 integration
- Vercel for hosting (free tier)

---

## 2. Phase 1: Admin Dashboard (Core Rebuild)

**Goal:** Full feature parity with current app + bug fixes + better UX.

### 1.1 Authentication & Multi-Tenancy

- Clerk-based auth with email/password
- Organization model: each operator gets isolated data via Clerk org ID on every Convex document
- Roles: owner, admin, viewer (extensible for Phase 3 client roles)
- Middleware-protected `/admin` routes; unauthenticated → `/auth/login`

### 1.2 Calendar Editions

- CRUD for calendar editions (name, code, soft-delete)
- Year-based edition management
- Layout assignment per edition per year

### 1.3 Advertisement Types

- CRUD with day-type vs non-day-type distinction
- Day-type: capped at 35 slots/month (one per calendar date cell)
- Non-day-type: unlimited quantity, outside date blocks
- Per-month pricing configuration
- Immutable after creation

### 1.4 Contacts / CRM

- Single unified contact document (not split across 4 tables)
- Embedded objects for address, telecom, contact info
- Address book tagging (many-to-many via array of `addressBookIds`)
- Full-text search on company, name, email
- Contact overview: info, purchase history, payment history, scheduled payments
- Soft-delete with email nullification (preserving history)
- Category and notes fields

### 1.5 Purchases (Ad Sales)

- Purchase flow: select contact → edition year → calendars → ad types → assign slots → pricing → payment terms
- Real-time slot availability with conflict detection (Convex reactive queries)
- Day-type slot assignment: month + slot number + optional date, validated against 35-slot cap
- Non-day-type: quantity-based, no slot assignment
- Purchase overview showing all placements
- Edit/delete with cascading cleanup

### 1.6 Payment & Billing (Rebuilt from Scratch)

**Payment Terms** (per purchase):
- Total sale, discounts (2 slots), additional sales (2 slots), trade
- Early payment discount (flat or %), late fee (flat or %)
- Payment due day of month, split equally option
- Delivery method, invoice/statement messages

**Scheduled Payments:**
- Auto-generated from payment terms
- Each has: due date, amount, month, year

**Payments:**
- Manual recording (check, credit card, cash)
- Date, amount, method, check number
- No Stripe — Joyce records by hand

**Payment Allocation:**
- Auto-allocates to earliest unpaid scheduled payments in order
- Partial payments tracked

**Critical v2 Fixes:**
- `amountPaid` = COMPUTED (sum of payment allocations)
- `isPaid` = COMPUTED (sum of payments vs net)
- `net` = COMPUTED (totalSale + adjustments + applicable late fees)
- Late fees computed at query time (no daily mutation, no race conditions)
- Late fee waiver = boolean on scheduled payment
- Invoice numbers: sequential per edition year, format `YY-NNNN`, atomic Convex mutation
- Prepaid payments: regular payment with `prepaid` flag

### 1.7 Billing Views

- **All Payments:** paginated, searchable, filterable by year
- **This Month:** scheduled payments due/overdue this month with late indicators
- **Cash Flow Report:** projected vs actual by month per contact, year totals, PDF export
- **Invoice View:** printable/downloadable per purchase
- **Statement View:** payment history and balance per contact across editions

### 1.8 Calendar Inventory / Dashboard

- Visual grid: slot occupancy per month per edition per year
- Color-coded by advertiser
- Click-to-view purchase details
- Summary stats: total revenue, collection rate, outstanding balance, late payments

### 1.9 Layouts

- Layout builder for ad placement positions
- Ad placements: x, y, width, height, position (top/bottom)
- Layout assignment to edition + year (single join table)

### 1.10 Events

- Event CRUD: name, description, date, multi-day, start/end times
- Yearly recurring (`isYearly` flag)
- Many-to-many with calendar editions
- Calendar export view for printing

### 1.11 Email

- Resend as provider (replacing Mailgun/Mailjet)
- PDF attachment support for invoices
- React Email for templates

### 1.12 Print / Export

- Calendar inventory print view
- Cash flow report PDF
- Invoice PDF

---

## 3. Phase 2: Public-Facing Community Site

**Goal:** Replace TownPlanner-hosted public site.

### 2.1 Public Event Calendar

- Interactive calendar (month/week/day) with approved events
- Event detail pages, category filtering, search
- Community event submission with admin approval (requires account)

### 2.2 Business Directory

- Searchable, filterable advertiser directory
- Business detail pages with contact info, address, category, web link
- Map integration, sorted by ad tier / featured status

### 2.3 Coupons & Deals

- Browsable grid with images, descriptions, terms
- Valid date range, quantity limit, redemption tracking
- Download/print, expired auto-hidden
- Coupon claim tracking (requires user account)

### 2.4 Blog / Content

- Rich text posts with images and video embeds (Novel editor)
- Authored by admin or client businesses (with approval)
- Category tagging, search, SEO-optimized

### 2.5 Videos

- Video gallery: embedded YouTube/Vimeo or uploaded
- Associated with businesses, categorized

### 2.6 User Accounts

- Community member registration via Clerk
- Profile management, event submission, coupon claims, favorites

### 2.7 Tenant Branding

- Per-org customization: logo, primary color, site name, tagline
- Applied via CSS variables and metadata

---

## 4. Phase 3: Client Self-Service Portal

**Goal:** Advertisers manage their own accounts.

### 3.1 Client Dashboard

- Overview of active ads, upcoming payments, account balance

### 3.2 Ad Placement Requests

- Browse available slots and request placements (admin approval required)

### 3.3 Payment History

- Full payment history with status indicators

### 3.4 Invoice Access

- View/download invoices and statements

### 3.5 Asset Upload

- Upload ad artwork and assets for admin review

### 3.6 Communication

- In-app messaging or notification system with admin

---

## 5. Convex Schema Design

All tables include `orgId` (Clerk organization ID) for tenant isolation.

### Core Tables

| Table | Key Fields |
|-------|-----------|
| `calendarEditions` | name, code, orgId, isDeleted |
| `advertisements` | name, isDayType, orgId, isDeleted |
| `adPricing` | advertisementId, calendarEditionId, year, monthlyPrices (object with jan-dec) |
| `contacts` | company, firstName, lastName, email, phone, address (embedded), addressBookIds[], orgId, isDeleted |
| `addressBooks` | name, orgId |
| `purchases` | contactId, calendarEditionId, year, invoiceNumber, orgId, isDeleted |
| `paymentTerms` | purchaseId, totalSale, discount1/2, additionalSale1/2, trade, earlyDiscountType/amount, lateFeeType/amount, dueDayOfMonth, splitEqually, deliveryMethod, invoiceMessage, statementMessage |
| `adPurchases` | purchaseId, advertisementId, quantity |
| `adSlots` | adPurchaseId, month, slotNumber, date |
| `scheduledPayments` | purchaseId, dueDate, amount, month, year, lateFeeWaived |
| `payments` | purchaseId, amount, date, method, checkNumber, isPrepaid |
| `paymentAllocations` | paymentId, scheduledPaymentId, amount |
| `layouts` | name, orgId |
| `adPlacements` | layoutId, advertisementId, x, y, width, height, position |
| `calendarEditionLayouts` | calendarEditionId, layoutId, year |
| `events` | name, description, date, endDate, startTime, endTime, isYearly, calendarEditionIds[], orgId, isDeleted |

### Phase 2 Tables

| Table | Key Fields |
|-------|-----------|
| `coupons` | businessContactId, title, description, imageFileId, startDate, endDate, quantityLimit, orgId |
| `couponClaims` | couponId, userId, claimedAt |
| `blogPosts` | title, slug, content, authorId, categoryIds[], status, publishedAt, orgId |
| `videos` | title, description, url, fileId, businessContactId, categoryId, orgId |
| `categories` | name, type (event/blog/video/business), orgId |
| `tenantBranding` | orgId, logo, primaryColor, siteName, tagline |

### Index Strategy

Every query filter path gets an explicit Convex index:
- `by_orgId` on all tables
- `by_orgId_and_calendarEditionId` on purchases, adPricing, events
- `by_purchaseId` on paymentTerms, adPurchases, scheduledPayments, payments
- `by_paymentId` on paymentAllocations
- `by_email` on contacts
- `by_slug` on blogPosts

---

## 6. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Backend/DB | Convex |
| Auth | Clerk |
| UI | shadcn/ui + Radix + Tailwind CSS v4 |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table v8 |
| Calendar | FullCalendar React |
| State | Convex reactive queries (Zustand for ephemeral UI only) |
| Email | Resend + React Email |
| PDF | pdf-lib or jspdf |
| Media | Convex File Storage + Cloudflare R2 |
| Hosting | Vercel (free tier) |
| Rich Text | Novel (Tiptap-based) |

---

## 7. Migration Plan

### Approach: Parallel Run

1. Build v2 Phase 1 to feature parity
2. Write migration scripts (PostgreSQL → Convex)
3. Validate migrated data
4. Parallel testing (3-5 days)
5. Cutover with 30-day v1 read-only safety net

### Migration Order

1. Users (Clerk org + user)
2. Address books
3. Contacts (flatten 4 tables → 1 document)
4. Calendar editions
5. Advertisements
6. Layouts + ad placements + calendar edition layouts
7. Events
8. Purchases (merge PurchaseOverview + PaymentOverview)
9. Ad purchases + ad slots
10. Scheduled payments (strip stored state)
11. Payments
12. Payment allocations

### ID Mapping

In-memory `Map<string, Id<TableName>>` during migration. V1 UUIDs stored in migration metadata field for idempotent re-runs.
