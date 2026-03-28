name: purchase-wizard
description: Context for the multi-step purchase creation and edit wizard. Use when modifying purchase creation, purchase editing, payment terms, line items, ad slot assignment, payment schedule generation, or any purchase-related mutations. Triggers on routes /admin/purchases/new, /admin/purchases/[id]/edit, or mentions of "purchase wizard", "payment terms", "ad slots", "line items", "payment schedule", "ad placements".

## Page Locations

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/admin/purchases/new/page.tsx` | 339 | New purchase wizard page (state owner) |
| `src/app/admin/purchases/[id]/edit/page.tsx` | 398 | Edit purchase wizard (loads existing data via `getDetail`) |
| `src/app/admin/purchases/new/steps/select-contact.tsx` | 121 | Step 0: Contact picker |
| `src/app/admin/purchases/new/steps/select-edition-year.tsx` | 138 | Step 1: Calendar edition + year selector |
| `src/app/admin/purchases/new/steps/select-ad-types.tsx` | 475 | Step 2: Ad type grid with quantity/charge per edition |
| `src/app/admin/purchases/new/steps/assign-slots.tsx` | 386 | Slot assignment grid (used inside SlotPlacementModal) |
| `src/app/admin/purchases/new/steps/slot-placement-modal.tsx` | 519 | Modal for placing ads into month/slot grids |
| `src/app/admin/purchases/new/steps/payment-terms-step.tsx` | 1029 | Step 3: Payment terms form (RHF + Zod) |
| `src/app/admin/purchases/new/steps/review-confirm.tsx` | 295 | Step 4: Read-only summary before submission |
| `convex/purchases/mutations.ts` | 445 | `create`, `update`, `softDelete` mutations |
| `convex/purchases/queries.ts` | 273 | `list`, `getById`, `getDetail`, `listByContact` queries |
| `convex/billing/helpers.ts` | 281 | Pure functions: net, fees, schedule generation |
| `src/lib/validators.ts` | L72-105 | `paymentTermsSchema` Zod schema |
| `src/components/shared/step-form.tsx` | 172 | Reusable step wizard shell |

## Component Tree

```
NewPurchasePage / EditPurchasePage (state owner)
  +-- PageHeader
  +-- StepForm (steps, navigation, validation gate)
       +-- Step 0: SelectContact
       +-- Step 1: SelectEditionYear
       +-- Step 2: SelectAdTypes
       |    +-- SlotPlacementModal (per ad/edition cell)
       |         +-- DayTypeGrid | NonDayTypeGrid (12 months)
       +-- Step 3: PaymentTermsStep (forwardRef, RHF form)
       +-- Step 4: ReviewConfirm
```

## Key Dependencies

### Convex Queries
- `contacts.queries.list` -- Step 0 contact list
- `calendarEditions.queries.list` -- Step 1 edition checkboxes
- `advertisements.queries.list` -- Step 2 ad type rows
- `adSlots.queries.getSlotAvailability` -- Slot grids (taken/available state)
- `purchases.queries.getDetail` -- Edit page hydration

### Convex Mutations
- `purchases.mutations.create` -- Insert purchase + paymentTerms + adPurchases + adSlots + scheduledPayments
- `purchases.mutations.update` -- Replace-all strategy: deletes old children, re-inserts
- `purchases.mutations.softDelete` -- Cascading hard-delete of children, then `isDeleted: true`

### Schema Tables (key fields)
- **purchases**: `contactId`, `calendarEditionIds[]`, `year`, `invoiceNumber`, `orgId`, `isDeleted`
- **paymentTerms**: `purchaseId`, `totalSale`, `discount1/2`, `additionalSale1/2`, `trade`, `earlyDiscount*`, `lateFee*`, `dueDayOfMonth`, `splitEqually`, `scheduleStart/EndMonth/Year`, `deliveryMethod`, `invoiceMessage`, `statementMessage`
- **adPurchases**: `purchaseId`, `advertisementId`, `calendarEditionId`, `quantity`, `charge`
- **adSlots**: `adPurchaseId`, `advertisementId`, `calendarEditionId`, `year`, `month`, `slotNumber`, `date`
- **scheduledPayments**: `purchaseId`, `dueDate`, `amount`, `month`, `year`, `lateFeeWaived`
- **payments**: `purchaseId`, `amount`, `date`, `method`, `checkNumber`, `isPrepaid`
- **paymentAllocations**: `paymentId`, `scheduledPaymentId`, `amount`

### Shared Components
- `StepForm` (`src/components/shared/step-form.tsx`) -- step indicator + nav buttons
- `PageHeader` (`src/components/shared/page-header.tsx`)
- `EmptyState` (`src/components/shared/empty-state.tsx`)

### Hooks
- `useOrg()` -- returns `{ orgId, orgName, isReady }` from Clerk
- `useStableNow()` -- memoized midnight timestamp (avoids Convex cache busting)

### Validators
- `paymentTermsSchema` (`src/lib/validators.ts` L72-105) -- Zod, validates dollars on client
- `paymentTermsValidator` (`convex/purchases/mutations.ts` L41-78) -- Convex `v.object`, validates cents on server

### Lib Utilities
- `dollarsToCents` / `centsToDollars` (`src/lib/utils.ts`)
- `computeBaseNet`, `computeNet`, `computeLateFees`, `computeEarlyDiscount` (`convex/billing/helpers.ts`)
- `generateScheduledPayments`, `enumerateMonthRange` (`convex/billing/helpers.ts`)
- `allocatePayment` (`convex/billing/helpers.ts`)
- `generateInvoiceNumber` (`convex/billing/helpers.ts`)
- `getContactColor`, `getContrastText` (`src/lib/colors.ts`)

## Schema Relationships

```
purchases (1) --> (1) paymentTerms        [paymentTerms.purchaseId]
purchases (1) --> (N) adPurchases         [adPurchases.purchaseId]
adPurchases (1) --> (N) adSlots           [adSlots.adPurchaseId]
purchases (1) --> (N) scheduledPayments   [scheduledPayments.purchaseId]
purchases (1) --> (N) payments            [payments.purchaseId]
payments (1) --> (N) paymentAllocations   [paymentAllocations.paymentId]
scheduledPayments (1) --> (N) paymentAllocations [paymentAllocations.scheduledPaymentId]
purchases (N) --> (1) contacts            [purchases.contactId]
adPurchases (N) --> (1) advertisements    [adPurchases.advertisementId]
adPurchases (N) --> (1) calendarEditions  [adPurchases.calendarEditionId]
```

## Step-by-Step Flow

### Step 0 -- SelectContact
Queries `contacts.queries.list`. User searches and clicks a contact row. Stores `contactId` + `contactLabel` in parent `formState`.

### Step 1 -- SelectEditionYear
Queries `calendarEditions.queries.list`. Multi-select checkboxes for editions, year dropdown. Stores `calendarEditionIds[]`, `editionNames[]`, `year`.

### Step 2 -- SelectAdTypes
Queries `advertisements.queries.list`. Renders a matrix: rows = ad types, columns = editions. Each cell has quantity (int) + charge (dollars) inputs. If `advertisement.slotsPerMonth > 0`, a "Place" button opens `SlotPlacementModal`. Produces `adSelections[]` and `slotAssignments[]`. On transition to Step 3, `suggestedTotal` (sum of charges) pre-fills `totalSale`.

### Step 3 -- PaymentTermsStep
React Hook Form backed by `paymentTermsSchema`. Sections: Pricing (totalSale, discounts, additionalSales, trade), Fee Config (earlyDiscount, lateFee -- each flat or percent), Payment Schedule (start/end month-year range, dueDayOfMonth, splitEqually vs custom), Delivery & Messages. Real-time net displayed. Uses `forwardRef` + `useImperativeHandle` to expose `validate()` to parent. Parent calls `paymentTermsRef.current.validate()` on "Continue".

### Step 4 -- ReviewConfirm
Read-only. Calls `computeBaseNet` and `generateScheduledPayments` client-side to preview the payment schedule. Displays contact, editions, ad placements with slot badges, pricing breakdown, and the generated schedule.

### Submission
Parent page calls `createPurchase` / `updatePurchase` mutation. All dollar values converted to cents via `paymentTermsToCents()` before sending. Mutation writes to 5 tables: purchases, paymentTerms, adPurchases, adSlots, scheduledPayments. Then schedules `recomputeStatsCache` for dashboard invalidation.

## Derived State Rules (NON-NEGOTIABLE)

These values are NEVER stored -- always computed at query time:

- **baseNet** = `totalSale - discount1 - discount2 + additionalSale1 + additionalSale2 - trade`
- **net** = `baseNet + lateFees - earlyDiscount` (full formula in `computeNet`)
- **amountPaid** = sum of all `paymentAllocations.amount` for this purchase
- **isPaid** = `amountPaid >= net`
- **lateFees** = count of late scheduledPayments * fee amount (flat or % of totalSale). A scheduledPayment is late when `dueDate < now && paidAmount < sp.amount && !lateFeeWaived`.
- **earlyDiscount** = always applied as upfront line-item subtraction (flat $ or % of totalSale). NOT conditional on timing.

Stored via mutation at creation time: `scheduledPayments` rows (amount per month, dueDate). These are regenerated on update.

## Impact Map

Changes to the purchase wizard can affect:
- **Purchase detail page** (`/admin/purchases/[id]`) -- reads `getDetail`, shows terms/schedule/payments
- **Purchase list** (`/admin/purchases`) -- reads `list`, shows computed net/isPaid/hasLate
- **Contact detail** -- `listByContact` query
- **Billing views** (`convex/billing/queries.ts`) -- cash flow, this month, statements, invoices
- **Dashboard stats** -- `recomputeStatsCache` is triggered after create/update/delete
- **Calendar inventory grid** -- `adSlots.queries.getSlotAvailability` used in both wizard and dashboard

## Key Patterns

### Wizard State Architecture
All form data lives in a single `PurchaseFormState` (or `EditFormState`) object in the parent page via `useState`. Steps receive slices as props and call `onChange` callbacks to update. No Zustand, no context -- pure prop drilling with `useCallback`.

### Money: Dollars on Client, Cents on Server
Client form fields are in **dollars** (e.g. `150.00`). The `paymentTermsToCents()` function converts before mutation call. Edit page reverses via `centsToDollars()` when hydrating. The Zod schema validates dollars; the Convex validator validates cents.

### PaymentTermsStep Ref Pattern
`PaymentTermsStep` uses `forwardRef` + `useImperativeHandle` to expose `{ validate, getValues }`. The parent calls `validate()` in `handleNext` before advancing from Step 3. This avoids lifting the RHF form instance to the parent.

### Edit Page Hydration
`EditPurchasePage` fetches `getDetail`, then in a `useEffect` (guarded by `initialized` flag), maps the server response back to `EditFormState`, converting cents to dollars. This runs once.

### Update Mutation: Delete-and-Recreate
`update` mutation does NOT patch children. It deletes all existing adPurchases, adSlots, scheduledPayments (and their allocations), then re-inserts from scratch. This simplifies diffing at the cost of losing payment allocation history.

### Slot Availability & Conflict Detection
`SlotPlacementModal` queries `adSlots.queries.getSlotAvailability` per month. Non-day-type slots are exclusive (conflict = error). Day-type slots allow sharing (multiple advertisers on same slot). The `excludePurchaseId` arg ensures edit mode doesn't block the purchase's own existing slots.

### Schedule Generation
`generateScheduledPayments` in `convex/billing/helpers.ts` handles both equal-split and custom modes. Equal split uses integer division with remainder on last month. Custom mode takes explicit per-month amounts. Both produce `{ dueDate, amount, month, year }` entries stored as `scheduledPayments` rows.

## Lessons Learned

(empty -- will grow over time)
