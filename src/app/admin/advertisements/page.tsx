"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { PageHeader } from "@/components/shared/page-header";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { columns } from "./columns";
import { AdvertisementForm } from "./advertisement-form";
import { AdPricingForm } from "./ad-pricing-form";
import type { Doc } from "../../../../convex/_generated/dataModel";

export default function AdvertisementsPage() {
  const { orgId, isReady } = useOrg();
  const advertisements = useQuery(
    api.advertisements.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const [formOpen, setFormOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Doc<"advertisements"> | null>(
    null
  );

  if (!isReady || advertisements === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="Advertisements" />
        <TableSkeleton columns={3} rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Advertisements"
        description="Manage advertisement types and their pricing"
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Advertisement
          </Button>
        }
      />
      <DataTable
        columns={columns({
          onPricing: (ad) => {
            setSelectedAd(ad);
            setPricingOpen(true);
          },
        })}
        data={advertisements}
        searchKey="name"
        searchPlaceholder="Search advertisements..."
        emptyTitle="No advertisements"
        emptyDescription="Get started by creating your first advertisement type."
      />
      <AdvertisementForm open={formOpen} onOpenChange={setFormOpen} />
      <AdPricingForm
        open={pricingOpen}
        onOpenChange={setPricingOpen}
        advertisement={selectedAd}
      />
    </div>
  );
}
