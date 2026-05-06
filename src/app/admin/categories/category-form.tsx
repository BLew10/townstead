"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { categorySchema, type CategoryFormValues } from "@/lib/validators";
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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import type { Doc } from "../../../../convex/_generated/dataModel";

const CATEGORY_TYPES = [
  { value: "event", label: "Event" },
  { value: "blog", label: "Blog" },
  { value: "video", label: "Video" },
  { value: "business", label: "Business" },
] as const;

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Doc<"categories"> | null;
}

export function CategoryForm({
  open,
  onOpenChange,
  editing,
}: CategoryFormProps) {
  const { orgId } = useOrg();
  const create = useMutation(api.categories.mutations.create);
  const update = useMutation(api.categories.mutations.update);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "event",
    },
  });

  useEffect(() => {
    if (editing) {
      form.reset({
        name: editing.name,
        type: editing.type,
      });
    } else {
      form.reset({
        name: "",
        type: "event",
      });
    }
  }, [editing, form]);

  const onSubmit = async (values: CategoryFormValues) => {
    if (!orgId) return;
    setIsPending(true);
    try {
      if (editing) {
        await update({ id: editing._id, name: values.name });
        toast("Category updated");
      } else {
        await create({ orgId, name: values.name, type: values.type });
        toast("Category created");
      }
      onOpenChange(false);
      form.reset();
    } catch {
      toast.error("Failed to save category");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit" : "New"} Category</DialogTitle>
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
                    <Input placeholder="Category name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v ?? "")}
                    value={field.value}
                    disabled={!!editing}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a type">
                          {CATEGORY_TYPES.find((t) => t.value === field.value)?.label ??
                            "Select a type"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
