name: purchase-detail
description: Context for the purchase detail page and invoice view. Use when modifying purchase details, scheduled payment tables, payment recording, invoice generation, or purchase deletion. Triggers on routes /admin/purchases/[id], /admin/purchases/[id]/invoice, or mentions of "purchase detail", "invoice", "record payment", "scheduled payments", "payment allocation", "waive late fee", "download PDF".

## Page Locations

- `src/app/admin/purchases/[id]/page.tsx` (401 lines) -- Purchase detail page
- `src/app/admin/purchases/[id]/invoice/page.tsx` (387 lines) -- Invoice view page
- `src/app/admin/purchases/[id]/payment-form.tsx` (216 lines) -- Record Payment sheet
- `src/app/admin/purchases/[id]/scheduled-payments-table.tsx` (111 lines) -- Scheduled payments sub-table with waive toggle

## Component Tree

### Detail Page (`/admin/purchases/[id]`)
```
PurchaseDetailPage
  PageHeader (title=Invoice #{invoiceNumber}, actions=[Record Payment, Invoice, Edit, Delete])
  Summary Cards (Net | Amount Paid | Balance | Status badge)
  Tabs
    Overview    -> Contact card + Payment Terms card
    Placements  -> Ad Placements table (ad type, edition, day/non-day, qty, slot badges)
    Schedule    -> <ScheduledPaymentsTable> (due date, amount, paid, balance, status, waive toggle)
    History     -> Payment History table (date, amount, method, check#, prepaid)
  <PaymentForm> (Sheet, opened via state)
  <ConfirmDialog> (soft-delete confirmation)
```

### Invoice Page (`/admin/purchases/[id]/invoice`)
```
InvoicePage
  Toolbar (Back | Print | Download PDF | Email Invoice)
  Invoice document (max-w-3xl white card, print-optimized)
    Header (INVOICE + #{number}, edition + year)
    Bill To (company, name, address, email, phone)
    Line Items table (description, qty, unit price, total)
    Subtotals (totalSale, discounts, additionals, trade, prepaid, net, paid, balance)
    Payment Terms (due day, early discount, late fee)
    Payment Schedule (due dates with Paid/Overdue/Due status)
    Payments Received (date, amount, method)
    Custom invoice message (from terms.invoiceMessage)
```

## Key Dependencies

### Queries
| Query | File | Used By |
|-------|------|---------|
| `purchases.queries.getDetail` | `convex/purchases/queries.ts:100-211` | Detail page |
| `purchases.queries.getById` | `convex/purchases/queries.ts:93-98` | Simple fetch |
| `billing.queries.getInvoiceData` | `convex/billing/queries.ts:291-426` | Invoice page, PDF route, email route |
| `scheduledPayments.queries.listByPurchase` | `convex/scheduledPayments/queries.ts` | Standalone SP listing |

### Mutations
| Mutation | File | Purpose |
|----------|------|---------|
| `purchases.mutations.softDelete` | `convex/purchases/mutations.ts:376-445` | Cascade-deletes adPurchases, adSlots, scheduledPayments, allocations, payments, then patches isDeleted |
| `payments.mutations.recordPayment` | `convex/payments/mutations.ts:52-95` | Insert payment + auto-allocate via `allocatePayment()` |
| `payments.mutations.updatePayment` | `convex/payments/mutations.ts:97-146` | Re-allocate after amount change |
| `payments.mutations.deletePayment` | `convex/payments/mutations.ts:148-166` | Delete payment + its allocations |
| `scheduledPayments.mutations.waiveLateFee` | `convex/scheduledPayments/mutations.ts:5-31` | Toggle `lateFeeWaived` on a scheduled payment |

### API Routes
| Route | File | Purpose |
|-------|------|---------|
| `GET /api/pdf/invoice/[id]` | `src/app/api/pdf/invoice/[id]/route.ts` | Generates PDF via `generateInvoicePdf()`, returns binary |
| `POST /api/email/invoice` | `src/app/api/email/invoice/route.ts` | Sends invoice email via `sendInvoiceEmail()` |

### PDF Generation
| File | Purpose |
|------|---------|
| `src/lib/pdf/invoice.ts` | `generateInvoicePdf()` -- builds PDF with pdf-lib, uses shared helpers from `src/lib/pdf/shared.ts` |

## Schema Relationships

```
purchases (1) ---> (1) paymentTerms          [by_purchaseId]
purchases (1) ---> (N) adPurchases           [by_purchaseId]
adPurchases (1) -> (N) adSlots               [by_adPurchaseId]
purchases (1) ---> (N) scheduledPayments     [by_purchaseId]
purchases (1) ---> (N) payments              [by_purchaseId]
payments (1) ----> (N) paymentAllocations    [by_paymentId]
scheduledPayments (1) -> (N) paymentAllocations [by_scheduledPaymentId]
purchases (N) ---> (1) contacts              [by_contactId]
purchases (N) ---> (N) calendarEditions      [calendarEditionIds array]
```

Key fields on `scheduledPayments`: `dueDate`, `amount`, `month`, `year`, `lateFeeWaived`.
Key fields on `payments`: `amount`, `date`, `method`, `checkNumber`, `isPrepaid`.
Key fields on `paymentAllocations`: `paymentId`, `scheduledPaymentId`, `amount`.

## Purchase Detail Sections

**Overview tab** -- Two cards side by side:
- Contact card: name, company, email, phone, link to `/admin/contacts/[id]`.
- Payment Terms card: totalSale, discount1/2 (with labels), additionalSale1/2, trade, deliveryMethod, dueDayOfMonth.

**Placements tab** -- Table of `adPurchases` enriched with advertisement name, edition name, isDayType badge, quantity, and slot badges (`Month #SlotNumber`).

**Schedule tab** -- `<ScheduledPaymentsTable>` showing each scheduled payment row with:
- Due date, amount, paid amount, remaining balance, status badge (Paid/Late/Partial/Pending).
- Waive Late Fee toggle (calls `scheduledPayments.mutations.waiveLateFee`).

**History tab** -- Table of `payments` with date, amount, method, check number, prepaid badge.

**Summary cards** -- Net, Amount Paid, Balance (max(0, net - amountPaid)), Status (Paid/Overdue/Partial/Unpaid).

## Payment Recording Flow

1. User clicks "Record Payment" -> opens `<PaymentForm>` Sheet.
2. Form fields: amount (dollars, converted via `dollarsToCents`), date, method (check/credit_card/cash/other), checkNumber (shown if method=check), isPrepaid toggle.
3. On submit, calls `payments.mutations.recordPayment` with `{ purchaseId, amount (cents), date (unix ms), method, checkNumber, isPrepaid, orgId }`.
4. Mutation inserts into `payments` table, then calls `allocatePayment()` from `convex/billing/helpers.ts`.
5. `allocatePayment()` sorts scheduled payments by dueDate ascending, fills each one until the payment amount is exhausted. Creates `paymentAllocations` entries linking `paymentId` to `scheduledPaymentId` with allocated `amount`.
6. After allocation, invalidates dashboard stats cache.

## Invoice Generation

**Data assembly** (`getInvoiceData`):
- Loads purchase, contact, first edition, paymentTerms, adPurchases (as lineItems with unitPrice from adPricing or charge fallback), scheduledPayments (enriched with paidAmount/isLate), payments, and computes net/amountPaid/balance.

**Three delivery channels**:
1. **Print** -- `window.print()` on the invoice page (CSS print styles via `print:hidden` classes).
2. **PDF download** -- `GET /api/pdf/invoice/[id]` -> Clerk auth -> fetches `getInvoiceData` + org settings -> `generateInvoicePdf()` -> returns PDF bytes.
3. **Email** -- `POST /api/email/invoice` with `{ purchaseId, orgId }` -> `sendInvoiceEmail()` (likely generates PDF + sends via email provider).

## Derived State in This Context

All financial values are computed at query time, never stored:

- **`net`** = `totalSale - discount1 - discount2 + additionalSale1 + additionalSale2 - trade + lateFees - earlyDiscount`
  - Computed by `computeNet()` in `convex/billing/helpers.ts`.
- **`amountPaid`** = sum of all `paymentAllocations.amount` for the purchase.
  - Computed by `computeAmountPaid()`.
- **`balance`** = `max(0, net - amountPaid)`.
- **`isPaid`** = `amountPaid >= net`.
- **`lateFees`** = count of late scheduled payments * fee per occurrence.
  - `isScheduledPaymentLate(sp)` = `dueDate < now && paid < amount && !lateFeeWaived`.
  - Fee = flat amount or `round(totalSale * percent / 100)`.
- **`earlyDiscount`** = always applied when present (flat or percent of totalSale). Not conditional on timing.
- **`scheduledPayment.paidAmount`** = sum of allocations for that SP.

The `now` timestamp is provided by `useStableNow()` hook on the client and passed as a query arg. This avoids calling `Date.now()` inside Convex queries which would break caching/reactivity.

## Key Patterns

- **Soft delete cascade**: `softDelete` hard-deletes all child records (adPurchases, adSlots, scheduledPayments, paymentAllocations, payments) then patches `isDeleted: true` on the purchase itself.
- **orgId in PaymentForm**: The `PaymentForm` passes `orgId` from `useOrg()` hook as a mutation arg. This is a known deviation from the "extract orgId server-side" rule -- existing pattern, do not duplicate it in new code.
- **Invoice page uses `useOrg()`** to get `orgId` and passes it to `getInvoiceData` as an arg. The query validates `purchase.orgId !== args.orgId` for tenant isolation.
- **Stats cache invalidation**: All payment/purchase mutations call `invalidateStatsCache` or `invalidateStatsCacheForPurchase` to trigger `dashboard.mutations.recomputeStatsCache` via scheduler.
- **Prepaid payments** are separated in the invoice view: prepaid is shown as a subtotal deduction, non-prepaid are listed under "Payments Received".

## Lessons Learned

(none yet)
