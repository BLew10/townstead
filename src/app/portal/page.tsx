"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, CreditCard, DollarSign, CalendarClock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useStableNow } from "@/hooks/use-stable-now";

export default function PortalDashboardPage() {
  const now = useStableNow();
  const data = useQuery(api.portal.queries.getDashboardData, { now });

  if (!data) {
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Ads</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.activeAdsCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Outstanding Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(data.totalOutstanding)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Next Payment Due
            </CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
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
              <CreditCard className="h-5 w-5" />
              Upcoming Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.upcomingPayments.map((payment, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {payment.purchaseInvoice
                        ? `Invoice #${payment.purchaseInvoice}`
                        : "Payment"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due {formatDate(payment.dueDate)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatCurrency(payment.remaining)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
