name: events-management
description: Context for event management across admin and public surfaces. Use when modifying event CRUD, event calendar, event export, public event listing, event submission, or event approval. Triggers on routes /admin/events/*, (public)/[orgSlug]/events/*, or mentions of "events", "event calendar", "event export", "event submission", "event approval".

## Page Locations

### Admin Surface
- `src/app/admin/events/page.tsx` (105 lines) -- list/calendar toggle, CRUD entry point
- `src/app/admin/events/columns.tsx` (141 lines) -- TanStack Table column defs + actions cell
- `src/app/admin/events/event-form.tsx` (373 lines) -- Sheet-based create/edit form
- `src/app/admin/events/event-calendar.tsx` (42 lines) -- FullCalendar wrapper (admin)
- `src/app/admin/events/export/page.tsx` (174 lines) -- year/community filter + month grid + PDF download

### Public Surface
- `src/app/(public)/[orgSlug]/events/page.tsx` (289 lines) -- calendar + sidebar filters + event cards
- `src/app/(public)/[orgSlug]/events/[id]/page.tsx` (171 lines) -- event detail with JSON-LD
- `src/app/(public)/[orgSlug]/events/submit/page.tsx` (309 lines) -- auth-gated submission form

### Shared Components
- `src/components/public/event-calendar.tsx` (170 lines) -- custom date-fns calendar grid (public)

## Component Tree

```
Admin:
  EventsPage
    -> viewMode toggle (list | calendar)
    -> DataTable (columns.tsx) | EventCalendar (FullCalendar)
    -> EventForm (Sheet side panel)
  EventsExportPage
    -> year input + community Select
    -> month Card grid (buildEventExportMonthGroups)
    -> "Download PDF" button -> /api/pdf/events-export

Public:
  EventsPage
    -> sidebar: search input + category filter badges
    -> EventCalendar (date-fns grid, hidden on mobile)
    -> event cards list (Link to detail)
  EventDetailPage
    -> JsonLd (schema.org Event)
    -> date badge, time, location, description, hosted-by contact
  SubmitEventPage
    -> auth gate (SignInButton if not signed in)
    -> EventSubmissionForm (controlled inputs, no RHF)
```

## Key Dependencies

### Convex Queries
- `api.events.queries.list` -- all non-deleted events for orgId (admin)
- `api.events.queries.getById` -- single event by id (admin)
- `api.events.queries.listByDateRange` -- date-range filter using `by_orgId_and_date` index
- `api.public.queries.listEvents` -- approved, non-deleted events for orgSlug with optional date range, categoryId, communityId filters
- `api.public.queries.getEvent` -- single event; returns null if deleted or unapproved
- `api.public.queries.listCategories` -- categories filtered by type "event"

### Convex Mutations
- `api.events.mutations.create` -- insert with orgId, sets isDeleted: false
- `api.events.mutations.update` -- patch by id
- `api.events.mutations.softDelete` -- sets isDeleted: true
- `api.events.mutations.generateUploadUrl` -- Convex file storage for event images
- `api.public.mutations.submitEvent` -- auth-gated, resolves org by slug, checks permissions via `requireCreateAction`, sets `isApproved` based on permission level

### Validators
- `src/lib/validators.ts` -- `eventSchema` (Zod): name (required), description, date (number), endDate, startTime, endTime, isYearly, communityIds
- `EventFormValues` type exported from same file

### Lib Utilities
- `src/lib/events-export.ts` -- `buildEventExportMonthGroups()`, `filterEventsForExport()`, `formatEventTimes()`
- `src/lib/pdf/events-export.ts` -- `generateEventsExportPdf()` for server-side PDF generation

### API Routes
- `src/app/api/pdf/events-export/route.ts` -- GET handler; auth via Clerk, fetches events from Convex server client, builds month groups, generates PDF, returns as attachment

## Schema (events table)

```
events: defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  date: v.number(),                              // Unix timestamp
  endDate: v.optional(v.number()),
  startTime: v.optional(v.string()),             // "HH:mm" format
  endTime: v.optional(v.string()),
  isYearly: v.optional(v.boolean()),             // recurring yearly flag
  communityIds: v.optional(v.array(v.id("communities"))),
  location: v.optional(v.string()),
  contactId: v.optional(v.id("contacts")),       // hosting business
  categoryId: v.optional(v.id("categories")),    // event category
  imageFileId: v.optional(v.id("_storage")),     // Convex file storage
  isApproved: v.optional(v.boolean()),           // approval gate for public display
  submittedBy: v.optional(v.string()),           // Clerk userId of submitter
  orgId: v.string(),
  isDeleted: v.optional(v.boolean()),
})
  .index("by_orgId", ["orgId"])
  .index("by_orgId_and_date", ["orgId", "date"])
```

Relationships: communityIds -> communities, contactId -> contacts, categoryId -> categories, imageFileId -> _storage.

## Admin Event Management

The admin page (`/admin/events`) supports two view modes toggled via a segmented button:
- **List view**: DataTable with columns for name, date, recurring badge, community badges, and row actions (edit/delete via dropdown).
- **Calendar view**: FullCalendar (dayGridMonth) rendering events; clicking an event opens the edit form.

The EventForm is a Sheet (side panel) used for both create and edit. Fields: name, description, image upload (Convex storage), start/end dates (date inputs converted to timestamps via helper functions), start/end times, isYearly toggle, and community checkboxes. The form uses React Hook Form + Zod (`eventSchema`).

Delete is a soft delete via `ConfirmDialog`.

## Event Export

The export page (`/admin/events/export`) lets admins preview and download a PDF calendar:
1. Filters: year (number input, clamped 2000-2100) and community (Select dropdown).
2. Preview: 12 month Cards in a responsive grid, each showing filtered events with name, formatted date, times, and description.
3. PDF download: opens `/api/pdf/events-export?year=XXXX&communityId=YYY` in a new tab. The API route authenticates via Clerk, fetches all events server-side, applies `buildEventExportMonthGroups`, then calls `generateEventsExportPdf`.

The shared lib `events-export.ts` handles filtering by year + community and bucketing into 12-month groups.

## Public Event Display

The public events page (`/[orgSlug]/events`) uses `api.public.queries.listEvents` which only returns approved, non-deleted events. It fetches events scoped to the current calendar month.

Layout: sidebar (search input + category filter badges) + main content (EventCalendar grid hidden on mobile + event cards list). The custom `EventCalendar` component (date-fns based, not FullCalendar) shows a month grid with dot indicators for event days. Clicking a date filters the card list. Month navigation re-fetches events for the new range.

The detail page (`/[orgSlug]/events/[id]`) uses `api.public.queries.getEvent` which returns null for unapproved or deleted events. Renders JSON-LD (`schema.org/Event`), date badge, time range, location, description paragraphs, and a hosted-by section if `contactId` is present.

## Event Submission (Public)

The submit page (`/[orgSlug]/events/submit`) is auth-gated: unauthenticated users see a sign-in prompt via `SignInButton`. The form uses controlled inputs (not React Hook Form) with inline validation for name and date.

The `submitEvent` mutation flow:
1. `requirePublicAuth(ctx)` extracts userId from auth identity.
2. `resolveOrg(ctx, orgSlug)` looks up tenantBranding by slug.
3. `requireCreateAction(ctx, userId, orgId, "events")` checks permissions:
   - User has `events:create` -> auto-approved (`isApproved: true`).
   - User has `events:submit` -> pending review (`isApproved: false`).
   - Neither -> throws "Permission denied".
4. Inserts the event with `submittedBy: userId`.

## Cross-Surface Impact

- Admin creates/edits events -> immediately visible on public if `isApproved !== false`. Admin-created events do not set `isApproved` explicitly, so they default to `undefined` which passes the public query filter (`isApproved === false` is the only exclusion).
- Public submissions create events with `isApproved: false` (unless auto-approved). These are invisible on public pages until an admin approves them.
- The admin list page does NOT filter by `isApproved`, so pending submissions appear alongside admin-created events. There is currently no dedicated approval UI -- approval requires directly updating the `isApproved` field.
- Soft-deleting an event in admin immediately removes it from public display.
- The export page uses the admin `list` query (all non-deleted events regardless of approval status).

## Key Patterns

- Admin uses FullCalendar library (`@fullcalendar/react`); public uses a custom date-fns calendar grid. They share no calendar code.
- The EventForm Sheet resets state via a `useEffect` watching the `editing` prop, using `form.reset()` to switch between create/edit modes.
- Date conversion helpers `timestampToDateString` / `dateStringToTimestamp` are local to event-form.tsx. They convert between Unix timestamps and `YYYY-MM-DD` strings for native date inputs.
- Public events page fetches only the current month's events via `startDate`/`endDate` args, re-fetching on month navigation. Admin fetches all events at once.
- The `eventSchema` validator does not include `location`, `categoryId`, `contactId`, or `imageFileId` -- those fields are handled outside the Zod schema. The public submit form adds `location` and `categoryId` directly.
- Community filtering on the public page uses the `useCommunityFilter` hook (shared with other public pages).

## Lessons Learned

(empty -- add entries as issues arise)
