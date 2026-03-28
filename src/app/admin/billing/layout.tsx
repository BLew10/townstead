"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const billingTabs = [
  { label: "Payments", href: "/admin/billing/payments" },
  { label: "This Month", href: "/admin/billing/this-month" },
  { label: "Cash Flow", href: "/admin/billing/cash-flow" },
];

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Payment tracking, monthly summaries, and cash flow reports.
        </p>
      </div>

      <nav className="flex gap-1 border-b">
        {billingTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors rounded-t-md",
              pathname === tab.href
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 hover:bg-muted/50"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
