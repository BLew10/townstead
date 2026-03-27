"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const SEGMENT_LABELS: Record<string, string> = {
  admin: "Dashboard",
  calendars: "Calendars",
  contacts: "Contacts",
  advertisements: "Advertisements",
  purchases: "Purchases",
  billing: "Billing",
  events: "Events",
  layouts: "Layouts",
  "address-books": "Address Books",
  payments: "Payments",
  "this-month": "This Month",
  "cash-flow": "Cash Flow",
  invoice: "Invoice",
  statement: "Statement",
  new: "New Purchase",
  edit: "Edit",
};

function isConvexId(segment: string): boolean {
  return /^[a-z0-9]{16,}$/i.test(segment) || segment.includes(":");
}

export interface BreadcrumbOverride {
  label: string;
  href?: string;
}

interface AdminBreadcrumbsProps {
  overrides?: Record<string, BreadcrumbOverride>;
}

/**
 * Auto-generates breadcrumbs from the current pathname.
 * Dynamic ID segments are skipped unless an override is provided.
 *
 * @param overrides - Map segment value to a custom label, keyed by the
 *   segment string (e.g., `{ "abc123": { label: "INV 25-0001" } }`)
 */
export function AdminBreadcrumbs({ overrides }: AdminBreadcrumbsProps = {}) {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;

  const crumbs: { label: string; href: string }[] = [];
  let pathSoFar = "";

  for (const segment of segments) {
    pathSoFar += `/${segment}`;

    const override = overrides?.[segment];
    if (override) {
      crumbs.push({
        label: override.label,
        href: override.href ?? pathSoFar,
      });
      continue;
    }

    if (isConvexId(segment)) continue;

    const label = SEGMENT_LABELS[segment] ?? segment;
    crumbs.push({ label, href: pathSoFar });
  }

  if (crumbs.length <= 1) return null;

  return (
    <Breadcrumb className="mb-4 print:hidden">
      <BreadcrumbList>
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <Fragment key={crumb.href}>
              {idx > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={crumb.href} />}>
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
