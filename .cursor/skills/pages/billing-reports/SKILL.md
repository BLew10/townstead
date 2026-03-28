name: billing-reports
description: Context for all billing report pages and the billing computation engine. Use when modifying billing reports (payments, this-month, cash-flow), billing queries, billing helpers, derived state calculations, or payment-related logic. Triggers on routes /admin/billing/*, or mentions of "billing", "cash flow", "payments report", "this month", "derived state", "net calculation", "late fees", "early discount".

## Page Locations

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/admin/billing/layout.tsx` | 50 | Tab navigation: Payments, This Month, Cash Flow |
| `src/app/admin/billing/payments/page.tsx` | 98 | All payments list with year filter |
| `src/app/admin/billing/payments/columns.tsx` | 91 | Payment table columns (date, contact, amount, method, check#, invoice#) |
| `src/app/admin/billing/this-month/page.tsx` | 120 | Scheduled payments due this month + overdue |
| `src/app/admin/billing/this-month/columns.tsx` | 118 | This-month columns with status badges + "Record Payment" action |
| `src/app/admin/billing/cash-flow/page.tsx` | 259 | 12-month projected vs. actual grid per contact, filtered by edition+year |
| `convex/billing/queries.ts` | 702 | All billing queries (listPayments, listThisMonth, getCashFlowReport, getInvoiceData, getStatementData, getStatementDataByPurchase) |
| `convex/billing/helpers.ts` | 281 | Pure billing computation functions -- the heart of derived state |
| `src/components/admin/billing-bulk-email-menu.tsx` | 261 | Bulk send invoices/statements via row selection |
| `src/hooks/use-stable-now.ts` | 16 | Memoized midnight timestamp for Convex query cache stability |

## Component Tree

```
BillingLayout (tab nav)
  +-- PaymentsPage
  |     year filter (Select) + BillingBulkEmailMenu + DataTable<PaymentRow>
  +-- ThisMonthPage
  |     year filter + BillingBulkEmailMenu + overdue/upcoming badges + DataTable<ThisMonthRow>
  +-- CashFlowPage
        edition filter + year filter + Export PDF button + custom HTML <table> grid
```

## Key Dependencies

- Queries: `api.billing.queries.listPayments`, `listThisMonth`, `getCashFlowReport`, `getInvoiceData`, `getStatementData`, `getStatementDataByPurchase`
- Helpers: `computeNet`, `computeAmountPaid`, `computeLateFees`, `computeEarlyDiscount`, `computeBaseNet`, `computeIsPaid`, `isScheduledPaymentLate`, `computeScheduledPaymentPaid`, `allocatePayment`, `generateInvoiceNumber`, `generateScheduledPayments`, `enumerateMonthRange`
- Hooks: `useOrg` (orgId), `useStableNow` (midnight timestamp)
- Shared UI: `DataTable`, `DataTableColumnHeader`, `BillingBulkEmailMenu`
- Cash flow additionally queries `api.calendarEditions.queries.list` for edition picker.

## Schema Relationships

```
contacts (1) --< purchases (1) --< adPurchases
                     |
                     +--< paymentTerms (1:1 via index)
                     |
                     +--< scheduledPayments --< paymentAllocations >-- payments
                     |                                                    ^
                     +----------------------------------------------------+
```

- `purchases.contactId` -> contacts
- `purchases.calendarEditionIds[]` -> calendarEditions
- `paymentTerms.purchaseId` -> purchases (1:1, queried with `.first()`)
- `scheduledPayments.purchaseId` -> purchases (one per due-date month)
- `payments.purchaseId` -> purchases
- `paymentAllocations.paymentId` -> payments
- `paymentAllocations.scheduledPaymentId` -> scheduledPayments

All money values are **integer cents**. All dates are **Unix timestamps (ms)**.

## Derived State Rules (CRITICAL -- NON-NEGOTIABLE)

These values are NEVER stored in the database. They are computed at query time.

### net (total amount owed)

```
net = totalSale - discount1 - discount2 + additionalSale1 + additionalSale2 - trade + lateFees - earlyDiscount
```

Computed by `computeNet(terms, scheduledPayments, allocations, now)`.

### amountPaid

```
amountPaid = sum of all paymentAllocations.amount
```

Computed by `computeAmountPaid(allocations)`.

### isPaid

```
isPaid = amountPaid >= net
```

Computed by `computeIsPaid(net, amountPaid)`.

### earlyDiscount

Per spec: an upfront line-item subtraction, always applied when present. NOT conditional on payment timing.

```
flat:    earlyDiscount = earlyDiscountAmount
percent: earlyDiscount = round(totalSale * earlyDiscountAmount / 100)
```

Computed by `computeEarlyDiscount(terms)`.

### lateFees

A scheduled payment is "late" when `dueDate < now && paidAmount < amount && !lateFeeWaived`.

```
flat:    lateFees = lateCount * lateFeeAmount
percent: lateFees = lateCount * round(totalSale * lateFeeAmount / 100)
```

Computed by `computeLateFees(terms, scheduledPayments, allocations, now)`. Depends on `isScheduledPaymentLate(sp, allocations, now)`.

### balance

```
balance = max(0, net - amountPaid)
```

Computed inline in queries (not a standalone helper).

## Billing Helper Functions

| Function | Signature | What it does |
|----------|-----------|-------------|
| `isScheduledPaymentLate` | `(sp, allocations, now) -> boolean` | True when `dueDate < now`, not fully paid, and `lateFeeWaived` is falsy |
| `computeScheduledPaymentPaid` | `(spId, allocations) -> number` | Sum of allocation amounts for one scheduled payment |
| `computeLateFees` | `(terms, scheduledPayments, allocations, now) -> number` | Total late fees across all late scheduled payments |
| `computeEarlyDiscount` | `(terms) -> number` | Early discount amount (flat or percent of totalSale) |
| `computeNet` | `(terms, scheduledPayments, allocations, now) -> number` | Full net calculation with all adjustments |
| `computeBaseNet` | `(terms) -> number` | Net before late fees and early discount; used to split scheduled payment amounts at purchase creation |
| `computeAmountPaid` | `(allocations) -> number` | Sum of all allocation amounts |
| `computeIsPaid` | `(net, amountPaid) -> boolean` | Whether amountPaid covers net |
| `allocatePayment` | `(amount, scheduledPayments, existingAllocations) -> AllocationPlan[]` | Distributes a payment across scheduled payments in due-date order, filling oldest first |
| `generateInvoiceNumber` | `(db, year, orgId) -> Promise<string>` | Auto-increments invoice numbers as `YYNNNN` (e.g., `250001`) |
| `generateScheduledPayments` | `(opts) -> ScheduledPaymentInput[]` | Generates scheduled payment entries from terms (equal split or custom schedule), using integer math with remainder on last entry |
| `enumerateMonthRange` | `(startMonth, startYear, endMonth, endYear) -> {month,year}[]` | Lists all (month, year) pairs in an inclusive range |

## Report-Specific Logic

### Payments page (`listPayments`)
- Flat list of all `payments` docs, optionally filtered by year via `by_orgId_and_date` index.
- Enriches each payment with purchase.invoiceNumber and contact name/company.
- Sorted descending by date.

### This Month page (`listThisMonth`)
- Queries `scheduledPayments` for the target year plus any past-year overdue entries.
- Computes per-row status: `paid | partial | overdue | upcoming`.
- Requires `now` arg (from `useStableNow`) for late-fee and overdue determination.
- Shows overdue/upcoming counts in header badges.

### Cash Flow page (`getCashFlowReport`)
- Scoped to a single `calendarEditionId` + year.
- Builds a 12-month grid: each cell has `projected` (scheduled payment amount) and `actual` (sum of allocations).
- Merges multiple purchases per contact into one row.
- Summary row sums all contacts per month + year total.
- Client-side `getCellStatus()` determines cell color: paid (green), partial (yellow), overdue (red), none (muted).
- Supports PDF export via `/api/pdf/cash-flow`.

### Invoice & Statement queries
- `getInvoiceData`: Single purchase with line items, scheduled payments (with paid/late enrichment), payments, and computed net/amountPaid/balance.
- `getStatementData`: All purchases for a contact, aggregated balance.
- `getStatementDataByPurchase`: Running-balance ledger with interleaved late-fee and payment entries; computes pastDueAmount and next payment due.

## Bulk Email

`BillingBulkEmailMenu` accepts selected rows, deduplicates by purchaseId, and sequentially POSTs to `/api/email/invoice` or `/api/email/statement`. Shows a confirmation dialog listing recipients and skipping rows without email. Displays a progress spinner during send.

## Key Patterns

- **`useStableNow` for cache stability**: Queries needing "now" accept it as an arg (never use `Date.now()` inside a Convex query). The hook memoizes midnight-today so the query args stay identical across re-renders.
- **orgId passed as arg**: These billing queries accept `orgId` as an explicit arg (not extracted from auth). This matches the existing pattern in this codebase for billing views. Do not refactor to server-side auth extraction without updating all call sites.
- **Allocation-based accounting**: Payments are never directly compared to purchases. Instead, payments create `paymentAllocations` linking to specific `scheduledPayments`. All "amount paid" calculations go through allocations.
- **Integer cent math**: All money is integer cents. `formatCurrency(cents)` divides by 100 for display. Never use floating point for money.
- **Soft-delete filtering**: All purchase queries filter `isDeleted !== true`. Payments/allocations are not soft-deleted.

## Lessons Learned

(empty)
