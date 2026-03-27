"use client";

import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface DashboardStats {
  totalRevenue: number;
  collectionRate: number;
  outstandingBalance: number;
  latePaymentsCount: number;
}

export function StatsCards({ stats }: { stats: DashboardStats }) {
  const cards = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      description: "Net revenue for this edition & year",
    },
    {
      title: "Collection Rate",
      value: `${stats.collectionRate.toFixed(1)}%`,
      icon: TrendingUp,
      description: "Payments collected vs. total owed",
    },
    {
      title: "Outstanding Balance",
      value: formatCurrency(stats.outstandingBalance),
      icon: AlertTriangle,
      description: "Remaining unpaid balance",
    },
    {
      title: "Late Payments",
      value: stats.latePaymentsCount.toString(),
      icon: Clock,
      description: "Scheduled payments past due",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
