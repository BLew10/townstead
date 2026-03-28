"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { eventSchema, type EventFormValues } from "@/lib/validators";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ImageUpload } from "@/components/shared/image-upload";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

function timestampToDateString(ts: number | undefined): string {
  if (!ts) return "";
  return new Date(ts).toISOString().split("T")[0];
}

function dateStringToTimestamp(dateStr: string): number {
  return new Date(dateStr).getTime();
}

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Doc<"events"> | null;
  communities: Doc<"communities">[];
}

export function EventForm({
  open,
  onOpenChange,
  editing,
  communities,
}: EventFormProps) {
  const { orgId } = useOrg();
  const create = useMutation(api.events.mutations.create);
  const update = useMutation(api.events.mutations.update);
  const generateUploadUrl = useMutation(api.events.mutations.generateUploadUrl);
  const [isPending, setIsPending] = useState(false);
  const [imageFileId, setImageFileId] = useState<Id<"_storage"> | undefined>();
  const [uploadingImage, setUploadingImage] = useState(false);

  const existingImageUrl = useQuery(
    api.storage.getUrl,
    imageFileId ? { storageId: imageFileId } : "skip"
  );

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: "",
      description: "",
      date: Date.now(),
      endDate: undefined,
      startTime: "",
      endTime: "",
      isYearly: false,
      communityIds: [],
    },
  });

  useEffect(() => {
    if (editing) {
      form.reset({
        name: editing.name,
        description: editing.description ?? "",
        date: editing.date,
        endDate: editing.endDate,
        startTime: editing.startTime ?? "",
        endTime: editing.endTime ?? "",
        isYearly: editing.isYearly ?? false,
        communityIds: (editing.communityIds as string[]) ?? [],
      });
      setImageFileId(editing.imageFileId ?? undefined);
    } else {
      form.reset({
        name: "",
        description: "",
        date: Date.now(),
        endDate: undefined,
        startTime: "",
        endTime: "",
        isYearly: false,
        communityIds: [],
      });
      setImageFileId(undefined);
    }
  }, [editing, form]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      setUploadingImage(true);
      try {
        const url = await generateUploadUrl();
        const result = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        setImageFileId(storageId as Id<"_storage">);
      } catch {
        toast.error("Failed to upload image");
      } finally {
        setUploadingImage(false);
      }
    },
    [generateUploadUrl]
  );

  const onSubmit = async (values: EventFormValues) => {
    if (!orgId) return;
    setIsPending(true);
    try {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        date: values.date,
        endDate: values.endDate || undefined,
        startTime: values.startTime || undefined,
        endTime: values.endTime || undefined,
        isYearly: values.isYearly || undefined,
        communityIds:
          values.communityIds && values.communityIds.length > 0
            ? (values.communityIds as Id<"communities">[])
            : undefined,
        imageFileId,
      };

      if (editing) {
        await update({ id: editing._id, ...payload });
      } else {
        await create({ orgId, ...payload });
      }
      toast.success("Event saved");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error("Failed to save event");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit" : "New"} Event</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6 px-4"
          >
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Event name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Event description..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-1">
                <Label>Event Image</Label>
                <ImageUpload
                  preset="card"
                  onUpload={handleImageUpload}
                  onRemove={() => setImageFileId(undefined)}
                  currentImageUrl={existingImageUrl ?? null}
                  uploading={uploadingImage}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={timestampToDateString(field.value)}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? dateStringToTimestamp(e.target.value)
                                : Date.now()
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={timestampToDateString(field.value)}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? dateStringToTimestamp(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="isYearly"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="mt-0!">Recurring Yearly</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {communities.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Communities
                  </h3>
                  <FormField
                    control={form.control}
                    name="communityIds"
                    render={({ field }) => (
                      <FormItem>
                        <div className="space-y-2">
                          {communities.map((community) => {
                            const checked = (field.value ?? []).includes(
                              community._id
                            );
                            return (
                              <div
                                key={community._id}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  id={`community-${community._id}`}
                                  checked={checked}
                                  onCheckedChange={(val) => {
                                    const current = field.value ?? [];
                                    if (val) {
                                      field.onChange([...current, community._id]);
                                    } else {
                                      field.onChange(
                                        current.filter(
                                          (id: string) => id !== community._id
                                        )
                                      );
                                    }
                                  }}
                                />
                                <Label htmlFor={`community-${community._id}`}>
                                  {community.name}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <SheetFooter>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving..." : "Save Event"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
