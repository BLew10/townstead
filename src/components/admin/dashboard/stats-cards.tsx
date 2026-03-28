"use client";

import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";

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
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
    borderColor: "border-t-2 border-t-emerald-500",
  },
  {
    title: "Collection Rate",
    icon: TrendingUp,
    description: "Payments collected vs. total owed",
    format: (s: DashboardStats) => `${s.collectionRate.toFixed(1)}%`,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-500/20",
    borderColor: "border-t-2 border-t-blue-500",
  },
  {
    title: "Outstanding Balance",
    icon: AlertTriangle,
    description: "Remaining unpaid balance",
    format: (s: DashboardStats) => formatCurrency(s.outstandingBalance),
    iconColor: "text-amber-600",
    iconBg: "bg-amber-100 dark:bg-amber-500/20",
    borderColor: "border-t-2 border-t-amber-500",
  },
  {
    title: "Late Payments",
    icon: Clock,
    description: "Scheduled payments past due",
    format: (s: DashboardStats) => s.latePaymentsCount.toString(),
    iconColor: "text-rose-600",
    iconBg: "bg-rose-100 dark:bg-rose-500/20",
    borderColor: "border-t-2 border-t-rose-500",
  },
];

export function StatsCards({ stats }: { stats: DashboardStats | undefined }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
      {cardMeta.map((card) => (
        <Card key={card.title} className={card.borderColor}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={cn("rounded-full p-1.5", card.iconBg)}>
              <card.icon className={cn("h-4 w-4", card.iconColor)} />
            </div>
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
