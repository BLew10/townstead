"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import {
  addressBookSchema,
  type AddressBookFormValues,
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

interface AddressBookFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Doc<"addressBooks"> | null;
}

export function AddressBookForm({
  open,
  onOpenChange,
  editing,
}: AddressBookFormProps) {
  const { orgId } = useOrg();
  const create = useMutation(api.addressBooks.mutations.create);
  const update = useMutation(api.addressBooks.mutations.update);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<AddressBookFormValues>({
    resolver: zodResolver(addressBookSchema),
    defaultValues: { name: "", displayLevel: "" },
  });

  useEffect(() => {
    if (editing) {
      form.reset({
        name: editing.name,
        displayLevel: editing.displayLevel ?? "",
      });
    } else {
      form.reset({ name: "", displayLevel: "" });
    }
  }, [editing, form]);

  const onSubmit = async (values: AddressBookFormValues) => {
    if (!orgId) return;
    setIsPending(true);
    const displayLevel =
      values.displayLevel === "" ? undefined : values.displayLevel;
    try {
      if (editing) {
        await update({
          id: editing._id,
          name: values.name,
          displayLevel,
        });
      } else {
        await create({
          orgId,
          name: values.name,
          displayLevel,
        });
      }
      toast.success("Address book saved");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error("Failed to save address book");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit" : "New"} Address Book
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
                    <Input placeholder="e.g. VIP Clients" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayLevel"
              render={({ field }) => {
                const selectKey =
                  field.value == null || field.value === ""
                    ? "__none__"
                    : field.value === "private" || field.value === "public"
                      ? field.value
                      : "__none__";
                const visibilityLabel: Record<
                  "__none__" | "private" | "public",
                  string
                > = {
                  __none__: "None",
                  private: "Private",
                  public: "Public",
                };
                return (
                <FormItem>
                  <FormLabel>Display Level</FormLabel>
                  <Select
                    value={selectKey}
                    onValueChange={(v) =>
                      field.onChange(
                        v == null || v === "__none__" ? "" : v,
                      )
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select visibility">
                          {visibilityLabel[selectKey]}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
                );
              }}
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
