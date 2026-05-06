"use client";

import { useState } from "react";
import Link from "next/link";
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
import { columns } from "./columns";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "published", label: "Published" },
] as const;

type StatusFilter = "all" | "draft" | "pending" | "published";

export default function AdminBlogPage() {
  const { orgId, isReady } = useOrg();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const queryArgs = isReady
    ? {
        orgId: orgId!,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      }
    : "skip";

  const posts = useQuery(api.blog.queries.list, queryArgs);

  if (!isReady || posts === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="Blog Posts" />
        <TableSkeleton columns={5} rows={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog Posts"
        description="Create and manage blog content"
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter((v ?? "all") as StatusFilter)
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue>
                  {STATUS_OPTIONS.find((opt) => opt.value === statusFilter)?.label ??
                    "All Statuses"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button render={<Link href="/admin/blog/new" />}>
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Button>
          </div>
        }
      />
      <DataTable
        columns={columns}
        data={posts}
        searchKey="title"
        searchPlaceholder="Search blog posts..."
        emptyTitle="No blog posts"
        emptyDescription="Get started by creating your first blog post."
      />
    </div>
  );
}
