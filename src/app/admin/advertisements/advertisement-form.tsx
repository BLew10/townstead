"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import {
  advertisementSchema,
  type AdvertisementFormValues,
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface AdvertisementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdvertisementForm({
  open,
  onOpenChange,
}: AdvertisementFormProps) {
  const { orgId } = useOrg();
  const createMutation = useMutation(api.advertisements.mutations.create);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<AdvertisementFormValues>({
    resolver: zodResolver(advertisementSchema),
    defaultValues: { name: "", isDayType: false, slotsPerMonth: 0 },
  });

  const isDayType = form.watch("isDayType");

  useEffect(() => {
    if (isDayType) {
      form.setValue("slotsPerMonth", 35);
    }
  }, [isDayType, form]);

  const onSubmit = async (values: AdvertisementFormValues) => {
    if (!orgId) return;
    setIsPending(true);
    try {
      await createMutation({
        orgId,
        name: values.name,
        isDayType: values.isDayType,
        slotsPerMonth: values.slotsPerMonth,
      });
      toast.success("Advertisement saved");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error("Failed to save advertisement");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Advertisement</DialogTitle>
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
                    <Input placeholder="e.g. Full Page" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isDayType"
              render={({ field }) => (
                <FormItem className="flex items-center justify-center gap-3">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="mt-0!">Day Type</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slotsPerMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slots per month</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      disabled={isDayType}
                      {...field}
                      value={field.value || ""}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? 0
                            : parseInt(e.target.value, 10)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
