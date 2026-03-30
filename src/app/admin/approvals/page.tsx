"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { useOrg } from "@/hooks/use-org";
import { PageHeader } from "@/components/shared/page-header";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, CalendarDots, FileText, VideoCamera } from "@phosphor-icons/react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

type ContentType = "events" | "blog" | "videos";

interface PendingItem {
  id: string;
  type: ContentType;
  title: string;
  submittedBy: string | undefined;
  createdAt: number;
}

function normalizeItems(
  events: Doc<"events">[],
  blogPosts: Doc<"blogPosts">[],
  videos: Doc<"videos">[]
): PendingItem[] {
  const items: PendingItem[] = [
    ...events.map((e) => ({
      id: e._id,
      type: "events" as const,
      title: e.name,
      submittedBy: e.submittedBy,
      createdAt: e._creationTime,
    })),
    ...blogPosts.map((p) => ({
      id: p._id,
      type: "blog" as const,
      title: p.title,
      submittedBy: p.submittedBy ?? p.authorId,
      createdAt: p._creationTime,
    })),
    ...videos.map((v) => ({
      id: v._id,
      type: "videos" as const,
      title: v.title,
      submittedBy: v.submittedBy,
      createdAt: v._creationTime,
    })),
  ];
  items.sort((a, b) => b.createdAt - a.createdAt);
  return items;
}

const TYPE_CONFIG: Record<ContentType, { label: string; icon: typeof CalendarDots; color: string }> = {
  events: { label: "Event", icon: CalendarDots, color: "bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-300" },
  blog: { label: "Blog Post", icon: FileText, color: "bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300" },
  videos: { label: "Video", icon: VideoCamera, color: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300" },
};

function ApprovalActions({ item }: { item: PendingItem }) {
  const approveEvent = useMutation(api.events.mutations.approve);
  const rejectEvent = useMutation(api.events.mutations.reject);
  const approveBlog = useMutation(api.blog.mutations.approve);
  const rejectBlog = useMutation(api.blog.mutations.reject);
  const approveVideo = useMutation(api.videos.mutations.approve);
  const rejectVideo = useMutation(api.videos.mutations.reject);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      if (item.type === "events") {
        await approveEvent({ id: item.id as Doc<"events">["_id"] });
      } else if (item.type === "blog") {
        await approveBlog({ id: item.id as Doc<"blogPosts">["_id"] });
      } else {
        await approveVideo({ id: item.id as Doc<"videos">["_id"] });
      }
      toast.success(`${TYPE_CONFIG[item.type].label} approved`);
    } catch {
      toast.error("Failed to approve");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      if (item.type === "events") {
        await rejectEvent({ id: item.id as Doc<"events">["_id"] });
      } else if (item.type === "blog") {
        await rejectBlog({ id: item.id as Doc<"blogPosts">["_id"] });
      } else {
        await rejectVideo({ id: item.id as Doc<"videos">["_id"] });
      }
      toast.success(`${TYPE_CONFIG[item.type].label} rejected`);
    } catch {
      toast.error("Failed to reject");
    } finally {
      setLoading(false);
      setRejectOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleApprove}
        disabled={loading}
        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-500/10"
      >
        <Check className="mr-1 h-4 w-4" weight="bold" />
        Approve
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setRejectOpen(true)}
        disabled={loading}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <X className="mr-1 h-4 w-4" weight="bold" />
        Reject
      </Button>
      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={`Reject ${TYPE_CONFIG[item.type].label}`}
        description={`Are you sure you want to reject "${item.title}"? This action cannot be undone.`}
        onConfirm={handleReject}
        confirmLabel="Reject"
        variant="destructive"
        loading={loading}
      />
    </div>
  );
}

function ApprovalTable({ items }: { items: PendingItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <Check className="mb-3 h-10 w-10 text-muted-foreground/40" weight="duotone" />
        <h3 className="text-lg font-medium text-muted-foreground">All caught up</h3>
        <p className="text-sm text-muted-foreground/60">No items pending approval.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const config = TYPE_CONFIG[item.type];
            const Icon = config.icon;
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>
                  <Badge className={config.color}>
                    <Icon className="mr-1 h-3 w-3" weight="duotone" />
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(item.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <ApprovalActions item={item} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function TabBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Badge
      variant="secondary"
      className="ml-1.5 h-5 min-w-5 justify-center rounded-full px-1.5 text-xs"
    >
      {count}
    </Badge>
  );
}

export default function ApprovalsPage() {
  const { isReady } = useOrg();
  const pending = useQuery(api.approvals.queries.listPending, isReady ? {} : "skip");
  const counts = useQuery(api.approvals.queries.countPending, isReady ? {} : "skip");

  if (!isReady || !pending || !counts) {
    return (
      <div className="space-y-6">
        <PageHeader title="Approvals" />
        <TableSkeleton columns={4} rows={6} />
      </div>
    );
  }

  const allItems = normalizeItems(pending.events, pending.blogPosts, pending.videos);
  const eventItems = allItems.filter((i) => i.type === "events");
  const blogItems = allItems.filter((i) => i.type === "blog");
  const videoItems = allItems.filter((i) => i.type === "videos");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Review and approve community-submitted content"
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All
            <TabBadge count={counts.total} />
          </TabsTrigger>
          <TabsTrigger value="events">
            Events
            <TabBadge count={counts.events} />
          </TabsTrigger>
          <TabsTrigger value="blog">
            Blog
            <TabBadge count={counts.blog} />
          </TabsTrigger>
          <TabsTrigger value="videos">
            Videos
            <TabBadge count={counts.videos} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <ApprovalTable items={allItems} />
        </TabsContent>
        <TabsContent value="events" className="mt-4">
          <ApprovalTable items={eventItems} />
        </TabsContent>
        <TabsContent value="blog" className="mt-4">
          <ApprovalTable items={blogItems} />
        </TabsContent>
        <TabsContent value="videos" className="mt-4">
          <ApprovalTable items={videoItems} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
