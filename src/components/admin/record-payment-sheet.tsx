"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { dollarsToCents } from "@/lib/utils";

const recordPaymentSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  method: z.string().min(1, "Payment method is required"),
  checkNumber: z.string().optional(),
  isPrepaid: z.boolean().optional(),
});

type RecordPaymentValues = z.infer<typeof recordPaymentSchema>;

interface RecordPaymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseId: Id<"purchases">;
  contactName?: string;
  company?: string;
  invoiceNumber?: string | null;
}

export function RecordPaymentSheet({
  open,
  onOpenChange,
  purchaseId,
  contactName,
  company,
  invoiceNumber,
}: RecordPaymentSheetProps) {
  const { orgId } = useOrg();
  const recordPayment = useMutation(api.payments.mutations.recordPayment);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<RecordPaymentValues>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      method: "",
      checkNumber: "",
      isPrepaid: false,
    },
  });

  const watchMethod = form.watch("method");

  const onSubmit = async (values: RecordPaymentValues) => {
    if (!orgId) return;
    setIsPending(true);
    try {
      await recordPayment({
        purchaseId,
        amount: dollarsToCents(values.amount),
        date: new Date(values.date).getTime(),
        method: values.method,
        checkNumber: values.checkNumber || undefined,
        isPrepaid: values.isPrepaid,
        orgId,
      });
      toast.success("Payment recorded");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error("Failed to record payment");
    } finally {
      setIsPending(false);
    }
  };

  const subtitle = [contactName, company].filter(Boolean).join(" — ");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Record Payment</SheetTitle>
          {(subtitle || invoiceNumber) && (
            <SheetDescription>
              {subtitle && <span>{subtitle}</span>}
              {subtitle && invoiceNumber && <br />}
              {invoiceNumber && <span>Invoice #{invoiceNumber}</span>}
            </SheetDescription>
          )}
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6 px-4"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0.01}
                      {...field}
                      value={field.value || ""}
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
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchMethod === "check" && (
              <FormField
                control={form.control}
                name="checkNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Check #" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="isPrepaid"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <Label>Prepaid Payment</Label>
                </FormItem>
              )}
            />

            <SheetFooter>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Recording..." : "Record Payment"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
