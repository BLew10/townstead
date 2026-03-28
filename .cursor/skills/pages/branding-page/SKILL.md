name: branding-page
description: Context for the tenant branding configuration page. Use when modifying org branding, logo upload, color customization, social links, footer content, or understanding how branding affects the public site. Triggers on route /admin/branding, or mentions of "branding", "tenant branding", "org logo", "site colors", "public site theme".

## Page Location

- `src/app/admin/branding/page.tsx` (267 lines) -- Admin branding form (logo, colors, social links, footer)
- `convex/tenantBranding/queries.ts` (23 lines) -- getByOrgId, getBySlug
- `convex/tenantBranding/mutations.ts` (59 lines) -- upsert, generateUploadUrl
- `convex/storage.ts` (9 lines) -- getUrl (resolves storageId to URL)

## Component Tree

```
BrandingPage (src/app/admin/branding/page.tsx)
  PageHeader "Branding"
  Card "Brand Identity"
    ImageUpload (preset="logo") -- logo upload with drag-and-drop
    Input "Site Name"
    Input "Tagline"
    ColorPicker "Primary Color" (native <input type="color"> + hex Input)
  Card "Social Links"
    Input "Facebook"
    Input "Instagram"
    Input "Twitter / X"
    Input "YouTube"
  Card "Footer"
    Textarea "Footer Text"
  Button "Save Branding"
```

## Key Dependencies

### Convex Queries
- `api.tenantBranding.queries.getByOrgId` -- args: `{ orgId: string }` -- returns tenantBranding doc or null, uses `by_orgId` index
- `api.tenantBranding.queries.getBySlug` -- args: `{ orgSlug: string }` -- returns tenantBranding doc or null, uses `by_orgSlug` index (consumed by public site)
- `api.storage.getUrl` -- args: `{ storageId: Id<"_storage"> }` -- returns URL string or null

### Convex Mutations
- `api.tenantBranding.mutations.upsert` -- args: `{ orgId, orgSlug, logo?, primaryColor?, siteName?, tagline?, socialLinks?, footerText? }` -- queries by orgId index; patches if exists, inserts if not
- `api.tenantBranding.mutations.generateUploadUrl` -- args: none -- returns a one-time upload URL from `ctx.storage.generateUploadUrl()`

### Shared Components / Hooks
- `useOrg()` from `@/hooks/use-org` -- provides `{ orgId, isReady }`
- `useOrganization()` from `@clerk/nextjs` -- provides `organization.slug` for upsert
- `ImageUpload` from `@/components/shared/image-upload` -- preset-based file upload with drag-and-drop, validation, and preview
- shadcn/ui: Card, CardHeader, CardTitle, CardContent, Input, Textarea, Label, Button, Skeleton

## Schema: tenantBranding Table

```typescript
tenantBranding: defineTable({
  orgId: v.string(),                          // Clerk org ID (tenant key)
  orgSlug: v.string(),                        // Clerk org slug (URL key for public site)
  logo: v.optional(v.id("_storage")),         // Convex file storage reference
  primaryColor: v.optional(v.string()),       // Hex color string, e.g. "#1a73e8"
  siteName: v.optional(v.string()),           // Display name for the public site
  tagline: v.optional(v.string()),            // Subtitle / SEO description
  socialLinks: v.optional(v.object({
    facebook: v.optional(v.string()),         // Full URL
    instagram: v.optional(v.string()),
    twitter: v.optional(v.string()),
    youtube: v.optional(v.string()),
  })),
  footerText: v.optional(v.string()),         // Custom footer copy
})
  .index("by_orgId", ["orgId"])               // Admin lookup
  .index("by_orgSlug", ["orgSlug"])           // Public site lookup
```

One row per org. No `isDeleted` field -- this table uses upsert semantics only.

## Form Structure

The page uses raw `useState` hooks (not react-hook-form) for each field. State is initialized from the query result via `useEffect` when `branding` loads.

| Section | Fields | Type | Default |
|---|---|---|---|
| Brand Identity | logo | `Id<"_storage">` via ImageUpload | undefined |
| | siteName | string | "" |
| | tagline | string | "" |
| | primaryColor | hex string via color picker + text input | "#000000" |
| Social Links | facebook, instagram, twitter, youtube | string (full URL) | "" |
| Footer | footerText | string via Textarea | "" |

Empty strings are converted to `undefined` before sending to the mutation (e.g., `siteName || undefined`).

## Logo Upload Flow

1. User selects/drops file into `ImageUpload` (preset="logo")
2. `handleLogoUpload` calls `generateUploadUrl()` mutation to get a one-time URL
3. File is POSTed directly to the URL with `Content-Type: file.type`
4. Response JSON contains `{ storageId }` -- saved to local state as `logoId`
5. `logoId` is passed to `api.storage.getUrl` query for preview display
6. On save, `logoId` is included in the upsert mutation args
7. Remove: `onRemove` sets `logoId` to `undefined` (only clears reference, does not delete from storage)

## Downstream Impact (CRITICAL)

### Public Layout -- `src/app/(public)/[orgSlug]/layout.tsx` (47 lines)
- `generateMetadata()` calls `fetchQuery(api.tenantBranding.queries.getBySlug, { orgSlug })` server-side
- Sets `<title>` to `branding.siteName` (fallback: "Community") with template `%s | {siteName}`
- Sets `<meta description>` and `og:description` to `branding.tagline` if present
- Sets `og:siteName` to `branding.siteName`
- Revalidates every 60 seconds (`export const revalidate = 60`)

### OrgSlugShell -- `src/app/(public)/[orgSlug]/org-slug-shell.tsx` (21 lines)
- Client component wrapping all public pages in `<PublicHeader>` + `<main>` + `<PublicFooter>`
- Passes `orgSlug` to both header and footer, which each independently query branding

### PublicHeader -- `src/components/public/public-header.tsx` (218 lines)
- Queries `api.tenantBranding.queries.getBySlug` with `orgSlug`
- Displays `branding.siteName` (fallback: "Community") as the site logo/title link
- The primary color is applied via CSS custom properties on the `theme-curator` class in the shell

### PublicFooter -- `src/components/public/public-footer.tsx` (188 lines)
- Queries `api.tenantBranding.queries.getBySlug` with `orgSlug`
- Displays `branding.siteName` in the brand column and bottom bar copyright
- Renders `branding.footerText` as body copy in both the brand column and operator info card
- Renders active social links as icon buttons (Facebook, Instagram, X/Twitter, YouTube) using inline SVG components from `SOCIAL_CONFIG`
- Social links open in new tabs with `rel="noopener noreferrer"`

### Summary of branding field consumers

| Field | Header | Footer | SEO Metadata |
|---|---|---|---|
| siteName | Logo/title link | Brand column + copyright | title, og:siteName |
| tagline | -- | -- | description, og:description |
| primaryColor | Nav active state color | Link/icon colors | -- |
| socialLinks | -- | Icon buttons | -- |
| footerText | -- | Brand column + operator card | -- |
| logo | Not currently rendered (siteName text used) | -- | -- |

## Key Patterns

- **Upsert semantics**: The mutation queries by `by_orgId` index. If a row exists it patches; otherwise it inserts. There is no separate create vs update flow.
- **orgSlug comes from Clerk**: The admin page reads `organization.slug` from `useOrganization()` and passes it to the upsert. This keeps the slug in sync with Clerk's org slug. If the Clerk slug changes, the next save updates it.
- **orgId passed as client arg**: Like orgSettings, the branding mutation accepts `orgId` as an argument rather than extracting from auth. This is a known deviation from the standard pattern.
- **No validation on save**: There is no Zod schema or form validation. Empty fields are sent as `undefined`. The mutation accepts all optional fields.
- **Logo is a storage reference, not a URL**: The `logo` field stores `Id<"_storage">`. Display requires a separate `getUrl` query. Removing the logo only clears the reference -- it does not delete the file from Convex storage.
- **Public queries are unauthenticated**: Both `getByOrgId` and `getBySlug` have no auth check, allowing the public site to read branding without login. This is intentional for public page rendering.
- **Revalidation gap**: SSR metadata uses `revalidate = 60`, so branding changes may take up to 60 seconds to appear in `<title>` and `og:` tags, even though client-side queries update reactively.

## Lessons Learned

(none yet)
