"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useOrg } from "@/hooks/use-org";
import { useStableNow } from "@/hooks/use-stable-now";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatCurrency } from "@/lib/utils";

interface PaymentScheduleModalProps {
  purchaseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export function PaymentScheduleModal({
  purchaseId,
  open,
  onOpenChange,
  title,
}: PaymentScheduleModalProps) {
  const { orgId } = useOrg();
  const now = useStableNow();

  const data = useQuery(
    api.billing.queries.getInvoiceData,
    open && orgId
      ? {
          purchaseId: purchaseId as Id<"purchases">,
          orgId,
          now,
        }
      : "skip"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}

        {data === undefined ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : data === null ? (
          <p className="py-8 text-center text-muted-foreground">
            Purchase not found.
          </p>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Payment Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                {data.scheduledPayments.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Amount Owed</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.scheduledPayments.map((sp) => {
                          const balance = Math.max(0, sp.amount - sp.paidAmount);
                          let status: "paid" | "late" | "partial" | "pending";
                          if (sp.paidAmount >= sp.amount) status = "paid";
                          else if (sp.isLate) status = "late";
                          else if (sp.paidAmount > 0) status = "partial";
                          else status = "pending";

                          return (
                            <TableRow key={sp._id}>
                              <TableCell>{formatDate(sp.dueDate)}</TableCell>
                              <TableCell>{formatCurrency(sp.amount)}</TableCell>
                              <TableCell>{formatCurrency(sp.paidAmount)}</TableCell>
                              <TableCell>{formatCurrency(balance)}</TableCell>
                              <TableCell>
                                {status === "paid" && (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                    Paid
                                  </Badge>
                                )}
                                {status === "late" && (
                                  <Badge variant="destructive">Late</Badge>
                                )}
                                {status === "partial" && (
                                  <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                    Partial
                                  </Badge>
                                )}
                                {status === "pending" && (
                                  <Badge variant="secondary">Pending</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="py-3 text-center text-muted-foreground">
                    No payment schedule found
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {data.payments.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Check #</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.payments.map((p) => (
                          <TableRow key={p._id}>
                            <TableCell>{formatDate(p.date)}</TableCell>
                            <TableCell className="capitalize">
                              {p.method?.replace("_", " ") ?? "Deposit"}
                              {p.isPrepaid && " — Prepayment"}
                            </TableCell>
                            <TableCell>
                              {p.checkNumber ?? "—"}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(p.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="py-3 text-center text-muted-foreground">
                    No payments have been made
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
