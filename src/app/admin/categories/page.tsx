"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { PageHeader } from "@/components/shared/page-header";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useState } from "react";
import { columns } from "./columns";
import { CategoryForm } from "./category-form";
import type { Doc } from "../../../../convex/_generated/dataModel";

const CATEGORY_TYPES = [
  { value: "all", label: "All Types" },
  { value: "event", label: "Event" },
  { value: "blog", label: "Blog" },
  { value: "video", label: "Video" },
  { value: "business", label: "Business" },
] as const;

type TypeFilter = "all" | "event" | "blog" | "video" | "business";

export default function CategoriesPage() {
  const { orgId, isReady } = useOrg();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"categories"> | null>(null);

  const queryArgs = isReady
    ? {
        orgId: orgId!,
        ...(typeFilter !== "all" ? { type: typeFilter } : {}),
      }
    : "skip";

  const categories = useQuery(api.categories.queries.list, queryArgs);

  if (!isReady || categories === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="Categories" />
        <TableSkeleton columns={3} rows={10} />
      </div>
    );
  }

  const handleEdit = (category: Doc<"categories">) => {
    setEditing(category);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage categories for events, blog posts, videos, and businesses"
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={typeFilter}
              onValueChange={(v) =>
                setTypeFilter((v ?? "all") as TypeFilter)
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        }
      />
      <DataTable
        columns={columns({ onEdit: handleEdit })}
        data={categories}
        searchKey="name"
        searchPlaceholder="Search categories..."
        emptyTitle="No categories"
        emptyDescription="Get started by adding your first category."
      />
      <CategoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
      />
    </div>
  );
}
