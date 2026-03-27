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
import { VideoForm } from "./video-form";
import type { Doc } from "../../../../convex/_generated/dataModel";

export default function VideosPage() {
  const { orgId, isReady } = useOrg();
  const videos = useQuery(
    api.videos.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const contacts = useQuery(
    api.contacts.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const categories = useQuery(
    api.categories.queries.list,
    isReady ? { orgId: orgId!, type: "video" } : "skip"
  );
  const communities = useQuery(
    api.communities.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"videos"> | null>(null);

  if (!isReady || videos === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="Videos" />
        <TableSkeleton columns={5} rows={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Videos"
        description="Manage video content for your communities"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Video
          </Button>
        }
      />
      <DataTable
        columns={columns({
          onEdit: (video) => {
            setEditing(video);
            setFormOpen(true);
          },
          contacts: contacts ?? [],
          categories: categories ?? [],
        })}
        data={videos}
        searchKey="title"
        searchPlaceholder="Search by title..."
        emptyTitle="No videos"
        emptyDescription="Get started by adding your first video."
      />
      <VideoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        contacts={contacts ?? []}
        categories={categories ?? []}
        communities={communities ?? []}
      />
    </div>
  );
}
