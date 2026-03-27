"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
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
import { toast } from "sonner";
import { useState, useEffect } from "react";
import type { Doc } from "../../../../convex/_generated/dataModel";

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

  const form = useForm<CalendarEditionFormValues>({
    resolver: zodResolver(calendarEditionSchema),
    defaultValues: { name: "", code: "" },
  });

  useEffect(() => {
    if (editing) {
      form.reset({ name: editing.name, code: editing.code });
    } else {
      form.reset({ name: "", code: "" });
    }
  }, [editing, form]);

  const onSubmit = async (values: CalendarEditionFormValues) => {
    if (!orgId) return;
    setIsPending(true);
    try {
      if (editing) {
        await updateMutation({
          id: editing._id,
          name: values.name,
          code: values.code,
        });
      } else {
        await createMutation({
          orgId,
          name: values.name,
          code: values.code,
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
