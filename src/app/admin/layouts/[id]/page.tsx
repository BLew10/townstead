"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Trash2,
  LayoutGrid,
  Link2,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useOrg } from "@/hooks/use-org";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adPlacementSchema, type AdPlacementFormValues } from "@/lib/validators";
import { LayoutForm } from "../layout-form";

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 360;

const PLACEMENT_COLORS = [
  "bg-blue-200 border-blue-400",
  "bg-green-200 border-green-400",
  "bg-amber-200 border-amber-400",
  "bg-rose-200 border-rose-400",
  "bg-purple-200 border-purple-400",
  "bg-cyan-200 border-cyan-400",
  "bg-orange-200 border-orange-400",
  "bg-teal-200 border-teal-400",
];

function LayoutDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-96 lg:col-span-2" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

function CanvasPreview({
  placements,
  advertisements,
}: {
  placements: Doc<"adPlacements">[];
  advertisements: Doc<"advertisements">[] | undefined;
}) {
  if (placements.length === 0) {
    return (
      <div
        className="relative rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 flex items-center justify-center"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      >
        <p className="text-sm text-muted-foreground">
          No placements yet. Add one below.
        </p>
      </div>
    );
  }

  const maxX = Math.max(...placements.map((p) => p.x + p.width));
  const maxY = Math.max(...placements.map((p) => p.y + p.height));
  const scaleX = maxX > 0 ? CANVAS_WIDTH / maxX : 1;
  const scaleY = maxY > 0 ? CANVAS_HEIGHT / maxY : 1;
  const scale = Math.min(scaleX, scaleY, 1);

  return (
    <div
      className="relative rounded-lg border bg-muted/30 overflow-hidden"
      style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
    >
      {placements.map((placement, idx) => {
        const adName =
          advertisements?.find((a) => a._id === placement.advertisementId)
            ?.name ?? "Unknown";
        const color = PLACEMENT_COLORS[idx % PLACEMENT_COLORS.length];

        return (
          <div
            key={placement._id}
            className={`absolute border-2 rounded-sm flex items-center justify-center text-xs font-medium p-1 overflow-hidden ${color}`}
            style={{
              left: placement.x * scale,
              top: placement.y * scale,
              width: placement.width * scale,
              height: placement.height * scale,
            }}
            title={`${adName} (${placement.x}, ${placement.y}) ${placement.width}×${placement.height}`}
          >
            <span className="truncate">{adName}</span>
          </div>
        );
      })}
    </div>
  );
}

function PlacementForm({
  open,
  onOpenChange,
  layoutId,
  advertisements,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layoutId: Id<"layouts">;
  advertisements: Doc<"advertisements">[] | undefined;
  editing: Doc<"adPlacements"> | null;
}) {
  const { orgId } = useOrg();
  const createPlacement = useMutation(api.adPlacements.mutations.create);
  const updatePlacement = useMutation(api.adPlacements.mutations.update);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<AdPlacementFormValues>({
    resolver: zodResolver(adPlacementSchema),
    defaultValues: {
      layoutId: layoutId,
      advertisementId: "",
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      position: undefined,
    },
  });

  useEffect(() => {
    if (editing) {
      form.reset({
        layoutId: layoutId,
        advertisementId: editing.advertisementId,
        x: editing.x,
        y: editing.y,
        width: editing.width,
        height: editing.height,
        position: editing.position,
      });
    } else {
      form.reset({
        layoutId: layoutId,
        advertisementId: "",
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        position: undefined,
      });
    }
  }, [editing, layoutId, form]);

  const onSubmit = async (values: AdPlacementFormValues) => {
    if (!orgId) return;
    setIsPending(true);
    try {
      if (editing) {
        await updatePlacement({
          id: editing._id,
          x: values.x,
          y: values.y,
          width: values.width,
          height: values.height,
          position: values.position,
        });
        toast.success("Placement updated");
      } else {
        await createPlacement({
          orgId,
          layoutId: layoutId,
          advertisementId: values.advertisementId as Id<"advertisements">,
          x: values.x,
          y: values.y,
          width: values.width,
          height: values.height,
          position: values.position,
        });
        toast.success("Placement added");
      }
      onOpenChange(false);
      form.reset();
    } catch {
      toast.error(editing ? "Failed to update placement" : "Failed to add placement");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit" : "Add"} Ad Placement
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!editing && (
              <FormField
                control={form.control}
                name="advertisementId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Advertisement Type</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select ad type">
                            {advertisements?.find((ad) => ad._id === field.value)?.name ??
                              "Select ad type"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {advertisements?.map((ad) => (
                            <SelectItem key={ad._id} value={ad._id}>
                              {ad.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="x"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>X</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="y"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Y</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 1)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 1)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position (optional)</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(val) =>
                        field.onChange(val === "" ? undefined : val)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentPanel({
  layoutId,
  assignments,
  editions,
}: {
  layoutId: Id<"layouts">;
  assignments: Doc<"calendarEditionLayouts">[] | undefined;
  editions: Doc<"calendarEditions">[] | undefined;
}) {
  const { orgId } = useOrg();
  const assignMutation = useMutation(
    api.calendarEditionLayouts.mutations.assign
  );
  const unassignMutation = useMutation(
    api.calendarEditionLayouts.mutations.unassign
  );
  const [selectedEdition, setSelectedEdition] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [isPending, setIsPending] = useState(false);
  const [confirmId, setConfirmId] = useState<Id<"calendarEditionLayouts"> | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleAssign = async () => {
    if (!orgId || !selectedEdition) return;
    setIsPending(true);
    try {
      await assignMutation({
        orgId,
        calendarEditionId: selectedEdition as Id<"calendarEditions">,
        layoutId,
        year,
      });
      toast.success("Layout assigned");
      setSelectedEdition("");
    } catch {
      toast.error("Failed to assign layout");
    } finally {
      setIsPending(false);
    }
  };

  const handleUnassign = async () => {
    if (!confirmId) return;
    setDeleteLoading(true);
    try {
      await unassignMutation({ id: confirmId });
      toast.success("Layout assignment removed");
    } catch {
      toast.error("Failed to remove assignment");
    } finally {
      setDeleteLoading(false);
      setConfirmId(null);
    }
  };

  const getEditionName = (id: Id<"calendarEditions">) =>
    editions?.find((e) => e._id === id)?.name ?? "Unknown";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Edition Assignments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Calendar Edition</Label>
            <Select
              value={selectedEdition}
              onValueChange={(v) => setSelectedEdition(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select edition">
                  {editions?.find((ed) => ed._id === selectedEdition)?.name ??
                    "Select edition"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {editions?.map((edition) => (
                  <SelectItem key={edition._id} value={edition._id}>
                    {edition.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <Input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) =>
                setYear(parseInt(e.target.value, 10) || new Date().getFullYear())
              }
            />
          </div>
          <Button
            onClick={handleAssign}
            disabled={!selectedEdition || isPending}
            size="sm"
            className="w-full"
          >
            {isPending ? "Assigning..." : "Assign"}
          </Button>
        </div>

        {assignments && assignments.length > 0 ? (
          <div className="space-y-2">
            {assignments.map((a) => (
              <div
                key={a._id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {getEditionName(a.calendarEditionId)}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.year}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive"
                  onClick={() => setConfirmId(a._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No editions assigned yet.
          </p>
        )}

        <ConfirmDialog
          open={confirmId !== null}
          onOpenChange={(open) => {
            if (!open) setConfirmId(null);
          }}
          title="Remove Assignment"
          description="Are you sure you want to remove this edition assignment?"
          onConfirm={handleUnassign}
          confirmLabel="Remove"
          variant="destructive"
          loading={deleteLoading}
        />
      </CardContent>
    </Card>
  );
}

export default function LayoutDetailPage() {
  const params = useParams();
  const id = params.id as Id<"layouts">;
  const { orgId, isReady } = useOrg();
  const layout = useQuery(api.layouts.queries.getById, { id });
  const placements = useQuery(api.adPlacements.queries.listByLayout, {
    layoutId: id,
  });
  const assignments = useQuery(
    api.calendarEditionLayouts.queries.listByLayout,
    isReady ? { orgId: orgId!, layoutId: id } : "skip"
  );
  const advertisements = useQuery(
    api.advertisements.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const editions = useQuery(
    api.calendarEditions.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );

  const [editFormOpen, setEditFormOpen] = useState(false);
  const [placementFormOpen, setPlacementFormOpen] = useState(false);
  const [editingPlacement, setEditingPlacement] =
    useState<Doc<"adPlacements"> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] =
    useState<Id<"adPlacements"> | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const removePlacement = useMutation(api.adPlacements.mutations.remove);

  const handleDeletePlacement = async () => {
    if (!confirmDeleteId) return;
    setDeleteLoading(true);
    try {
      await removePlacement({ id: confirmDeleteId });
      toast.success("Placement removed");
    } catch {
      toast.error("Failed to remove placement");
    } finally {
      setDeleteLoading(false);
      setConfirmDeleteId(null);
    }
  };

  if (layout === undefined || placements === undefined) {
    return <LayoutDetailSkeleton />;
  }

  if (layout === null) {
    return (
      <div className="space-y-6">
        <Link href="/admin/layouts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Layouts
          </Button>
        </Link>
        <EmptyState
          title="Layout not found"
          description="This layout may have been deleted."
        />
      </div>
    );
  }

  const getAdName = (advertisementId: Id<"advertisements">) =>
    advertisements?.find((a) => a._id === advertisementId)?.name ?? "Unknown";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/layouts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      <PageHeader
        title={layout.name}
        description="Layout builder — manage ad placements and edition assignments"
        actions={
          <Button variant="outline" onClick={() => setEditFormOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Name
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Canvas Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CanvasPreview
                placements={placements}
                advertisements={advertisements}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ad Placements</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setEditingPlacement(null);
                  setPlacementFormOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Placement
              </Button>
            </CardHeader>
            <CardContent>
              {placements.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ad Type</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>X</TableHead>
                        <TableHead>Y</TableHead>
                        <TableHead>W</TableHead>
                        <TableHead>H</TableHead>
                        <TableHead className="w-[80px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {placements.map((placement) => (
                        <TableRow key={placement._id}>
                          <TableCell className="font-medium">
                            {getAdName(placement.advertisementId)}
                          </TableCell>
                          <TableCell>
                            {placement.position ? (
                              <Badge variant="secondary">
                                {placement.position}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>{placement.x}</TableCell>
                          <TableCell>{placement.y}</TableCell>
                          <TableCell>{placement.width}</TableCell>
                          <TableCell>{placement.height}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setEditingPlacement(placement);
                                  setPlacementFormOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive"
                                onClick={() =>
                                  setConfirmDeleteId(placement._id)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  icon={LayoutGrid}
                  title="No placements"
                  description="Add ad placements to define where ads appear on this layout."
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <AssignmentPanel
            layoutId={id}
            assignments={assignments}
            editions={editions}
          />
        </div>
      </div>

      <LayoutForm
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        editing={layout as Doc<"layouts">}
      />

      <PlacementForm
        open={placementFormOpen}
        onOpenChange={setPlacementFormOpen}
        layoutId={id}
        advertisements={advertisements}
        editing={editingPlacement}
      />

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
        title="Delete Placement"
        description="Are you sure you want to delete this ad placement? This action cannot be undone."
        onConfirm={handleDeletePlacement}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteLoading}
      />
    </div>
  );
}
