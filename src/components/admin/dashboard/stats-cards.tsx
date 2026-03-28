"use client";

import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

interface DashboardStats {
  totalRevenue: number;
  collectionRate: number;
  outstandingBalance: number;
  latePaymentsCount: number;
}

const cardMeta = [
  {
    title: "Total Revenue",
    icon: DollarSign,
    description: "Net revenue for this edition & year",
    format: (s: DashboardStats) => formatCurrency(s.totalRevenue),
  },
  {
    title: "Collection Rate",
    icon: TrendingUp,
    description: "Payments collected vs. total owed",
    format: (s: DashboardStats) => `${s.collectionRate.toFixed(1)}%`,
  },
  {
    title: "Outstanding Balance",
    icon: AlertTriangle,
    description: "Remaining unpaid balance",
    format: (s: DashboardStats) => formatCurrency(s.outstandingBalance),
  },
  {
    title: "Late Payments",
    icon: Clock,
    description: "Scheduled payments past due",
    format: (s: DashboardStats) => s.latePaymentsCount.toString(),
  },
];

export function StatsCards({ stats }: { stats: DashboardStats | undefined }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cardMeta.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats ? (
              <>
                <div className="text-2xl font-bold">{card.format(stats)}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </>
            ) : (
              <>
                <Skeleton className="mb-1 h-7 w-24" />
                <Skeleton className="h-3.5 w-36" />
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
