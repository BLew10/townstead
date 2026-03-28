name: admin-settings
description: Context for org settings and permission defaults configuration. Use when modifying organization settings, payment preferences, address/remit configuration, or default permission assignments. Triggers on routes /admin/settings, /admin/settings/permissions, or mentions of "org settings", "permissions", "NSF fee", "payment settings", "permission defaults".

## Page Locations

- `src/app/admin/settings/page.tsx` (419 lines) -- Org settings form (business info, remit-to, invoice options)
- `src/app/admin/settings/permissions/page.tsx` (378 lines) -- Permission defaults matrix (contact + user columns)
- `convex/settings/queries.ts` (13 lines) -- Single query: getOrgSettings
- `convex/settings/mutations.ts` (41 lines) -- Single mutation: upsertOrgSettings
- `convex/orgPermissions/queries.ts` (75 lines) -- getMyGrant, getForUser, getForContact, listByOrg, getDefaults
- `convex/orgPermissions/mutations.ts` (210 lines) -- grantPermission, revokePermission, toggleActive, updatePermissions, linkContact, unlinkContact, updateDefaults, ensureDefaults
- `convex/permissions.ts` (78 lines) -- PERMISSIONS constants, TIERED_DOMAINS, role values, default arrays
- `convex/auth.helpers.ts` (199 lines) -- checkPermission, resolveEffectivePermissions, checkCreateAction

## Component Tree

```
SettingsPage (src/app/admin/settings/page.tsx)
  Form (react-hook-form + zodResolver)
    Card "Business Information"
      businessName, publisherName, address (street/city/state/zip), phone, email
    Card "Remit-To Address"
      remitToName, remitToAddress (street/city/state/zip)
    Card "Invoice Options"
      showCreditCardSection (Switch)
      nsfFeeAmount (Input, integer cents)
    Save Button

PermissionsSettingsPage (src/app/admin/settings/permissions/page.tsx)
  Header + Save Button
  Card "Contact Defaults"
    DomainSection "Events" (submit, create, update_own, delete_own -- no approve)
    DomainSection "Blog" (submit, create, update_own, delete_own -- no approve)
    DomainSection "Client Portal" (view, assets, messages, payments, invoices, placements)
  Card "Public User Defaults"
    DomainSection "Events" (submit, create, update_own, delete_own -- no approve)
    DomainSection "Blog" (submit, create, update_own, delete_own -- no approve)
    DomainSection "Coupons & Directory" (coupons:claim, directory:claim)
```

## Key Dependencies

### Convex Queries
- `api.settings.queries.getOrgSettings` -- args: `{ orgId }` -- returns orgSettings doc or null
- `api.orgPermissions.queries.getDefaults` -- args: `{}` (orgId from auth) -- returns orgPermissionDefaults doc or null

### Convex Mutations
- `api.settings.mutations.upsertOrgSettings` -- args: `{ orgId, businessName, ...fields }` -- insert or patch by orgId index
- `api.orgPermissions.mutations.ensureDefaults` -- args: `{}` -- idempotent; creates defaults row with DEFAULT_CONTACT_PERMISSIONS + DEFAULT_USER_PERMISSIONS if none exists
- `api.orgPermissions.mutations.updateDefaults` -- args: `{ contactDefaults, userDefaults }` -- upserts the orgPermissionDefaults row

### Shared Components / Hooks
- `useOrg()` from `@/hooks/use-org` -- provides `{ orgId, isReady }`
- shadcn/ui: Card, Form, FormField, Input, Switch, Button, Skeleton, Badge, Label
- lucide-react: Shield, Save, CalendarDays, Newspaper, Ticket, LayoutDashboard, Building2

### Validators
- `orgSettingsSchema` -- defined inline in settings/page.tsx (Zod). Required: businessName. Optional: address, phone, email, publisherName, remitToName, remitToAddress. Defaults: showCreditCardSection=true, nsfFeeAmount=2500.

## Schema Relationships

```
orgSettings (1 per org)
  .orgId -> org (Clerk org ID)
  Referenced by: invoice/statement rendering, PDF generation, public site footer

orgPermissionDefaults (1 per org)
  .orgId -> org
  .contactDefaults: string[] -- permission strings for contacts without custom grants
  .userDefaults: string[] -- permission strings for public users
  Referenced by: auth.helpers.checkPermission() as fallback

orgPermissions (per user-org pair)
  .userId -> Clerk user subject
  .orgId -> org
  .role -> "admin" | "contact" | "user"
  .permissions: string[] -- custom overrides; empty = fall through to defaults
  .contactId? -> contacts._id (for role="contact")
  .isActive -> boolean
```

## Settings Form Structure

| Section | Fields | Storage Notes |
|---|---|---|
| Business Information | businessName (required), publisherName, address {street, city, state, zip}, phone, email | Appears in invoice headers, statement headers |
| Remit-To Address | remitToName, remitToAddress {street, city, state, zip} | Printed on invoice/statement tear-off |
| Invoice Options | showCreditCardSection (boolean, default true), nsfFeeAmount (integer cents, default 2500) | CC section toggles tear-off fields; NSF fee shown in invoice footer text |

The form uses `useEffect` to reset form values when the query loads. Empty address objects are sent as `undefined` to avoid storing blank nested objects.

## Permission System

### PERMISSIONS Constants (convex/permissions.ts)

17 total permissions across 5 domains:

| Domain | Permissions |
|---|---|
| Events (tiered) | events:submit, events:create, events:update_own, events:delete_own, events:approve |
| Blog (tiered) | blog:submit, blog:create, blog:update_own, blog:delete_own, blog:approve |
| Coupons (binary) | coupons:claim |
| Portal (feature flags) | portal:view, portal:assets, portal:messages, portal:payments, portal:invoices, portal:placements |
| Directory (binary) | directory:claim |

### TIERED_DOMAINS

Events and Blog use a submit/create tier system. `create` supersedes `submit` -- if a user has `events:create`, they auto-approve; `events:submit` requires admin approval. The UI reflects this with a "supersedes" relationship that dims the lower-tier toggle.

### Roles

Three roles: `admin` (org members, all permissions implicitly), `contact` (advertisers/clients), `user` (public site visitors).

### Default Permission Arrays

- `DEFAULT_CONTACT_PERMISSIONS`: portal:view, portal:assets, portal:messages, portal:payments, portal:invoices, events:submit, events:update_own, blog:submit, blog:update_own
- `DEFAULT_USER_PERMISSIONS`: events:submit, coupons:claim

## Permission Matrix UI

The permissions page renders two cards -- Contact Defaults and Public User Defaults -- each showing domain-grouped toggles.

**Filtering rules:**
- Contact column shows: Events, Blog, Client Portal domains (excludes Coupons & Directory)
- User column shows: Events, Blog, Coupons & Directory domains (excludes Client Portal)
- Both columns exclude `:approve` permissions (admin-only capability)

**Supersede logic in UI:** `PermissionToggle` checks if any permission with `supersedes === thisPerm` is active. If so, the toggle is disabled with an "included" badge (e.g., enabling `events:create` auto-dims `events:submit`).

**Auto-initialization:** On first load, if `getDefaults` returns null, `ensureDefaults` is called to seed the defaults row from the hardcoded arrays in permissions.ts.

**Local state pattern:** The page uses `useState` for contactPerms/userPerms (not react-hook-form) because the matrix is toggle-based, not a traditional form. State initializes once via `initialized` flag.

## Permission Resolution Flow (auth.helpers.ts)

`checkPermission(ctx, userId, orgId, permission)` resolves in this order:

1. Query `orgPermissions` by userId+orgId index
2. If grant exists:
   - `!isActive` -> deny
   - `role === "admin"` -> allow (all permissions implicit)
   - `permissions.length > 0` -> check the explicit array
   - `permissions.length === 0` -> fall through to orgPermissionDefaults for this role (contactDefaults or userDefaults)
3. If no grant exists -> fall through to orgPermissionDefaults.userDefaults
4. If no defaults row exists -> deny

`checkCreateAction(ctx, userId, orgId, domain)` handles tiered domains:
- Resolves effective permissions via `resolveEffectivePermissions`
- `{domain}:create` -> allowed, no approval needed
- `{domain}:submit` -> allowed, needs approval
- Neither -> denied

## Global Impact

- **Invoices/Statements**: orgSettings.businessName, publisherName, address, remitToName, remitToAddress, showCreditCardSection, nsfFeeAmount all render on generated invoices and statements (PDF and print).
- **Public Site**: orgSettings.businessName used in public-facing headers/footers.
- **Client Portal**: permission defaults determine what contacts can do on first login before any custom overrides are set.
- **Event/Blog Submission**: default permissions control whether public users and contacts can submit content and whether it requires approval.
- **Coupon/Directory**: default user permissions gate claiming coupons and directory listings on the public site.

## Key Patterns

- **orgSettings uses orgId as client arg**: Unlike most mutations that extract orgId from auth, `upsertOrgSettings` and `getOrgSettings` accept orgId as an argument. This is a known deviation from the standard pattern documented in convex-patterns.mdc.
- **ensureDefaults is idempotent**: Safe to call repeatedly; only inserts if no row exists for the org.
- **Empty permissions array = use defaults**: A grant with `permissions: []` explicitly means "use the org defaults for this role," not "deny all." This is the critical distinction in the resolution flow.
- **Supersede is UI-only**: The supersede relationship (create > submit) is enforced by `checkCreateAction` at runtime, not by stripping submit from the stored array. Both can coexist in the permissions array.
- **No isDeleted on settings/permissions**: These tables use upsert/hard-delete, not soft-delete.

## Lessons Learned

(none yet)
