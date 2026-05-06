"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PortalNoAccess } from "@/components/portal/no-access";
import { Megaphone } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useStableNow } from "@/hooks/use-stable-now";

export default function PortalAdsPage() {
  const now = useStableNow();
  const purchases = useQuery(api.portal.queries.getMyPurchases, { now });

  if (purchases === undefined) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">My Ads</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (purchases === null) {
    return <PortalNoAccess />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">My Ads</h1>

      {purchases.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No ad purchases"
          description="You don't have any ad purchases yet."
        />
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => (
            <Card
              key={purchase._id}
              className={
                purchase.isPaid
                  ? "border-t-2 border-t-emerald-500"
                  : purchase.amountPaid > 0
                    ? "border-t-2 border-t-yellow-500"
                    : "border-t-2 border-t-muted-foreground/30"
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="min-w-0 truncate text-base">
                    {purchase.invoiceNumber
                      ? `Invoice #${purchase.invoiceNumber}`
                      : "Purchase"}
                  </CardTitle>
                  {purchase.isPaid ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      Paid
                    </Badge>
                  ) : purchase.amountPaid > 0 ? (
                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                      Partial
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Unpaid</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Edition</p>
                    <p className="text-sm font-medium">
                      {purchase.editionNames || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Year</p>
                    <p className="text-sm font-medium">{purchase.year}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net</p>
                    <p className="text-sm font-medium">
                      {formatCurrency(purchase.net)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="text-sm font-medium">
                      {formatCurrency(purchase.amountPaid)}
                    </p>
                  </div>
                </div>

                {purchase.adDetails.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Ad Types
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {purchase.adDetails.map((ad, idx) => {
                        const adColors = [
                          "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
                          "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300",
                          "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300",
                          "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
                        ];
                        return (
                          <Badge key={ad._id} className={adColors[idx % adColors.length]}>
                            {ad.adName} &times; {ad.quantity}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
