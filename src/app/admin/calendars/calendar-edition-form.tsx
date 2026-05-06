"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import {
  calendarEditionSchema,
  type CalendarEditionFormValues,
} from "@/lib/validators";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

const NONE_VALUE = "__none__";

interface CalendarEditionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Doc<"calendarEditions"> | null;
}

export function CalendarEditionForm({
  open,
  onOpenChange,
  editing,
}: CalendarEditionFormProps) {
  const { orgId } = useOrg();
  const createMutation = useMutation(api.calendarEditions.mutations.create);
  const updateMutation = useMutation(api.calendarEditions.mutations.update);
  const [isPending, setIsPending] = useState(false);

  const communities = useQuery(
    api.communities.queries.list,
    orgId ? { orgId } : "skip"
  );

  const currentCommunityId = useMemo(() => {
    if (!editing || !communities) return undefined;
    const match = communities.find((c) =>
      c.calendarEditionIds.includes(editing._id)
    );
    return match?._id;
  }, [editing, communities]);

  const form = useForm<CalendarEditionFormValues>({
    resolver: zodResolver(calendarEditionSchema),
    defaultValues: { name: "", code: "", communityId: undefined },
  });

  useEffect(() => {
    if (editing) {
      form.reset({
        name: editing.name,
        code: editing.code,
        communityId: currentCommunityId ?? undefined,
      });
    } else {
      form.reset({ name: "", code: "", communityId: undefined });
    }
  }, [editing, currentCommunityId, form]);

  const onSubmit = async (values: CalendarEditionFormValues) => {
    if (!orgId) return;
    setIsPending(true);
    try {
      const selectedCommunityId = values.communityId as
        | Id<"communities">
        | undefined;

      if (editing) {
        const wasAssigned = !!currentCommunityId;
        const isNowUnassigned = !selectedCommunityId;
        const changed = selectedCommunityId !== currentCommunityId;

        await updateMutation({
          id: editing._id,
          name: values.name,
          code: values.code,
          ...(changed && selectedCommunityId
            ? { communityId: selectedCommunityId }
            : {}),
          ...(wasAssigned && isNowUnassigned && changed
            ? { removeCommunity: true }
            : {}),
        });
      } else {
        await createMutation({
          orgId,
          name: values.name,
          code: values.code,
          ...(selectedCommunityId ? { communityId: selectedCommunityId } : {}),
        });
      }
      toast.success("Calendar edition saved");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error("Failed to save calendar edition");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit" : "New"} Calendar Edition
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Downtown Edition" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. DT" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {communities && communities.length > 0 && (
              <FormField
                control={form.control}
                name="communityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Community</FormLabel>
                    <Select
                      onValueChange={(v) =>
                        field.onChange(v === NONE_VALUE ? undefined : v)
                      }
                      value={field.value ?? NONE_VALUE}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a community">
                            {field.value
                              ? (communities?.find((c) => c._id === field.value)
                                  ?.name ?? "Select a community")
                              : "None"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>None</SelectItem>
                        {communities.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
