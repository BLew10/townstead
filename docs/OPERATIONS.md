# Operations Guide: Organization & User Management

This guide covers the end-to-end process for creating organizations, onboarding users, and managing permissions in Townstead.

---

## 1. Architecture Overview

Townstead uses a **two-layer authorization model**:

| Layer | System | What It Controls |
|-------|--------|------------------|
| **Routing & dashboard access** | Clerk organization roles | Whether a user can reach `/admin` or `/portal` |
| **Feature-level permissions** | Convex `orgPermissions` table | What a user can do once inside (view invoices, upload assets, submit events, etc.) |

### Role Mapping

| Clerk Org Role | Convex `orgPermissions.role` | Access |
|----------------|------------------------------|--------|
| `org:admin` | `admin` | Full admin dashboard + all feature permissions |
| `org:member` (or none) | `contact` | Client portal, linked to a contact record |
| `org:member` (or none) | `user` | Community/public features only |
| (none) | (none) | Public site only; falls back to `userDefaults` |

### How It Works

1. **Clerk middleware** (`src/proxy.ts`) enforces route protection:
   - `/admin/*` and `/portal/*` require authentication
   - `/admin/*` additionally requires Clerk role `org:admin`; all others are redirected to `/auth/redirect`
2. **Post-login routing** (`src/app/auth/redirect/page.tsx`):
   - `org:admin` users land on `/admin`
   - Users with an active `contact` grant land on `/portal`
   - Everyone else lands on `/`
3. **Feature permissions** (`convex/auth.helpers.ts`) resolve at query/mutation time:
   - `admin` role grants bypass all permission checks
   - `contact` and `user` roles check against their explicit permissions or fall back to org-wide defaults

### Key Files

| File | Purpose |
|------|---------|
| `src/proxy.ts` | Clerk middleware; route protection and admin role enforcement |
| `src/app/auth/redirect/page.tsx` | Post-login router |
| `convex/auth.helpers.ts` | `requireAuth`, `checkPermission`, `resolveEffectivePermissions` |
| `convex/orgPermissions/mutations.ts` | Grant, revoke, toggle, link/unlink permissions |
| `convex/orgPermissions/queries.ts` | Query grants and defaults |
| `convex/permissions.ts` | Permission string constants and default arrays |

---

## 2. How to Create a New Organization

### Step 1: Create the org in Clerk

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **Organizations** in the left sidebar
4. Click **"Create organization"**
5. Enter the organization name (this is the display name your client will see)
6. Save

> The organization's `orgId` (e.g. `org_xxxxx`) is assigned automatically by Clerk and used as the multi-tenancy key across all Convex tables.

### Step 2: Add yourself as an admin

If you created the org, Clerk automatically makes you the admin. Skip to Step 3.

If someone else created it, have them invite you with the **Admin** role (see [How to Add an Admin](#3-how-to-add-an-admin)).

### Step 3: Initial app setup

1. Sign in and select the new organization using the org switcher in the admin header
2. Navigate to **Settings** (`/admin/settings`)
   - Fill in business name, address, and invoice configuration
   - These appear on invoices and portal pages
3. Navigate to **Settings > Permissions** (`/admin/settings/permissions`)
   - Review and configure **Contact Defaults** (portal users / advertisers)
   - Review and configure **Public User Defaults** (community sign-ups)
   - The system auto-creates sensible defaults on first load
4. Optionally set up **Branding** for the public site (logo, colors, social links)

---

## 3. How to Add an Admin

Admins have full access to the admin dashboard and bypass all feature permission checks.

### Step 1: Invite via Clerk

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Navigate to **Organizations** > select the target org
3. Click the **Members** tab, then **"Invite member"**
4. Enter the user's email address
5. Set the role to **Admin**
6. Click **Invite**

Clerk sends the user an email invitation. When they accept:
- They create a Clerk account (or sign in to an existing one)
- They are added to the organization with `org:admin` role
- On sign-in, they are routed to `/admin`

### Step 2 (Optional): Create Convex admin grant

Without an explicit Convex grant, the admin's feature permissions fall through to `userDefaults`. While the admin dashboard itself is accessible (Clerk controls that), certain Convex-level permission checks may not resolve correctly.

To grant full Convex-level admin permissions:

**Option A: Via the Convex Dashboard**
1. Go to your Convex dashboard
2. Navigate to the `orgPermissions` table
3. Insert a new document:
   ```json
   {
     "userId": "user_xxxxx",
     "orgId": "org_xxxxx",
     "role": "admin",
     "permissions": [],
     "isActive": true
   }
   ```
   - `userId` is the Clerk user ID (found in Clerk Dashboard > Users)
   - `orgId` is the Clerk organization ID (found in Clerk Dashboard > Organizations)

**Option B: Via the Convex CLI**
```bash
npx convex run orgPermissions/mutations:grantPermission \
  '{"userId": "user_xxxxx", "role": "admin", "permissions": []}'
```

> Note: The mutation extracts `orgId` from the authenticated caller's JWT, so this must be run in a context where the caller is a member of the target org.

### Verification

After the user accepts the Clerk invite and signs in:
1. They should see the org in their organization switcher
2. Selecting the org should redirect them to `/admin`
3. They should have full access to all admin features

---

## 4. How to Add a Client (Portal User)

Clients access the **portal** (`/portal`) where they can view ads, invoices, payments, and upload artwork. A client must be linked to a **contact record** in the system.

### Prerequisites

- A **contact record** must exist for this person in `/admin/contacts`
- If one doesn't exist, create it first with their name, company, and email

### Option A: Portal Invite Flow (Recommended)

This is the standard flow. The admin sends an invite, and the client self-onboards.

#### 1. Navigate to the contact

Go to `/admin/contacts` and click on the contact you want to invite.

#### 2. Open the Portal Access tab

Click the **"Portal Access"** tab on the contact detail page.

#### 3. Send the invite

1. Click **"Send Invite"**
2. Select the permissions to grant (defaults are pre-selected based on org contact defaults):
   - **View Portal Dashboard** (`portal:view`)
   - **Upload Ad Artwork** (`portal:assets`)
   - **Send & Receive Messages** (`portal:messages`)
   - **View & Make Payments** (`portal:payments`)
   - **View Invoices** (`portal:invoices`)
   - **View Ad Placements** (`portal:placements`)
3. Confirm and send

#### 4. What happens next

- The system generates a unique 32-character token
- An invite email is sent to the contact's email address (if configured)
- The invite is valid for **30 days**
- The invite URL follows the pattern: `{app-url}/portal/invite/{token}`

#### 5. Client accepts the invite

1. Client clicks the invite link
2. If not signed in, they are prompted to create a Clerk account or sign in
3. They see the organization name and their contact info
4. They click **"Accept Invitation"**
5. The `redeem` mutation:
   - Creates an `orgPermissions` grant with `role: "contact"` and the invite's permissions
   - Marks the invite as `redeemed`
6. Client is redirected to `/portal`

### Option B: Manual Link

Use this when the client already has a Clerk account and you know their Clerk user ID.

1. Go to the contact detail page > **Portal Access** tab
2. In the **"Link Existing Account"** section, enter the Clerk user ID (`user_xxxxx`)
3. Click **"Link Account"**
4. The system calls `orgPermissions.mutations.linkContact`, creating a grant with `role: "contact"`

### Managing Portal Access

From the contact detail page > Portal Access tab, you can:

| Action | What It Does |
|--------|-------------|
| **Unlink** | Deletes the `orgPermissions` grant entirely |
| **Revoke invite** | Changes a pending invite status to `revoked` |
| **Resend invite** | Returns the token for a still-pending invite |

---

## 5. How to Add a Community Member

Community members are public users who interact with the public-facing site (events, blog, directory, coupons).

### Default behavior (no action required)

When a user signs up on the public site, they do **not** receive an explicit `orgPermissions` grant. Their permissions automatically fall back to the org-wide **User Defaults** configured at `/admin/settings/permissions`.

Default user permissions (unless changed):
- `events:submit` -- Submit events for approval
- `videos:submit` -- Submit videos for approval
- `coupons:claim` -- Claim coupons

### Optional: Grant explicit permissions

If you need to give a specific community member elevated permissions:

1. Call `orgPermissions.mutations.grantPermission` via the Convex dashboard:
   ```json
   {
     "userId": "user_xxxxx",
     "role": "user",
     "permissions": ["events:create", "events:update_own", "blog:create"]
   }
   ```
2. An empty `permissions` array falls back to `userDefaults`; a non-empty array overrides them entirely

---

## 6. How to Manage Permissions

### Org-Wide Defaults

Navigate to `/admin/settings/permissions` to configure default permissions for all contacts and public users.

**Contact Defaults** apply to portal users whose `orgPermissions.permissions` array is empty. These cover:
- Client Portal features (view, assets, messages, payments, invoices, placements)
- Content submission (events, blog, videos)

**User Defaults** apply to public users with no explicit grant. These cover:
- Content submission (events, videos)
- Coupons and directory

Changes take effect immediately for all users who rely on defaults.

### Per-User Permission Overrides

To give a specific user permissions that differ from the defaults:

1. Find their `orgPermissions` record (via Convex dashboard or `listByOrg` query)
2. Call `orgPermissions.mutations.updatePermissions` with their grant ID and the new permissions array
3. A non-empty array replaces the defaults entirely for that user

### Deactivating Access

To temporarily disable a user's access without deleting their grant:

- Call `orgPermissions.mutations.toggleActive` with `isActive: false`
- The user will lose all permissions but their grant record is preserved
- Re-enable with `isActive: true`

### Revoking Access

To permanently remove a user's grant:

- Call `orgPermissions.mutations.revokePermission` with the grant ID
- This deletes the `orgPermissions` document
- The user falls back to `userDefaults` (if they have no grant)

### Permission Reference

#### Portal Permissions (Contact Role)

| Permission | Description |
|-----------|-------------|
| `portal:view` | Access the portal dashboard |
| `portal:assets` | Upload and manage ad artwork |
| `portal:messages` | Send and receive messages |
| `portal:payments` | View and make payments |
| `portal:invoices` | View invoices and statements |
| `portal:placements` | View ad placement details |

#### Tiered Content Permissions

These follow a tiered model where `create` supersedes `submit`:

| Permission | Description |
|-----------|-------------|
| `events:submit` | Submit events for admin approval |
| `events:create` | Create events (auto-approved) |
| `events:update_own` | Edit own events |
| `events:delete_own` | Delete own events |
| `events:approve` | Approve others' event submissions |
| `blog:submit` | Submit blog posts for approval |
| `blog:create` | Create blog posts (auto-approved) |
| `blog:update_own` | Edit own blog posts |
| `blog:delete_own` | Delete own blog posts |
| `blog:approve` | Approve others' blog submissions |
| `videos:submit` | Submit videos for approval |
| `videos:create` | Create videos (auto-approved) |
| `videos:update_own` | Edit own videos |
| `videos:delete_own` | Delete own videos |
| `videos:approve` | Approve others' video submissions |

#### Other Permissions

| Permission | Description |
|-----------|-------------|
| `coupons:claim` | Claim coupons on the public site |
| `directory:claim` | Claim directory listings |

---

## 7. Troubleshooting

### "No Organization Selected"

**Cause:** The user is signed in but has no active Clerk organization selected.

**Fix:**
- Ensure the user is a member of at least one organization in Clerk
- Have them use the organization switcher in the admin header to select an org
- If they were just invited, they may need to sign out and sign back in

### "Access Denied" on Admin Dashboard

**Cause:** The user's Clerk organization role is not `org:admin`.

**Fix:**
1. Go to Clerk Dashboard > Organizations > select the org
2. Find the user in the Members list
3. Change their role to **Admin**
4. Have the user refresh or sign out and back in

### "Account Not Linked" on Portal

**Cause:** The user has no active `orgPermissions` grant with `role: "contact"` in Convex.

**Fix:**
- If they haven't accepted an invite yet, check the invite status on the contact detail page
- If the invite expired, resend it or create a new one
- If they used a different email to sign up than expected, use the Manual Link option with their actual Clerk user ID

### Portal Invite Shows "Already Used"

**Cause:** The invite status is `redeemed`.

**Fix:**
- Check the contact detail page > Portal Access tab to see if the grant already exists
- If the grant exists, the user should be able to access the portal
- If the user can't access it, check that the grant's `isActive` is `true`

### Portal Invite Shows "Expired"

**Cause:** The 30-day validity window has passed.

**Fix:**
- Create a new invite from the contact detail page
- The old expired invite is automatically cleaned up

### User Can Access Admin but Has No Permissions

**Cause:** The user has Clerk `org:admin` role but no Convex `orgPermissions` grant with `role: "admin"`.

**Fix:**
- Create an admin grant in Convex (see [How to Add an Admin, Step 2](#step-2-optional-create-convex-admin-grant))
- Without the grant, their permissions fall through to `userDefaults`, which are intended for public users

### Contact Can't Upload Assets / View Invoices / etc.

**Cause:** The specific portal permission is not included in their grant or the contact defaults.

**Fix:**
1. Check their `orgPermissions` record:
   - If `permissions` is empty, they use **Contact Defaults** -- check `/admin/settings/permissions`
   - If `permissions` is non-empty, it's an explicit override -- update it via `updatePermissions`
2. Verify `isActive` is `true` on their grant
