---
name: unit-testing
description: Guide for writing and maintaining unit tests with Vitest and convex-test. Use when writing tests, adding test coverage, testing Convex functions, testing billing logic, validating security invariants, or when the user mentions "test", "unit test", "coverage", "TDD", or "convex-test".
---

# Unit Testing

This skill covers test infrastructure setup, test-writing patterns, and quality checklists for the Planner App v2 codebase (Next.js + Convex + Clerk + Zod).

**This skill is rigid.** Follow it exactly — do not skip steps or adapt away from the discipline.

## Infrastructure Setup

If `vitest` is not in `devDependencies`, bootstrap from scratch:

### 1. Install dependencies

```bash
npm install --save-dev vitest convex-test @edge-runtime/vm jsdom
```

### 2. Create `vitest.config.ts` at project root

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "convex",
          include: ["convex/**/*.test.{ts,js}"],
          environment: "edge-runtime",
        },
      },
      {
        extends: true,
        test: {
          name: "frontend",
          include: ["src/**/*.test.{ts,tsx,js,jsx}"],
          exclude: ["convex/**"],
          environment: "jsdom",
        },
      },
    ],
  },
});
```

### 3. Add `package.json` scripts

```json
{
  "test": "vitest",
  "test:once": "vitest run",
  "test:debug": "vitest --inspect-brk --no-file-parallelism",
  "test:coverage": "vitest run --coverage --coverage.reporter=text"
}
```

### 4. Create `convex/test.setup.ts`

```typescript
/// <reference types="vite/client" />
export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
```

Every Convex test file imports `modules` from this file.

### 5. Frontend test setup (`src/test-setup.ts`)

```typescript
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
```

Reference this from the `frontend` project in `vitest.config.ts`:

```typescript
{
  test: {
    name: "frontend",
    include: ["src/**/*.test.{ts,tsx,js,jsx}"],
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
}
```

## Test File Conventions

- **Colocate** test files next to source: `helpers.test.ts` beside `helpers.ts`
- **Naming**: `[module].test.ts` or `[module].test.tsx` (not `.spec.ts`)
- **Structure**: One `describe` per exported function/component, one `it` per behavior
- **Imports**: Use `describe`, `it`, `expect`, `vi` from `vitest`

## Test Categories by Priority

### P0 — Billing Computations (`convex/billing/helpers.ts`)

These pure functions are the financial backbone. Every function must have comprehensive tests.

| Function | Must-test scenarios |
|----------|-------------------|
| `computeNet` | All discounts/additionals/trade; with and without late fees; with and without early discount |
| `computeLateFees` | Flat fee; percent fee; no late fees (type/amount missing); waived payments; zero late count |
| `computeEarlyDiscount` | Flat; percent; missing type/amount returns 0 |
| `computeBaseNet` | All optional fields present; all omitted; mixed |
| `allocatePayment` | Full payment; partial; overpayment; already-paid installments; empty scheduled payments |
| `generateScheduledPayments` | 12-month split with remainder; custom months; single lump sum; zero/negative net |
| `isScheduledPaymentLate` | Past due + unpaid; past due + partially paid; past due + fully paid; waived; future due date |
| `computeScheduledPaymentPaid` | Multiple allocations; no allocations; allocations for other payments |
| `computeAmountPaid` | Sum correctness; empty array |
| `computeIsPaid` | Exact match; overpaid; underpaid |

**Money rule**: All values are integer cents. Use exact `toBe()` comparisons, never `toBeCloseTo()`.

### P1 — Utility Functions (`src/lib/utils.ts`)

| Function | Must-test scenarios |
|----------|-------------------|
| `formatCurrency` | Positive cents; zero; large values; single-digit cents |
| `dollarsToCents` | Whole dollars; fractional (e.g., 19.99); rounding edge cases (e.g., 1.005) |
| `centsToDollars` | Inverse of above |
| `formatDate` | Known timestamp -> expected string |
| `formatDateTime` | Known timestamp -> expected string with time |

### P2 — Zod Validators (`src/lib/validators.ts`)

For each schema, test:
1. **Valid data** passes `.parse()` without throwing
2. **Missing required fields** throws with the correct error message
3. **Invalid types** throw (string where number expected, etc.)
4. **Boundary values** (min/max constraints) pass/fail correctly
5. **Optional fields** can be omitted

### P3 — Convex Query/Mutation Security

Use `convex-test` with `t.withIdentity()`. Every query and mutation must be tested for:

1. **Rejects unauthenticated calls** — call without identity, expect throw
2. **Tenant isolation** — insert data for org A, query as org B, expect empty results
3. **Soft-delete filtering** — soft-deleted records excluded from list queries

### P4 — Convex Domain Logic

Full flow tests via `convex-test`:
- Create a purchase, verify invoice number format (`YY-NNNN`)
- Record a payment, verify allocation fills earliest-due installment first
- Soft-delete a record, verify it's hidden from list but retrievable by ID

## Test Categories by Surface

### Backend (Convex Functions)

Every Convex domain folder (e.g. `convex/contacts/`) must have tests covering:

| # | Test Category | Required? |
|---|---------------|-----------|
| 1 | Tenant isolation — seed org_a, query as org_b, expect empty | Yes |
| 2 | Soft-delete filtering — seed active + deleted, list returns only active | Yes (if table has `isDeleted`) |
| 3 | CRUD correctness — create/read/update/delete happy paths | Yes |
| 4 | Uniqueness constraints — duplicate code/email rejection within same org | If applicable |
| 5 | Error paths — invalid ID, missing record | Yes |
| 6 | Auth rejection — unauthenticated + no-org identity rejected | If function uses `ctx.auth` |

### Frontend (React Components)

Every custom component (not shadcn/ui) must have tests covering:

| # | Test Category | Required? |
|---|---------------|-----------|
| 1 | Renders without crashing — basic render with minimal required props | Yes |
| 2 | Displays props — text content, labels, data appear in the DOM | Yes |
| 3 | Handles interactions — click, form submit, toggle callbacks fire | If interactive |
| 4 | Conditional rendering — shows/hides elements based on props/state | If applicable |
| 5 | Empty/loading states — graceful handling when data is absent | If applicable |

### Pure Functions (lib/helpers)

Every exported function must have tests covering:

| # | Test Category | Required? |
|---|---------------|-----------|
| 1 | All branch paths (if/else/switch) | Yes |
| 2 | Edge cases — zero, empty array, boundary values | Yes |
| 3 | Error paths — invalid input handling | If applicable |

## Test Patterns

### Pure Function Test

```typescript
import { describe, it, expect } from "vitest";
import { computeBaseNet } from "./helpers";

describe("computeBaseNet", () => {
  it("returns totalSale when no adjustments", () => {
    expect(computeBaseNet({ totalSale: 120000 })).toBe(120000);
  });

  it("subtracts discounts and trade, adds additional sales", () => {
    expect(
      computeBaseNet({
        totalSale: 120000,
        discount1: 5000,
        discount2: 3000,
        additionalSale1: 10000,
        trade: 2000,
      })
    ).toBe(120000);
  });
});
```

### Convex Function Test

```typescript
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("calendarEditions.list", () => {
  it("returns only non-deleted editions for the given org", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("calendarEditions", {
        name: "Spring 2026", code: "SP26", orgId: "org_1", isDeleted: false,
      });
      await ctx.db.insert("calendarEditions", {
        name: "Deleted", code: "DEL", orgId: "org_1", isDeleted: true,
      });
      await ctx.db.insert("calendarEditions", {
        name: "Other Org", code: "OT", orgId: "org_2", isDeleted: false,
      });
    });

    const results = await t.query(api.calendarEditions.queries.list, {
      orgId: "org_1",
    });
    expect(results).toHaveLength(1);
    expect(results[0].code).toBe("SP26");
  });
});
```

### Security Test Template

Apply this template to every query/mutation module. When the codebase migrates to extracting `orgId` from `ctx.auth` (the target pattern), use `t.withIdentity()`:

```typescript
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("security: calendarEditions", () => {
  it("tenant isolation — org A cannot see org B data", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("calendarEditions", {
        name: "Org B Edition", code: "OB", orgId: "org_b", isDeleted: false,
      });
    });

    const results = await t.query(api.calendarEditions.queries.list, {
      orgId: "org_a",
    });
    expect(results).toHaveLength(0);
  });

  it("soft-deleted records are excluded", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("calendarEditions", {
        name: "Active", code: "ACT", orgId: "org_1", isDeleted: false,
      });
      await ctx.db.insert("calendarEditions", {
        name: "Deleted", code: "DEL", orgId: "org_1", isDeleted: true,
      });
    });

    const results = await t.query(api.calendarEditions.queries.list, {
      orgId: "org_1",
    });
    expect(results).toHaveLength(1);
    expect(results[0].code).toBe("ACT");
  });
});
```

When functions use `ctx.auth.getUserIdentity()` for orgId extraction, test with identity:

```typescript
it("rejects unauthenticated calls", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.query(api.someModule.queries.list)
  ).rejects.toThrowError("Not authenticated");
});

it("rejects calls without orgId in identity", async () => {
  const t = convexTest(schema, modules);
  const noOrg = t.withIdentity({ name: "User" });
  await expect(
    noOrg.query(api.someModule.queries.list)
  ).rejects.toThrowError("No organization selected");
});
```

### React Component Test

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ConfirmDialog } from "./confirm-dialog";

describe("ConfirmDialog", () => {
  it("renders title and description", () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        onConfirm={() => {}}
        title="Delete Record"
        description="This action cannot be undone."
      />
    );
    expect(screen.getByText("Delete Record")).toBeDefined();
    expect(screen.getByText("This action cannot be undone.")).toBeDefined();
  });

  it("calls onConfirm when confirmed", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        onConfirm={onConfirm}
        title="Delete"
        description="Sure?"
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
```

### Mocking External Dependencies

Components importing Clerk, Convex, or Next.js hooks need mocks:

```typescript
vi.mock("@clerk/nextjs", () => ({
  useOrganization: () => ({ organization: { name: "Test Org" } }),
  useUser: () => ({ user: { fullName: "Test User" } }),
  UserButton: () => <div data-testid="user-button" />,
  OrganizationSwitcher: () => <div data-testid="org-switcher" />,
}));

vi.mock("convex/react", () => ({
  useQuery: () => null,
  useMutation: () => vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({}),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));
```

### Test Factory Pattern

For Convex tests needing realistic data, create factory helpers in `convex/test.factories.ts`:

```typescript
import type { MutationCtx } from "./_generated/server";

export async function createTestContact(
  ctx: { db: MutationCtx["db"] },
  overrides: Partial<{ orgId: string; firstName: string; lastName: string }> = {}
) {
  return await ctx.db.insert("contacts", {
    firstName: overrides.firstName ?? "Jane",
    lastName: overrides.lastName ?? "Doe",
    orgId: overrides.orgId ?? "test_org",
    isDeleted: false,
    searchText: `${overrides.firstName ?? "Jane"} ${overrides.lastName ?? "Doe"}`,
    ...overrides,
  });
}
```

Use inside `t.run()`:

```typescript
const contactId = await t.run(async (ctx) => {
  return await createTestContact(ctx, { orgId: "org_1" });
});
```

## Pre-Completion Checklist

Before marking any test file complete, verify every item:

### All Tests
- [ ] **Descriptive names**: `it("returns 0 when no late fees configured")` not `it("works")`
- [ ] **Tests actually run**: Execute `npm run test:once` and confirm green before finishing
- [ ] **No hardcoded dates**: Use injectable `now` parameter or fixed timestamps, never `Date.now()` in assertions

### Convex Tests
- [ ] **Isolation**: Each `it` block creates its own `convexTest()` instance — no shared mutable state
- [ ] **Security invariants**: Tenant isolation and soft-delete filtering are covered
- [ ] **Error paths**: Every `throw` in the source has a corresponding `rejects.toThrowError` test
- [ ] **Money as integers**: All monetary test values are integer cents; assertions use `toBe()`, not `toBeCloseTo()`
- [ ] **Edge cases**: Zero, negative, empty array, boundary values tested

### Component Tests
- [ ] **Renders without crashing**: Basic render test with minimal required props
- [ ] **Displays props**: Key text/labels appear via `screen.getByText()` or `screen.getByRole()`
- [ ] **Interactions**: Click/submit/toggle handlers fire correctly (if interactive)
- [ ] **Mocks declared**: All external deps (Clerk, Convex, Next.js) are mocked at file top
- [ ] **Cleanup**: `afterEach(cleanup)` runs (handled by `src/test-setup.ts`)

## When Writing Tests for New Features

1. Read the source file being tested
2. Identify all exported functions/components and their branch paths
3. Classify:
   - **Convex function**: Follow backend test template (tenant isolation + soft-delete + CRUD)
   - **React component**: Follow frontend test template (renders + props + interactions)
   - **Pure function**: Follow pure function test template (all branches + edge cases)
4. Write tests following the matching pattern from this skill
5. Run through the pre-completion checklist
6. Run `npm run test:once` and fix any failures

## Current Coverage Summary

| Surface | Files | Tests | Coverage |
|---------|-------|-------|----------|
| Convex billing helpers | 1 | 64 | All billing computations |
| Convex domain queries/mutations | 30 | ~230 | All 25 domains: tenant isolation + soft-delete + CRUD |
| Lib utilities | 3 | 46 | formatCurrency, colors, seo, events-export |
| Zod validators | 1 | 78 | All 13 schemas |
| React components (shared) | 9 | 33 | data-table, confirm-dialog, empty-state, etc. |
| React components (admin) | 7 | ~30 | header, sidebar, stats-cards, inventory grid, etc. |
| React components (public) | 5 | ~20 | header, footer, json-ld, event-calendar, business-map |
| React components (portal) | 2 | 8 | header, sidebar |
| **Total** | **~62** | **~480** | |

## Additional Resources

For full worked examples of each test category, see [reference.md](reference.md).
