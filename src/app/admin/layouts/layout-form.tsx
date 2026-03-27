"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { layoutSchema, type LayoutFormValues } from "@/lib/validators";
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

interface LayoutFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Doc<"layouts"> | null;
}

export function LayoutForm({ open, onOpenChange, editing }: LayoutFormProps) {
  const { orgId } = useOrg();
  const createMutation = useMutation(api.layouts.mutations.create);
  const updateMutation = useMutation(api.layouts.mutations.update);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<LayoutFormValues>({
    resolver: zodResolver(layoutSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (editing) {
      form.reset({ name: editing.name });
    } else {
      form.reset({ name: "" });
    }
  }, [editing, form]);

  const onSubmit = async (values: LayoutFormValues) => {
    if (!orgId) return;
    setIsPending(true);
    try {
      if (editing) {
        await updateMutation({ id: editing._id, name: values.name });
      } else {
        await createMutation({ orgId, name: values.name });
      }
      toast.success("Layout saved");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error("Failed to save layout");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit" : "New"} Layout</DialogTitle>
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
                    <Input placeholder="e.g. Standard Month" {...field} />
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
