name: layout-detail
description: Context for the layout detail page with canvas preview and ad placement management. Use when modifying layout editing, ad placement positioning, canvas rendering, or edition-layout assignment. Triggers on route /admin/layouts/[id], or mentions of "layout detail", "canvas preview", "ad placement", "placement form", "edition assignment", "layout builder".

## Page Locations

| File | Lines | Purpose |
|---|---|---|
| `src/app/admin/layouts/[id]/page.tsx` | ~797 | Main page: CanvasPreview, PlacementForm, AssignmentPanel, LayoutDetailPage |
| `src/app/admin/layouts/layout-form.tsx` | ~106 | LayoutForm dialog (create/edit layout name) |
| `convex/layouts/queries.ts` | ~21 | `list` (by orgId), `getById` |
| `convex/layouts/mutations.ts` | ~34 | `create`, `update`, `softDelete` |
| `convex/adPlacements/queries.ts` | ~13 | `listByLayout` (index `by_layoutId`) |
| `convex/adPlacements/mutations.ts` | ~55 | `create`, `update`, `remove` (hard delete) |
| `convex/calendarEditionLayouts/queries.ts` | ~13 | `listByLayout` (filters by orgId + layoutId) |
| `convex/calendarEditionLayouts/mutations.ts` | ~41 | `assign` (with duplicate check), `unassign` (hard delete) |
| `src/lib/validators.ts` | lines 127-151 | `layoutSchema`, `adPlacementSchema` |

## Component Tree

```
LayoutDetailPage (default export, "use client")
  +-- LayoutDetailSkeleton          (in-file, loading state)
  +-- PageHeader                    (imported: @/components/shared/page-header)
  +-- CanvasPreview                 (in-file, visual preview of placements)
  +-- PlacementTable                (inline JSX in page, TanStack-free <Table>)
  +-- AssignmentPanel               (in-file, edition assignment card)
  +-- LayoutForm                    (imported: ../layout-form, dialog for editing layout name)
  +-- PlacementForm                 (in-file, dialog for create/edit placement)
  +-- ConfirmDialog                 (imported: @/components/shared/confirm-dialog)
```

## Key Dependencies

### Queries consumed by the page
- `api.layouts.queries.getById` -- single layout by doc ID
- `api.adPlacements.queries.listByLayout` -- all placements for this layout
- `api.calendarEditionLayouts.queries.listByLayout` -- edition assignments (needs orgId)
- `api.advertisements.queries.list` -- full ad type list (for dropdown + name lookup)
- `api.calendarEditions.queries.list` -- all editions (for assignment dropdown)

### Mutations consumed by the page
- `api.layouts.mutations.update` -- rename layout (via LayoutForm)
- `api.adPlacements.mutations.create` -- add placement
- `api.adPlacements.mutations.update` -- edit placement (x/y/w/h/position only)
- `api.adPlacements.mutations.remove` -- hard-delete placement
- `api.calendarEditionLayouts.mutations.assign` -- link layout to edition+year
- `api.calendarEditionLayouts.mutations.unassign` -- hard-delete assignment

### Validators
- `layoutSchema`: `{ name: string (min 1) }`
- `adPlacementSchema`: `{ layoutId, advertisementId, x (>=0), y (>=0), width (>=1), height (>=1), position?: "top"|"bottom" }`

## Schema Relationships

```
layouts (1) --< adPlacements (many)
  layoutId: Id<"layouts">
  advertisementId: Id<"advertisements">  --> advertisements table

layouts (many) --< calendarEditionLayouts (junction) >-- calendarEditions (many)
  layoutId + calendarEditionId + year
  Index: by_calendarEditionId_and_year  (duplicate check on assign)
```

- `adPlacements` has NO `isDeleted` -- uses hard delete via `ctx.db.delete()`
- `calendarEditionLayouts` has NO `isDeleted` -- also hard delete
- `layouts` uses soft delete (`isDeleted: true`) via `softDelete` mutation

## In-Page Components

### CanvasPreview (lines 93-148)
- Fixed container: `CANVAS_WIDTH=480`, `CANVAS_HEIGHT=360`
- Auto-scales: computes `maxX`/`maxY` from placement bounds, derives `scale = min(scaleX, scaleY, 1)` so boxes never exceed canvas
- Renders each placement as an absolutely-positioned div with color from `PLACEMENT_COLORS` (8-color cycle by index)
- Shows ad name (looked up from `advertisements` array) truncated inside the box
- Tooltip on hover: `"{adName} (x, y) width x height"`
- Empty state: dashed border with "No placements yet" message

### PlacementForm (lines 150-403)
- Dialog-based form using React Hook Form + Zod (`adPlacementSchema`)
- Create mode: shows advertisement select dropdown. Edit mode: hides it (advertisementId is immutable after creation)
- Fields: advertisementId (select), x, y (number, min 0), width, height (number, min 1), position (optional select: top/bottom)
- Default values: `{ x:0, y:0, width:100, height:50, position:undefined }`
- On edit: resets form to existing placement values via `useEffect`
- Create calls `adPlacements.mutations.create` with orgId from `useOrg()`
- Update calls `adPlacements.mutations.update` (only x/y/w/h/position -- NOT advertisementId)

### AssignmentPanel (lines 405-561)
- Card with edition select dropdown + year number input
- Assign button calls `calendarEditionLayouts.mutations.assign`
- Lists current assignments with edition name + year, each with a remove button
- Remove triggers `ConfirmDialog` then calls `calendarEditionLayouts.mutations.unassign`
- Year defaults to `new Date().getFullYear()`

## Canvas Rendering

The canvas is purely CSS-based (no `<canvas>` element). Placement rectangles are positioned via `position: absolute` with `left`, `top`, `width`, `height` computed as `value * scale`. The scale factor ensures all placements fit within the 480x360 container. Coordinates are stored in arbitrary units (not pixels) in the database.

When no placements exist, a dashed-border empty state is shown. The preview is read-only -- there is no drag-and-drop or interactive positioning.

## Placement CRUD

| Operation | Mutation | Delete type | Notes |
|---|---|---|---|
| Create | `adPlacements.mutations.create` | N/A | Requires orgId, layoutId, advertisementId, x, y, w, h |
| Update | `adPlacements.mutations.update` | N/A | Cannot change advertisementId after creation |
| Remove | `adPlacements.mutations.remove` | Hard delete | `ctx.db.delete()` -- no soft-delete |

The placement table displays: Ad Type name, Position badge (top/bottom or dash), X, Y, W, H, with edit/delete action buttons per row.

## Edition Assignment

Layouts are linked to calendar editions via the `calendarEditionLayouts` junction table. Each assignment includes a `year` to allow the same layout-edition pair in different years. The `assign` mutation checks for duplicates using the `by_calendarEditionId_and_year` index + client-side filter on layoutId and orgId. Assignments use hard delete (no soft-delete).

## Key Patterns

1. **Query skipping**: Edition assignments, advertisements, and editions queries use `isReady ? { orgId: orgId! } : "skip"` to avoid firing before org context is available.
2. **Editing state**: `editingPlacement` state (`Doc<"adPlacements"> | null`) determines create vs edit mode in PlacementForm. Set to `null` for create, set to doc for edit.
3. **LayoutForm reuse**: The same `LayoutForm` component from `../layout-form.tsx` is used on both the list page (create) and detail page (edit name).
4. **No auth in queries/mutations**: Current implementations accept `orgId` as a client arg rather than extracting from `ctx.auth`. This is a known deviation from the project's convex-patterns rule and should be addressed.
5. **No soft-delete on placements**: Unlike most content tables, `adPlacements` and `calendarEditionLayouts` use hard deletes since they are child/junction records.
6. **Color cycling**: Canvas placement colors cycle through 8 predefined Tailwind classes via modulo index.

## Lessons Learned

(none yet)
