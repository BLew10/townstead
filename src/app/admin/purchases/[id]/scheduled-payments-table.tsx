"use client";

import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface EnrichedScheduledPayment {
  _id: Id<"scheduledPayments">;
  dueDate: number;
  amount: number;
  month: number;
  year: number;
  lateFeeWaived?: boolean;
  paidAmount: number;
  isLate: boolean;
}

interface ScheduledPaymentsTableProps {
  scheduledPayments: EnrichedScheduledPayment[];
}

function StatusBadge({ sp }: { sp: EnrichedScheduledPayment }) {
  if (sp.paidAmount >= sp.amount) {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
  }
  if (sp.isLate) {
    return <Badge variant="destructive">Late</Badge>;
  }
  if (sp.paidAmount > 0) {
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Partial</Badge>;
  }
  return <Badge variant="secondary">Pending</Badge>;
}

function WaiveToggle({ sp }: { sp: EnrichedScheduledPayment }) {
  const waive = useMutation(api.scheduledPayments.mutations.waiveLateFee);

  const handleToggle = async (checked: boolean) => {
    try {
      await waive({ id: sp._id, waived: checked });
      toast.success("Late fee waiver updated");
    } catch {
      toast.error("Failed to update late fee waiver");
    }
  };

  return (
    <Switch
      checked={sp.lateFeeWaived ?? false}
      onCheckedChange={handleToggle}
      aria-label="Waive late fee"
    />
  );
}

export function ScheduledPaymentsTable({
  scheduledPayments,
}: ScheduledPaymentsTableProps) {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Due Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Waive Late Fee</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scheduledPayments.map((sp) => (
            <TableRow key={sp._id}>
              <TableCell>{formatDate(sp.dueDate)}</TableCell>
              <TableCell>{formatCurrency(sp.amount)}</TableCell>
              <TableCell>{formatCurrency(sp.paidAmount)}</TableCell>
              <TableCell>{formatCurrency(Math.max(0, sp.amount - sp.paidAmount))}</TableCell>
              <TableCell>
                <StatusBadge sp={sp} />
              </TableCell>
              <TableCell>
                <WaiveToggle sp={sp} />
              </TableCell>
            </TableRow>
          ))}
          {scheduledPayments.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No scheduled payments
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
