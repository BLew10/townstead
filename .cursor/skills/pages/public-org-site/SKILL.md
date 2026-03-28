name: public-org-site
description: Context for all public-facing org pages under /[orgSlug]. Use when modifying the community site homepage, directory, coupons, events, blog, videos, profile, or shared public components. Triggers on routes under (public)/[orgSlug]/*, or mentions of "public site", "community site", "directory", "coupons page", "public events", "public blog", "videos page", "user profile", "SEO", "community filter", "JSON-LD".

## Page Locations

| Section | File | Lines |
|---|---|---|
| Landing (no org) | `src/app/(public)/page.tsx` | 43 |
| Org homepage | `src/app/(public)/[orgSlug]/page.tsx` | 331 |
| Org layout | `src/app/(public)/[orgSlug]/layout.tsx` | 47 |
| Org shell | `src/app/(public)/[orgSlug]/org-slug-shell.tsx` | 21 |
| Directory list | `src/app/(public)/[orgSlug]/directory/page.tsx` | 226 |
| Directory detail | `src/app/(public)/[orgSlug]/directory/[slug]/page.tsx` | 281 |
| Coupons list | `src/app/(public)/[orgSlug]/coupons/page.tsx` | 147 |
| Coupon detail | `src/app/(public)/[orgSlug]/coupons/[id]/page.tsx` | 232 |
| Events list | `src/app/(public)/[orgSlug]/events/page.tsx` | 289 |
| Event detail | `src/app/(public)/[orgSlug]/events/[id]/page.tsx` | 171 |
| Event submit | `src/app/(public)/[orgSlug]/events/submit/page.tsx` | 309 |
| Blog list | `src/app/(public)/[orgSlug]/blog/page.tsx` | 179 |
| Blog post | `src/app/(public)/[orgSlug]/blog/[slug]/page.tsx` | 152 |
| Videos list | `src/app/(public)/[orgSlug]/videos/page.tsx` | 191 |
| Profile | `src/app/(public)/[orgSlug]/profile/page.tsx` | 309 |

## Shared Architecture

### Layout and Shell

`layout.tsx` is a **server component** that:
1. Uses `fetchQuery` (Convex server-side) to call `tenantBranding.queries.getBySlug` for metadata.
2. Sets `export const revalidate = 60` for ISR.
3. Calls `generateMetadata` producing `title.template = "%s | {siteName}"` and OpenGraph from branding.
4. Renders `<OrgSlugShell orgSlug={orgSlug}>` which wraps children in `PublicHeader` + `<main>` + `PublicFooter`.

The shell applies `className="theme-curator"` for the public site design token scope.

### Param Flow

All page components receive `params: Promise<{ orgSlug: string }>` (Next.js 15 async params). Pages unwrap with `use(params)` in client components. Detail pages additionally receive `slug`, `id`, etc.

Every public query resolves the org via `resolveOrg(ctx, orgSlug)` which looks up `tenantBranding` by `orgSlug` index, then extracts `orgId` from the branding doc. This is the public alternative to extracting `orgId` from auth -- public queries are unauthenticated.

## Key Dependencies

### Public Queries (`convex/public/queries.ts`)
- `listCommunities({ orgSlug })` -- communities for the org
- `getHomepageData({ orgSlug, communityId, now })` -- returns `{ branding, featuredEvents, featuredBusinesses, activeCoupons, recentPosts }`
- `listEvents({ orgSlug, startDate?, endDate?, categoryId?, communityId? })` -- month-bounded event list
- `getEvent({ id })` -- single event by ID
- `listDirectoryBusinesses({ orgSlug, categoryId?, search? })` -- uses search index when `search` provided
- `getDirectoryBusiness({ orgSlug, slug })` -- single business by slug
- `listCoupons({ orgSlug, communityId?, now })` -- active coupons (endDate >= now)
- `getCoupon({ id })` -- single coupon by ID
- `listBlogPosts({ orgSlug, categoryId?, communityId? })` -- published posts, desc order
- `getBlogPost({ orgSlug, slug })` -- single post by org+slug
- `listVideos({ orgSlug, categoryId?, communityId? })` -- all non-deleted videos
- `listCategories({ orgSlug, type? })` -- type: "event" | "blog" | "video" | "business"
- `getUserSubmissions({ orgSlug, userId })` -- events submitted by a user
- `getUserClaims({ userId })` -- coupon claims enriched with coupon docs
- `getSitemapData({})` -- all tenants with their event IDs, blog slugs, business slugs

### Public Mutations (`convex/public/mutations.ts`)
- `submitEvent({ orgSlug, name, date, ... })` -- requires auth (`requirePublicAuth`), calls `requireCreateAction` for approval gating, inserts event with `isApproved` based on permission
- `claimCoupon({ couponId })` -- requires auth, checks expiry, duplicate claims, and quantity limits before inserting `couponClaims` row

### Shared Components
- `PublicHeader` (`src/components/public/public-header.tsx`) -- fixed nav with NAV_ITEMS (Home, Events, Directory, Coupons, Blog, Videos), community picker bar, Clerk SignInButton/UserButton, mobile hamburger menu
- `PublicFooter` (`src/components/public/public-footer.tsx`) -- 4-column footer with branding, quick links, company info, social icons (Facebook, Instagram, X, YouTube)
- `CommunityBadges` (`src/components/public/community-badge.tsx`) -- renders pill badges from `communityIds[]` + `communityMap`
- `JsonLd` (`src/components/public/json-ld.tsx`) -- renders `<script type="application/ld+json">` with `@context: schema.org`
- `EventCalendar` (`src/components/public/event-calendar.tsx`) -- month grid calendar for events page
- `BusinessMap` (`src/components/public/business-map.tsx`) -- map embed for business detail

### Hooks
- `useCommunityFilter(orgSlug)` (`src/hooks/use-community-filter.ts`) -- see Community Filter section
- `useStableNow()` (`src/hooks/use-stable-now.ts`) -- throttled `Date.now()` for reactive queries that need a `now` arg

### SEO Utilities
- `src/lib/seo.ts` -- `createJsonLd(type, data)`, `buildOpenGraph({ title, description, type, url, imageUrl })`, `truncate(text, maxLength)`

## Community Filter System

`useCommunityFilter(orgSlug)` provides cross-page community scoping:

1. Reads `?community=<slug>` from URL search params.
2. Queries `api.public.queries.listCommunities` for the org.
3. Resolves `communitySlug` to a `communityId: Id<"communities">`.
4. Returns `{ communitySlug, communityId, communities[], communityMap, setCommunity }`.
5. `setCommunity(slug)` updates the URL via `router.replace` (no scroll).

**Where used:** Homepage, events list, coupons list, blog list, videos list, event submit form. Directory does NOT use community filter (uses search + category instead).

Server-side filtering is done by `filterByCommunity()` helper in `convex/public/queries.ts` which checks `item.communityIds?.includes(communityId)`.

`CommunityBadges` renders the community names as small pills next to each item. It takes `communityIds` from the item and `communityMap` from the filter hook.

The header `PublicHeader` also renders a community picker bar (pill buttons) when communities exist, allowing users to toggle community scope globally.

## SEO Pattern

- **Layout-level metadata**: `layout.tsx` uses `generateMetadata` with `fetchQuery` server-side. Sets `title.template` so child pages inherit the site name suffix.
- **JsonLd component**: Used on detail pages only:
  - Business detail: `@type: LocalBusiness` with address, phone, URL
  - Event detail: `@type: Event` with startDate, endDate, location
  - Blog post: `@type: Article` with headline, datePublished, description
- **Sitemap**: `getSitemapData` query returns all org slugs + content slugs/IDs for sitemap generation.

## Auth-Gated Features

Three pages require Clerk authentication. Each uses the same pattern: check `useAuth().isSignedIn`, show `<SignInButton mode="modal">` fallback if not signed in.

| Feature | Page | Mutation | Auth Helper |
|---|---|---|---|
| Submit event | `events/submit/page.tsx` | `public.mutations.submitEvent` | `requirePublicAuth` + `requireCreateAction` |
| Claim coupon | `coupons/[id]/page.tsx` | `public.mutations.claimCoupon` | `requirePublicAuth` + `requirePermission(COUPONS_CLAIM)` |
| View profile | `profile/page.tsx` | (read only) | `useAuth().isSignedIn` client-side |

Event submissions go through an approval gate: `requireCreateAction` checks if the user needs admin approval. If so, `isApproved` is set to `false` and the event won't appear publicly until approved.

## Page Summaries

- **Landing** (`/`): Static page with tagline encouraging users to visit their org's URL directly. No data fetching.
- **Homepage** (`/[orgSlug]`): Hero with branding, featured events (3), active coupons (horizontal scroll), featured businesses (grid of 8), recent blog posts (1 major + 3 secondary). Uses `getHomepageData` single query.
- **Events list**: Sidebar with search + category filter buttons. Desktop: `EventCalendar` month grid + event cards. Queries by month range. Date click filters to single day.
- **Event detail**: Back link, date badge, title, time/location metadata, description paragraphs, associated business card. JsonLd Event.
- **Event submit**: Auth-gated form with name, description, date range, time range, location, category select, community select. Calls `submitEvent`, redirects to events list.
- **Directory list**: Search input (debounced 300ms) + category dropdown. Grid of business cards sorted featured-first then alphabetical. No community filter.
- **Business detail**: Back link, company name, featured badge, category tag, description, BusinessMap, related coupons grid, contact info sidebar (address, phone, email, website). JsonLd LocalBusiness.
- **Coupons list**: Grid of coupon cards showing title, business name, date range, community badges, "Limited availability" tag. Uses community filter.
- **Coupon detail**: Title, date range, expired badge, description, terms section, business sidebar with link to directory, claim button (auth-gated). Claim checks duplicate + quantity limit.
- **Blog list**: Category filter buttons, grid of post cards with category tags, excerpt, community badges, publish date. Uses community filter.
- **Blog post**: Back link, category tags, title, date/author, HTML content via `dangerouslySetInnerHTML`. JsonLd Article.
- **Videos list**: Category filter buttons, 2-column grid with YouTube/Vimeo embed iframes (via `getEmbedUrl` parser). Uses community filter.
- **Profile**: Auth-gated. Shows user avatar + name + email. Two tabs: "My Submissions" (event list with approved/pending badges) and "My Coupons" (claimed coupons with valid/expired status).

## Impact Map

- **Admin branding changes** (siteName, tagline, footerText, socialLinks): Affect header, footer, hero, and metadata on ALL public pages via `tenantBranding.queries.getBySlug`.
- **Admin events CRUD**: Events appear on homepage (featured), events list/detail. `isApproved: false` hides from public. Soft-deleting removes from all views.
- **Admin blog CRUD**: Posts with `status: "published"` appear on homepage (recent), blog list/detail. Soft-deleting or changing status hides them.
- **Admin coupons CRUD**: Active coupons appear on homepage (carousel), coupons list/detail, and business detail (related coupons). Expired coupons still viewable on detail page with "Expired" badge.
- **Admin contacts/directory**: Contacts with `company` field appear in directory. `featured: true` shows on homepage and gets a badge. `slug` is used for the directory detail URL.
- **Admin categories**: Categories filter events, blog, videos, and directory pages. Deleting a category removes the filter option.
- **Admin communities**: Communities drive the global community filter. Adding/removing communities changes the picker in header and filter behavior across 5+ pages.
- **Admin videos**: Videos appear on videos list page. Embedding uses YouTube/Vimeo URL parsing.

## Key Patterns

- **resolveOrg**: All public queries resolve `orgId` from `orgSlug` via `tenantBranding` lookup, never from auth. This is the public multi-tenancy pattern (contrast with admin which uses `ctx.auth`).
- **filterByCommunity**: Server-side helper that filters any array of docs with `communityIds` field. Applied post-query since Convex indexes can't filter on array membership.
- **Skeleton-first loading**: Every page returns a `<PageSkeleton>` when the primary query is `undefined`. Detail pages return a "not found" state when the query returns `null`.
- **useStableNow**: Pages with time-sensitive queries (coupons, homepage, events) use `useStableNow()` to avoid excessive re-renders while keeping late-fee/expiry calculations current.
- **Category filtering**: All list pages (events, blog, videos, directory) follow the same pattern: query `listCategories({ orgSlug, type })`, render toggle buttons, pass `categoryId` to the list query.
- **Design tokens**: All pages use Material Design 3 semantic color tokens (`text-on-surface`, `bg-surface-container-lowest`, `text-primary`, etc.) via the `theme-curator` class on the shell.
- **Editorial styling**: Cards use `editorial-shadow` class. Headings use `font-headline italic`. Body text uses `font-body`. Consistent across all pages.
- **Back navigation**: All detail pages have a back link using `ArrowLeft` icon pointing to the parent list page.

## Lessons Learned

(none yet)
