name: blog-editor
description: Context for the blog post creation and editing pages. Use when modifying blog post forms, rich text editing, featured image upload, SEO fields, or blog mutations. Triggers on routes /admin/blog/new, /admin/blog/[id]/edit, or mentions of "blog editor", "blog post", "rich text", "featured image", "SEO fields".

## Page Locations

- `src/app/admin/blog/new/page.tsx` (360 lines) -- New blog post form
- `src/app/admin/blog/[id]/edit/page.tsx` (413 lines) -- Edit blog post form
- `src/app/admin/blog/page.tsx` (94 lines) -- Blog list page (DataTable + status filter)
- `src/app/admin/blog/columns.tsx` (150 lines) -- TanStack Table column definitions + ActionsCell
- `convex/blog/queries.ts` (52 lines) -- list, getById, getBySlug
- `convex/blog/mutations.ts` (89 lines) -- create, update, softDelete, generateUploadUrl
- `src/components/shared/rich-text-editor.tsx` (292 lines) -- Tiptap-based WYSIWYG editor
- `src/components/shared/image-upload.tsx` (197 lines) -- Drag-and-drop file upload with presets

## Component Tree

```
NewBlogPostPage / EditBlogPostPage
  Link+Button "Back to Blog"
  PageHeader (title, description)
  Grid (3-col layout: 2-col content, 1-col sidebar)
    [Content column, lg:col-span-2]
      Card "Content"
        Input "Title" (auto-generates slug)
        Input "Slug" (mono font, manual override locks auto-slug)
        Textarea "Excerpt"
        RichTextEditor "Content"
    [Sidebar column]
      Card "Featured Image"
        ImageUpload (preset="featuredImage")
      Card "Publishing"
        Select "Status" (draft | pending | published)
        Button "Save Post" / "Update Post"
      Card "Categories" (conditional, checkbox list from categories.queries.list)
      Card "Communities" (conditional, checkbox list from communities.queries.list)
      Card "SEO"
        Input "SEO Title"
        Textarea "SEO Description"
```

## Key Dependencies

### Convex Queries
- `api.blog.queries.list` -- args: `{ orgId, status? }` -- filters by orgId index, soft-delete excluded
- `api.blog.queries.getById` -- args: `{ id }` -- raw `db.get()`, used by edit page to prefill
- `api.blog.queries.getBySlug` -- args: `{ orgId, slug }` -- index `by_orgId_and_slug`, for public site
- `api.categories.queries.list` -- args: `{ orgId, type: "blog" }` -- blog-specific categories
- `api.communities.queries.list` -- args: `{ orgId }` -- all communities for checkbox selection
- `api.storage.getUrl` -- args: `{ storageId }` -- resolves `featuredImageFileId` to URL (edit page only)

### Convex Mutations
- `api.blog.mutations.create` -- args: all blog fields, `orgId` extracted server-side via `requireAuth`
- `api.blog.mutations.update` -- args: `{ id, ...partialFields }` -- only defined fields are patched
- `api.blog.mutations.softDelete` -- args: `{ id }` -- sets `isDeleted: true` (used by list page ActionsCell)
- `api.blog.mutations.generateUploadUrl` -- args: none -- returns a Convex storage upload URL

### Shared Components / Hooks
- `PageHeader` from `@/components/shared/page-header`
- `EmptyState` from `@/components/shared/empty-state` (edit page, post-not-found)
- `ImageUpload` from `@/components/shared/image-upload` -- preset-based validation
- `RichTextEditor` from `@/components/shared/rich-text-editor` -- Tiptap wrapper
- `useOrg()` from `@/hooks/use-org` -- provides `{ orgId, isReady }`
- `formatDate` from `@/lib/utils` (used in columns.tsx)

### Validators
- No dedicated Zod schema for blog posts; validation is inline (title + slug required check in `handleSubmit`).
- `categorySchema` in `src/lib/validators.ts` uses `type: z.enum(["event", "blog", "video", "business"])`.

## Schema Relationships

```
blogPosts
  |-- blogPosts.orgId              -> org scoping (multi-tenant)
  |-- blogPosts.featuredImageFileId -> _storage (optional FK)
  |-- blogPosts.categoryIds[]      -> categories (optional array of IDs)
  |-- blogPosts.communityIds[]     -> communities (optional array of IDs)
  |-- blogPosts.authorId           -> Clerk userId string (optional, not enforced)

Indexes:
  by_orgId           -> [orgId]
  by_orgId_and_slug  -> [orgId, slug]
  by_orgId_and_status -> [orgId, status]
  search_blog        -> searchField: "title", filterFields: [orgId, status]
```

### blogPosts Table Shape
`title`, `slug`, `content` (string, HTML from Tiptap), `excerpt?`, `featuredImageFileId?` (Id<"_storage">), `authorId?` (string), `categoryIds?` (Id<"categories">[]), `communityIds?` (Id<"communities">[]), `status` ("draft"|"pending"|"published"), `publishedAt?` (number, Unix ms), `seoTitle?`, `seoDescription?`, `orgId` (string), `isDeleted?` (boolean).

## Form Structure

Both new and edit pages use individual `useState` hooks (not React Hook Form):

| Field | Type | Required | Notes |
|---|---|---|---|
| title | Input (string) | Yes | Auto-generates slug unless manually edited |
| slug | Input (string, mono) | Yes | `slugify()`: lowercase, replace non-alphanum with hyphens, trim hyphens |
| excerpt | Textarea (string) | No | Brief summary for listing pages |
| content | RichTextEditor (HTML string) | No | Tiptap WYSIWYG, stored as HTML |
| status | Select | Yes | Default: "draft". Options: draft, pending, published |
| seoTitle | Input (string) | No | Override for search engine page title |
| seoDescription | Textarea (string) | No | Meta description for search engines |
| categoryIds | Checkbox list | No | Filtered to `type: "blog"` categories |
| communityIds | Checkbox list | No | All communities for the org |
| featuredImageFileId | ImageUpload | No | Convex storage ID after upload |

## Rich Text Editor

Built on Tiptap (`@tiptap/react`) with these extensions:
- **StarterKit** -- bold, italic, strike, code, headings (1-3), lists (bullet + ordered), blockquote, horizontal rule, undo/redo
- **Link** -- `openOnClick: false`, `autolink: true`, styled with `text-primary underline`
- **Image** -- inline images via URL prompt, styled with `rounded-md max-w-full`
- **Placeholder** -- configurable placeholder text

Interface: `{ content: string, onChange: (html: string) => void, placeholder?: string, className?: string }`

The editor stores/emits raw HTML. On edit page load, `useEffect` calls `editor.commands.setContent(content, false)` to hydrate without triggering onChange. The toolbar is a row of `Toggle` buttons grouped by category with `Separator` dividers.

Link and image insertion use `window.prompt()` for URL input -- no custom modal.

## Image Upload Flow

1. Page calls `generateUploadUrl` mutation to get a signed Convex storage URL
2. `fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file })` uploads the file
3. Response JSON contains `{ storageId }` which is stored in component state as `featuredImageFileId`
4. On form submit, `featuredImageFileId` is passed to the create/update mutation
5. Edit page resolves existing `featuredImageFileId` to a display URL via `api.storage.getUrl`

ImageUpload component uses preset `"featuredImage"` from `src/lib/image-validation.ts`:
- Allowed types: JPG, PNG, WebP
- Recommended dimensions: 1200 x 630 px (landscape)
- Max file size: defined by `MAX_FILE_SIZE_BYTES` constant
- Supports drag-and-drop, click-to-browse, and a local preview via `URL.createObjectURL`

## SEO Fields

Two optional fields stored directly on `blogPosts`:
- `seoTitle` -- overrides the page `<title>` tag for search engines
- `seoDescription` -- populates `<meta name="description">` tag

Slug is the URL path segment. Generated automatically from title via `slugify()` (lowercase, hyphens). Once the user manually edits the slug, auto-generation stops (`slugManuallyEdited` flag). On edit page, `slugManuallyEdited` is initialized to `true` to prevent overwriting the existing slug when the title changes.

## New vs Edit Differences

| Aspect | New (`/admin/blog/new`) | Edit (`/admin/blog/[id]/edit`) |
|---|---|---|
| Route params | None | `params: Promise<{ id: string }>` unwrapped with `use()` |
| Data loading | None | `useQuery(api.blog.queries.getById, { id })` |
| State init | Empty defaults | `useEffect` hydrates all fields from `post` (guarded by `initialized` flag) |
| Slug behavior | Auto-gen from title | `slugManuallyEdited` starts `true`, preserves existing slug |
| Image display | No `currentImageUrl` prop | Passes `currentImageUrl={imageUrl}` from `api.storage.getUrl` |
| Submit mutation | `api.blog.mutations.create` | `api.blog.mutations.update` (passes `id`) |
| Button label | "Save Post" | "Update Post" |
| Not-found state | N/A | Shows `EmptyState` when `post === null` |
| Loading state | Checks `!isReady` (org) | Checks `post === undefined` (query loading) |

## Key Patterns

- **No React Hook Form**: unlike most admin forms, blog pages use raw `useState` per field. Adding validation would require either migrating to RHF+Zod or adding inline checks in `handleSubmit`.
- **Slug auto-generation lock**: the `slugManuallyEdited` boolean prevents title changes from overwriting a manually-set slug. Edit page sets this to `true` on init so existing slugs are preserved.
- **`update` mutation patches only defined fields**: iterates `Object.entries(fields)` and only includes keys where `value !== undefined`, so omitted optional fields are not wiped.
- **`list` query accepts `orgId` as client arg**: unlike most queries that extract `orgId` server-side via `requireAuth`, blog `list` takes `orgId` as an explicit arg. The `create`, `update`, and `softDelete` mutations do use `requireAuth` correctly.
- **Categories filtered by type**: the categories query is called with `type: "blog"` to show only blog-relevant categories in the sidebar.
- **Duplicated `slugify` function**: both new and edit pages define their own local `slugify()`. Consider extracting to `src/lib/utils.ts`.

## Lessons Learned

(none yet)
