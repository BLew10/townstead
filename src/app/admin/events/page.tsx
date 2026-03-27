"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { PageHeader } from "@/components/shared/page-header";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Plus, List, CalendarDays } from "lucide-react";
import { useState } from "react";
import { columns } from "./columns";
import { EventForm } from "./event-form";
import { EventCalendar } from "./event-calendar";
import type { Doc } from "../../../../convex/_generated/dataModel";

export default function EventsPage() {
  const { orgId, isReady } = useOrg();
  const events = useQuery(
    api.events.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const editions = useQuery(
    api.calendarEditions.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"events"> | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  if (!isReady || events === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="Events" />
        <TableSkeleton columns={5} rows={10} />
      </div>
    );
  }

  const handleEdit = (event: Doc<"events">) => {
    setEditing(event);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="Manage calendar events and holidays"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-r-none"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("calendar")}
                className="rounded-l-none"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </div>
        }
      />
      {viewMode === "list" ? (
        <DataTable
          columns={columns({
            onEdit: handleEdit,
            editions: editions ?? [],
          })}
          data={events}
          searchKey="name"
          searchPlaceholder="Search events..."
          emptyTitle="No events"
          emptyDescription="Get started by adding your first event."
        />
      ) : (
        <EventCalendar events={events} onEventClick={handleEdit} />
      )}
      <EventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        editions={editions ?? []}
      />
    </div>
  );
}
