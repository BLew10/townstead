name: contact-detail
description: Context for the contact detail page and statement view. Use when modifying contact profiles, purchase/payment tabs, portal linking, messaging, asset review, or client statements. Triggers on routes /admin/contacts/[id], /admin/contacts/[id]/statement, or mentions of "contact detail", "client statement", "portal link", "contact messages", "asset review".

## Page Locations

- `src/app/admin/contacts/[id]/page.tsx` (651 lines) -- Contact detail page with 6 tabs
- `src/app/admin/contacts/[id]/statement/page.tsx` (281 lines) -- Client statement view
- `src/app/admin/contacts/contact-form.tsx` (753 lines) -- Sheet-based create/edit form (shared by list + detail)
- `src/app/api/pdf/statement/[id]/route.ts` -- PDF generation endpoint for contact statement
- `src/app/api/email/statement/route.ts` -- Email send endpoint for contact statement

## Component Tree

```
ContactDetailPage
  PageHeader (title=fullName, description=company)
    [Statement button] -> /admin/contacts/[id]/statement
    [Edit button] -> opens ContactForm sheet
  Tabs (defaultValue="info")
    TabsContent "info"
      Card "Contact Details" (name, company, email, phone, website, category)
      Card "Address"
      Card "Address Books" (badge list from addressBookIds)
      Card "Notes"
    TabsContent "purchases"
      Table (invoiceNumber, editionName, year, net, amountPaid, isPaid badge)
      -> row click navigates to /admin/purchases/:id
    TabsContent "payments"
      Table (date, amount, method, invoiceNumber, editionName+year)
    TabsContent "portal"
      Card "Client Portal Access"
        [linked] -> shows userId + Unlink button
        [unlinked] -> shows Link Client Account button -> opens Dialog
    TabsContent "messages"
      Card with scrollable message list + send input
    TabsContent "assets"
      Table (fileName, status badge, feedback, Approve/Reject buttons)
  Dialog "Link Client Account" (Input for Clerk userId)
  ContactForm (Sheet, editing=contact)
```

## Key Dependencies

### Convex Queries (all called in detail page)
- `api.contacts.queries.getById` -- args: `{ id }` -- fetches single contact
- `api.categories.queries.getById` -- args: `{ id: contact.categoryId }` -- category name
- `api.addressBooks.queries.list` -- args: `{ orgId }` -- resolves addressBookIds to names
- `api.purchases.queries.listByContact` -- args: `{ contactId, now }` -- enriched purchases with computed net/amountPaid/isPaid
- `api.payments.queries.listByContact` -- args: `{ contactId }` -- flat list of payments across all purchases
- `api.orgPermissions.queries.getForContact` -- args: `{ contactId }` -- portal grant lookup
- `api.messages.queries.listByContact` -- args: `{ contactId }` -- ordered by createdAt
- `api.clientAssets.queries.listByContact` -- args: `{ contactId }` -- all uploaded assets

### Convex Queries (statement page)
- `api.billing.queries.getStatementData` -- args: `{ contactId, orgId, now }` -- returns `{ contact, purchases[], payments[], overallBalance, statementMessage }`
- `api.billing.queries.getStatementDataByPurchase` -- args: `{ purchaseId, orgId, now }` -- per-purchase ledger (used elsewhere)

### Convex Mutations
- `api.contacts.mutations.create` -- args: `{ orgId, ...contactFields }`
- `api.contacts.mutations.update` -- args: `{ id, ...contactFields }`
- `api.contacts.mutations.softDelete` -- args: `{ id }` -- clears email, sets isDeleted
- `api.contacts.mutations.generateUploadUrl` -- for logo upload
- `api.orgPermissions.mutations.linkContact` -- args: `{ userId, contactId }` -- creates orgPermissions row
- `api.orgPermissions.mutations.unlinkContact` -- args: `{ id }` -- deletes orgPermissions row
- `api.messages.mutations.send` -- args: `{ contactId, content, senderRole }` -- senderRole: "admin"|"client"
- `api.clientAssets.mutations.review` -- args: `{ id, status, feedback? }` -- status: "approved"|"rejected"

### Shared Components / Hooks
- `PageHeader` from `@/components/shared/page-header`
- `EmptyState` from `@/components/shared/empty-state`
- `ImageUpload` from `@/components/shared/image-upload` (logo in ContactForm)
- `ContactCategoryCombobox` -- exported from contact-form.tsx (Popover+Command)
- `useOrg()` from `@/hooks/use-org` -- provides `{ orgId, isReady }`
- `useStableNow()` from `@/hooks/use-stable-now` -- throttled Date.now() for reactive queries
- `formatCurrency`, `formatDate` from `@/lib/utils`

### Validators
- `contactSchema` in `src/lib/validators.ts` -- Zod schema with required: company, firstName, lastName; optional: email (validated), website (url validated), address, categoryId, notes, customerSince, addressBookIds
- `ContactFormValues` type exported from same file

## Schema Relationships

Contact is the hub entity. All relationships use `contactId: v.id("contacts")`.

```
contacts (hub)
  |-- purchases.contactId         -> Purchase[] (by_contactId index)
  |-- payments (via purchases)    -> Payment[] (indirect: purchase -> payment)
  |-- orgPermissions.contactId    -> OrgPermission? (by_contactId index, 1:1)
  |-- clientLinks.contactId       -> ClientLink? (by_contactId index, legacy)
  |-- messages.contactId          -> Message[] (by_contactId_and_createdAt index)
  |-- clientAssets.contactId      -> ClientAsset[] (by_contactId index)
  |-- contacts.categoryId         -> categories (FK, optional)
  |-- contacts.addressBookIds     -> addressBooks[] (array of IDs)
  |-- contacts.logoFileId         -> _storage (FK, optional)
```

### Key Table Shapes
- **orgPermissions**: `{ userId, orgId, role, permissions[], contactId?, isActive }` -- role="contact" for portal links
- **clientLinks**: `{ userId, contactId, orgId }` -- legacy table, may coexist with orgPermissions
- **messages**: `{ contactId, content, senderRole, orgId, createdAt }`
- **clientAssets**: `{ contactId, purchaseId?, fileId, fileName, status, feedback?, orgId }` -- status: uploaded|under_review|approved|rejected

## Tab Structure

| Tab | Data Source | Actions |
|---|---|---|
| Info | `getById`, `categories.getById`, `addressBooks.list` | Edit (opens ContactForm sheet) |
| Purchases | `purchases.listByContact` (enriched with net/amountPaid/isPaid) | Row click -> `/admin/purchases/:id` |
| Payments | `payments.listByContact` (flat list across all purchases) | View only |
| Portal | `orgPermissions.getForContact`, `portalInvites.getByContact` | Send Invite (dialog with permission picker), Copy Link, Resend, Revoke, Unlink; email-shortcut via `/api/portal/lookup` |
| Messages | `messages.listByContact` | Send message (inline input, Enter or button) |
| Assets | `clientAssets.listByContact` | Approve, Reject (with feedback prompt) |

## Portal Invite Flow

The Portal Access tab has 3 states:

### State 1 — No access, no pending invite
- Shows "How Portal Access Works" explanation callout
- Email shortcut: if contact has email, auto-checks Clerk for existing user via `GET /api/portal/lookup?email=...`. If found, shows one-click "Link Now" button (calls `linkContact` directly)
- "Send Portal Invite" button opens dialog with permission picker (checkboxes from `PORTAL_PERMISSION_OPTIONS`)
- Dialog calls `POST /api/portal/invite` which creates `portalInvites` record + sends email via Resend

### State 2 — Pending invite
- Shows invite status badge, created/expiry dates, selected permissions
- Copy Invite Link, Resend Email, Revoke Invite buttons
- Revoke calls `portalInvites.mutations.revoke`

### State 3 — Linked
- Shows linked user ID, active permissions, Unlink button
- Unlink calls `orgPermissions.mutations.unlinkContact`

### Invite Redemption
- Client clicks invite link -> `/portal/invite/[token]` (protected by Clerk auth)
- Page validates token via `portalInvites.queries.validateToken`
- "Accept Invitation" button calls `portalInvites.mutations.redeem` which creates `orgPermissions` grant
- Token-based: client can use any email to sign up, decoupled from contact email

### Key Tables
- **portalInvites**: `{ contactId, orgId, token, permissions[], expiresAt, status, redeemedByUserId?, redeemedAt?, createdAt }`
- **orgPermissions**: `{ userId, orgId, role, permissions[], contactId?, isActive }` — role="contact" for portal links

## Statement Generation

### Data
`billing.queries.getStatementData({ contactId, orgId, now })` returns:
- `contact` -- full contact doc
- `purchases[]` -- each with `invoiceNumber, editionName, year, net, amountPaid, balance`
- `payments[]` -- flat list with `date, amount, method, checkNumber, invoiceNumber, editionName, year`
- `overallBalance` -- sum of all purchase balances
- `statementMessage` -- from `paymentTerms.statementMessage` (last non-null wins)

### Output Channels
| Channel | Mechanism |
|---|---|
| Print | `window.print()` -- CSS `print:hidden` on toolbar, `print:shadow-none` on statement |
| PDF | `window.open(/api/pdf/statement/${contactId})` -- GET route, streams PDF |
| Email | `POST /api/email/statement` with body `{ contactId, orgId }` -- requires contact.email |

## Impact Map

- **Portal** (`/portal`): portal pages query `orgPermissions` to resolve which contact a logged-in user maps to. Linking/unlinking here directly controls portal access.
- **Billing**: purchases.listByContact and billing.getStatementData compute derived net/amountPaid/isPaid in real time. Changes to payment terms, payments, or late fee waivers reflect automatically.
- **Purchases**: row clicks navigate to `/admin/purchases/:id`. Deleting a contact (soft delete) does NOT cascade-delete purchases.
- **Public site**: contacts with `slug` + `featured` appear on directory pages. Editing slug/description/logoFileId here affects public directory.
- **Messages/Assets**: portal clients can send messages and upload assets; admin sees and responds here.

## Key Patterns

- **Derived billing state**: net, amountPaid, isPaid are never stored. They are computed by `computeNet()`, `computeAmountPaid()`, `computeIsPaid()` inside query handlers via paymentTerms + scheduledPayments + paymentAllocations.
- **useStableNow()**: queries requiring `now` (purchases, statement) use a throttled timestamp to avoid re-renders every millisecond while still computing late fees correctly.
- **ContactForm as Sheet**: the same `ContactForm` component is used for both create (from list page) and edit (from detail page). It receives `editing: Doc<"contacts"> | null` and `addressBooks`.
- **Email uniqueness**: create/update mutations enforce unique email per org (index `by_orgId_and_email`), excluding soft-deleted contacts.
- **searchText denormalization**: create/update rebuild `searchText = [company, firstName, lastName, email].join(" ")` for the search index.
- **Soft delete clears email**: `softDelete` sets `email: undefined` to free up the unique email slot.
- **Asset review uses browser prompt()**: rejection feedback is collected via `window.prompt()`, not a modal.

## Lessons Learned

(none yet)
