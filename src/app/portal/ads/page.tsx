"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Megaphone } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function PortalAdsPage() {
  const purchases = useQuery(api.portal.queries.getMyPurchases);

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
            <Card key={purchase._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
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
                      {purchase.adDetails.map((ad) => (
                        <Badge key={ad._id} variant="outline">
                          {ad.adName} &times; {ad.quantity}
                        </Badge>
                      ))}
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
