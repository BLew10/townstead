name: admin-dashboard
description: Context for the admin dashboard and print inventory pages. Use when modifying the calendar inventory grid, stats cards, advertiser legend, dashboard filters, or print layout. Triggers on routes /admin (dashboard), /admin/print, or mentions of "dashboard", "inventory grid", "stats cards", "print inventory", "calendar grid".

## Page Locations

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/admin/page.tsx` | 325 | Main dashboard page with filters, stats, grid, legend |
| `src/app/admin/print/page.tsx` | 290 | Print inventory with multi-edition/ad-type selection, PDF download |
| `src/components/admin/dashboard/stats-cards.tsx` | 73 | Four KPI cards (revenue, collection rate, outstanding, late payments) |
| `src/components/admin/dashboard/calendar-inventory-grid.tsx` | 229 | 12-month day-slot grid + non-day ad placement rows |
| `src/components/admin/dashboard/advertiser-legend.tsx` | 35 | Color-coded advertiser legend strip |
| `convex/dashboard/queries.ts` | 308 | All dashboard backend queries and stats computation |
| `src/lib/colors.ts` | 45 | Deterministic contact color palette and contrast util |
| `src/hooks/use-stable-now.ts` | 16 | Midnight-rounded timestamp for Convex query caching |

## Component Tree

```
AdminDashboardPage (src/app/admin/page.tsx)
  -- Filter controls: edition Select, year Select, advertiser Popover/Command
  -- Print button (window.print())
  -- Active filter badges (Badge with colored backgrounds)
  -- Print-only header (hidden on screen, visible in print)
  -- StatsCards (stats-cards.tsx)
  -- CalendarInventoryGrid (calendar-inventory-grid.tsx)
  -- AdvertiserLegend (advertiser-legend.tsx)

AdminPrintInventoryPage (src/app/admin/print/page.tsx)
  -- Year Select
  -- Edition checkbox list, Advertisement type checkbox list
  -- Print + Download PDF buttons
  -- Per-edition sections, each with:
     -- CalendarInventoryGrid (reused)
  -- AdvertiserLegend (reused, aggregated contacts)
```

## Key Dependencies

### Convex Queries
- `api.calendarEditions.queries.list` -- lists active editions for org (used by both pages)
- `api.dashboard.queries.getDashboardSlots` -- returns `{ slots, contacts }` for one edition+year
- `api.dashboard.queries.getDashboardStats` -- returns `{ totalRevenue, collectionRate, outstandingBalance, latePaymentsCount }`
- `api.dashboard.queries.getPrintInventoryData` -- returns `{ editions: [{ editionId, editionName, slots }], contacts }` for multi-edition print
- `api.advertisements.queries.list` -- lists advertisement types (print page only)

### Hooks
- `useOrg()` -- returns `{ orgId, isReady }` from Clerk
- `useStableNow()` -- memoized midnight timestamp, avoids Convex cache invalidation

### Lib Utilities
- `getContactColor(id: string)` -- deterministic HSL color from a 20-color palette via hash
- `getContrastText(hsl: string)` -- returns `"#ffffff"` or `"#1a1a1a"` based on lightness threshold (55%)
- `formatCurrency(cents: number)` -- from `src/lib/utils.ts`, divides by 100 for display

## Schema Relationships

```
calendarEditions  (name, code, orgId)
       |
       v  [calendarEditionId + year]
    adSlots  (adPurchaseId, advertisementId, calendarEditionId, year, month, slotNumber?)
       |
       v  [adPurchaseId]
  adPurchases  (purchaseId, advertisementId, calendarEditionId, quantity, charge?)
       |
       v  [purchaseId]
   purchases  (contactId, calendarEditionIds[], year, invoiceNumber?)
       |
       v  [contactId]
    contacts  (firstName, lastName, company, ...)

dashboardStatsCache  (orgId, calendarEditionId, year, totalRevenue, totalAmountPaid, latePaymentsCount, computedAt)
  -- Precomputed stats; getDashboardStats reads cache first, falls back to live computation
```

### Key Indexes Used
- `adSlots.by_calendarEdition_year_month` -- primary query path for slot grid data
- `purchases.by_orgId_and_year` -- used by stats computation to find edition purchases
- `dashboardStatsCache.by_org_edition_year` -- single-row cache lookup

## Dashboard Data Flow

### getDashboardSlots
1. Queries `adSlots` by calendarEditionId + year using compound index
2. For each slot, walks: `adSlot` -> `adPurchase` -> `purchase` -> `contact` + `advertisement`
3. Uses in-memory caches (`Map`) to avoid re-fetching the same purchase/contact/ad
4. Returns enriched slot objects: `{ _id, month, slotNumber, contactId, contactName, company, advertisementName, isDayType, purchaseId }`
5. Also returns deduplicated `contacts` array: `{ id, company }`

### getDashboardStats
1. Checks `dashboardStatsCache` for precomputed row
2. If cache hit: computes `collectionRate` and `outstandingBalance` from cached totals
3. If cache miss: calls `computeDashboardStatsFromDb` which iterates all purchases for the edition+year, loading paymentTerms + scheduledPayments + paymentAllocations to compute net/amountPaid/lateCount using billing helpers (`computeNet`, `computeAmountPaid`, `isScheduledPaymentLate`)

### Client-side Filtering
- `selectedContactIds` (Set) filters slots and contacts client-side via `useMemo`
- Changing edition or year resets the contact filter (`useEffect`)
- Filter state lives in React `useState`, not URL params

## Color System

`src/lib/colors.ts` provides a 20-color HSL palette. Colors are assigned deterministically:

1. `getContactColor(contactId)` hashes the ID string (multiply-and-add, mod palette length)
2. Same contact always gets the same color across all views
3. `getContrastText(hsl)` parses lightness from the HSL string; returns white for L<=55, dark for L>55
4. Used in: grid cells, filter badges, advertiser legend, tooltip color dots
5. Multi-occupant day slots use a CSS `linear-gradient(135deg, ...)` with equal-width color stops

## Print Inventory

The print page (`/admin/print`) differs from the dashboard:
- Supports **multiple editions** simultaneously (checkbox list vs. single select)
- Supports **advertisement type filtering** (checkbox list of `advertisements`)
- Uses `getPrintInventoryData` which loops `enrichSlotsForEdition` per selected edition
- Renders one `CalendarInventoryGrid` section per edition (with edition name heading)
- No StatsCards -- print is inventory-only
- PDF download via `/api/pdf/inventory` route with query params: `year`, `editionIds`, `adIds`
- `buildPdfUrl()` constructs the URL; omits `adIds` param when all ads selected
- Both `window.print()` and PDF download available as separate actions

## Key Patterns

### Skeleton Loading
- Dashboard: 4 stat card skeletons + full-width grid skeleton while queries resolve
- Print: header skeleton + filter panel skeleton + grid skeleton
- StatsCards handles its own loading internally (per-card skeleton when `stats` is undefined)

### useStableNow
- Rounds `Date.now()` to midnight, memoized once per component mount
- Passed as `now` arg to `getDashboardStats` to avoid Convex cache invalidation
- Only used by stats query (slots query does not need current time)

### Print CSS
- Filter controls are `print:hidden`
- A separate print-only header block is `hidden print:block`
- Grid uses `print:grid-cols-4` and `print:grid-cols-12` responsive overrides

### Navigation from Grid
- Clicking any occupied slot cell navigates to `/admin/purchases/{purchaseId}`
- Uses `router.push()` from `next/navigation`

## Lessons Learned

(empty -- add entries as issues arise)
