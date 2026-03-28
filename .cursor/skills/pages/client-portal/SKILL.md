---
name: client-portal
description: Context for the client portal pages and portal auth system. Use when modifying portal dashboard, invoices, ads, assets, messages, payments, or portal authentication flow. Triggers on routes /portal/*, or mentions of "portal", "client portal", "portal auth", "asset upload", "portal messages", "portal dashboard".
---

## Page Locations

| Page | File | Lines |
|---|---|---|
| Layout (auth shell) | `src/app/portal/layout.tsx` | ~52 |
| Dashboard | `src/app/portal/page.tsx` | ~118 |
| Invoices | `src/app/portal/invoices/page.tsx` | ~112 |
| My Ads | `src/app/portal/ads/page.tsx` | ~111 |
| Assets | `src/app/portal/assets/page.tsx` | ~133 |
| Messages | `src/app/portal/messages/page.tsx` | ~120 |
| Payments | `src/app/portal/payments/page.tsx` | ~111 |
| Portal auth hook | `src/hooks/use-portal-auth.ts` | ~27 |
| Header | `src/components/portal/header.tsx` | ~47 |
| Sidebar | `src/components/portal/sidebar.tsx` | ~99 |

## Portal Auth Flow

Auth uses `usePortalAuth()` (hook) and `resolvePortalContact()` (server helper).

Client-side (`src/hooks/use-portal-auth.ts`):
1. Clerk `useUser()` provides the signed-in user.
2. Query `orgPermissions.queries.getMyGrant` fetches the user's `orgPermissions` record.
3. If the grant exists, has `role === "contact"`, and `isActive === true`, the user is "linked".
4. The grant's `contactId` field connects the Clerk user to their `contacts` record.
5. Returns `{ contactId, contact, grantId, isLoading, isLinked }`.

Server-side (`convex/portal/queries.ts` -- `resolvePortalContact`):
1. Gets `identity` from `ctx.auth.getUserIdentity()`.
2. Queries `orgPermissions` by `userId === identity.subject` where `role === "contact"` and `isActive === true`.
3. Returns `{ contactId, orgId }` or throws if not found.

Layout states:
- **Loading** -- Clerk or grant query pending: shows skeleton.
- **Not linked** -- No active grant with role "contact": shows "Account Not Linked" message.
- **Linked** -- Renders sidebar + header + page content.

Note: The `clientLinks` table exists in schema but the portal currently resolves access via `orgPermissions`. `clientLinks` may be a legacy/migration artifact.

## Component Tree

```
PortalLayout (layout.tsx)
  +-- usePortalAuth() gate
  |   Loading -> Skeleton
  |   Not linked -> "Account Not Linked" message
  |   Linked:
  +-- PortalSidebar (desktop, hidden on mobile)
  +-- PortalHeader
  |     +-- Sheet -> PortalSidebarMobile (mobile only)
  |     +-- contact.company display
  |     +-- UserButton (Clerk)
  +-- <main> -> page content
```

Sidebar nav items: Dashboard, My Ads, Payments, Invoices, Assets, Messages.
Active state uses `pathname` matching (exact for `/portal`, startsWith for sub-routes).

## Key Dependencies

### Portal Queries (`convex/portal/queries.ts`)
- `getDashboardData({ now })` -- active ads count, total outstanding, upcoming payments (top 5)
- `getMyPurchases({ now })` -- all purchases with edition names, ad details, net/paid/isPaid
- `getPaymentHistory({ year? })` -- payment records with optional year filter
- `getInvoices({ now })` -- purchase-as-invoice with net, amountPaid, isPaid
- `getMyAssets({})` -- client assets for the linked contact
- `getMyMessages({})` -- messages ordered by `contactId_and_createdAt` index

### Cross-Domain Mutations
- `clientAssets.mutations.generateUploadUrl` -- gets a Convex storage upload URL
- `clientAssets.mutations.upload` -- creates a `clientAssets` record with storageId
- `messages.mutations.send` -- creates a `messages` record with senderRole

### Billing Helpers (from `convex/billing/helpers.ts`)
- `computeNet(terms, scheduledPayments, allAllocations, now)`
- `computeAmountPaid(allAllocations)`
- `computeIsPaid(net, amountPaid)`
- `computeScheduledPaymentPaid(scheduledPaymentId, allAllocations)`

### Shared Hooks
- `usePortalAuth()` -- portal auth state
- `useStableNow()` -- stable timestamp for queries that accept `now` (avoids reactivity thrash)

### Shared Components
- `EmptyState` (`src/components/shared/empty-state.tsx`)
- `ImageUpload` (`src/components/shared/image-upload.tsx`)

## Schema Relationships

```
Clerk User
  |-- identity.subject (userId)
  v
orgPermissions (role="contact", isActive=true)
  |-- contactId
  v
contacts
  |-- contactId used as FK in:
  |     purchases.by_contactId
  |     clientAssets.by_contactId
  |     messages.by_contactId_and_createdAt
  v
purchases
  |-- purchaseId used as FK in:
  |     paymentTerms.by_purchaseId
  |     scheduledPayments.by_purchaseId
  |     adPurchases.by_purchaseId
  |     payments.by_purchaseId
  v
scheduledPayments
  |-- scheduledPaymentId FK in:
        paymentAllocations.by_scheduledPaymentId
```

## Page Summaries

**Dashboard** -- Summary cards: active ads count, outstanding balance, next payment due. Below: list of up to 5 upcoming payments sorted by due date. Uses `getDashboardData`.

**My Ads** -- Card-per-purchase layout showing invoice number, edition, year, net, paid, status badge (Paid/Partial/Unpaid). Expands ad type details (ad name x quantity). Uses `getMyPurchases`.

**Invoices** -- Table with columns: Invoice #, Edition, Year, Net, Paid, Status (badge), Actions (View link to admin invoice page, PDF download link). Uses `getInvoices`.

**Assets** -- Upload card at top with `ImageUpload` component (preset="clientAsset"). Below: table of uploaded assets showing file name, status badge (uploaded/approved/rejected), and admin feedback. Uses `getMyAssets`, `generateUploadUrl`, `upload`.

**Messages** -- Chat-style interface in a full-height card. Messages from client right-aligned with primary tint, admin messages left-aligned with muted bg. Auto-scrolls to bottom on new messages via `useEffect` + `scrollRef`. Input bar with Enter-to-send. Uses `getMyMessages`, `send` mutation with `senderRole: "client"`.

**Payments** -- Year-filterable table with columns: Date, Amount, Method (badge), Invoice #, Edition, Year. Select dropdown for year filter (current year minus 4). Uses `getPaymentHistory`.

## Asset Upload Pipeline

1. User selects file via `ImageUpload` component (preset="clientAsset").
2. `handleUpload` calls `generateUploadUrl()` mutation to get a signed Convex storage URL.
3. File is POSTed directly to the storage URL with correct Content-Type.
4. Response provides `storageId`.
5. `upload` mutation is called with `{ contactId, fileId: storageId, fileName }`.
6. Record is created in `clientAssets` with status `"uploaded"`.
7. Admin reviews via `clientAssets.mutations.review` (approve/reject with optional feedback).

## Messaging System

- Messages table: `{ contactId, content, senderRole, orgId, createdAt }`.
- Query uses `by_contactId_and_createdAt` index -- returns messages in chronological order.
- Send mutation: `messages.mutations.send({ contactId, content, senderRole: "client" })`.
- `createdAt` is set server-side via `Date.now()` in the mutation.
- UI auto-scrolls via `useEffect` on `messages` change + `scrollRef.scrollTop = scrollHeight`.
- Enter key sends (without shift). Send button disabled while sending or empty input.
- Visual distinction: client messages get `bg-primary/10 ml-8`, admin messages get `bg-muted mr-8`.

## Key Patterns

- **Auth guard in layout**: `usePortalAuth()` is called once in `layout.tsx`; child pages trust that they only render when `isLinked === true`.
- **`now` parameter**: Dashboard, Ads, and Invoices queries accept `now` from `useStableNow()` for late fee / derived state computation. Payments and Assets do not need it.
- **No orgId from client**: All portal queries use `resolvePortalContact()` which extracts orgId server-side from the user's `orgPermissions` grant.
- **Skeleton loading**: Every page shows Skeleton components while the primary query returns `undefined`.
- **EmptyState component**: Consistent empty state with icon, title, and description across all list pages.
- **Derived billing state**: net, amountPaid, isPaid are always computed in query handlers via billing helpers -- never stored.
- **Status badges**: Consistent color scheme -- green for Paid/approved, yellow for Partial, destructive for rejected, secondary for default/unpaid.

## Lessons Learned

(empty -- add entries as issues arise)
