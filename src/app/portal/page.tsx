"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PortalNoAccess } from "@/components/portal/no-access";
import {
  Megaphone,
  CreditCard,
  DollarSign,
  CalendarClock,
  LayoutDashboard,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useStableNow } from "@/hooks/use-stable-now";

export default function PortalDashboardPage() {
  const now = useStableNow();
  const data = useQuery(api.portal.queries.getDashboardData, { now });

  if (data === undefined) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (data === null) {
    return <PortalNoAccess />;
  }

  const isEmpty =
    data.activeAdsCount === 0 &&
    data.totalOutstanding === 0 &&
    data.upcomingPayments.length === 0;

  if (isEmpty) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <EmptyState
          icon={LayoutDashboard}
          title="Welcome to your portal"
          description="You don't have any ad purchases yet. Once your account manager creates a purchase for you, your dashboard will show active ads, balances, and upcoming payments."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-t-2 border-t-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Ads</CardTitle>
            <div className="rounded-full bg-orange-100 p-1.5 dark:bg-orange-500/20">
              <Megaphone className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.activeAdsCount}</p>
          </CardContent>
        </Card>

        <Card className="border-t-2 border-t-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Outstanding Balance
            </CardTitle>
            <div className="rounded-full bg-amber-100 p-1.5 dark:bg-amber-500/20">
              <DollarSign className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(data.totalOutstanding)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-2 border-t-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Next Payment Due
            </CardTitle>
            <div className="rounded-full bg-blue-100 p-1.5 dark:bg-blue-500/20">
              <CalendarClock className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {data.upcomingPayments.length > 0 ? (
              <>
                <p className="text-2xl font-bold">
                  {formatCurrency(data.upcomingPayments[0].remaining)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Due {formatDate(data.upcomingPayments[0].dueDate)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming payments</p>
            )}
          </CardContent>
        </Card>
      </div>

      {data.upcomingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-500" />
              Upcoming Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.upcomingPayments.map((payment, i) => {
                const isOverdue = payment.dueDate < Date.now();
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between rounded-md border p-3 border-l-3 ${
                      isOverdue
                        ? "border-l-rose-500 bg-rose-50/50 dark:bg-rose-500/5"
                        : "border-l-emerald-500"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {payment.purchaseInvoice
                          ? `Invoice #${payment.purchaseInvoice}`
                          : "Payment"}
                      </p>
                      <p className={`text-xs ${isOverdue ? "text-rose-600 font-medium" : "text-muted-foreground"}`}>
                        {isOverdue ? "Overdue — " : ""}Due {formatDate(payment.dueDate)}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {formatCurrency(payment.remaining)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
