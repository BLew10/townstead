"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type BillingBulkEmailRow = {
  purchaseId: string;
  contactId: string | null | undefined;
  contactEmail: string | null | undefined;
  displayName: string;
  invoiceNumber?: string | null;
};

type BulkKind = "invoice" | "statement";

function uniqueInvoiceJobs(rows: BillingBulkEmailRow[]) {
  const byPurchase = new Map<string, BillingBulkEmailRow>();
  for (const row of rows) {
    if (!row.purchaseId) continue;
    if (!byPurchase.has(row.purchaseId)) byPurchase.set(row.purchaseId, row);
  }
  return [...byPurchase.values()];
}

function uniqueStatementJobs(rows: BillingBulkEmailRow[]) {
  const byPurchase = new Map<string, BillingBulkEmailRow>();
  for (const row of rows) {
    if (!row.purchaseId) continue;
    if (!byPurchase.has(row.purchaseId)) byPurchase.set(row.purchaseId, row);
  }
  return [...byPurchase.values()];
}

export function BillingBulkEmailMenu({
  selectedRows,
  onComplete,
}: {
  selectedRows: BillingBulkEmailRow[];
  onComplete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<BulkKind | null>(null);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const jobs =
    kind === "invoice"
      ? uniqueInvoiceJobs(selectedRows)
      : kind === "statement"
        ? uniqueStatementJobs(selectedRows)
        : [];

  const withEmail = jobs.filter((j) => j.contactEmail?.trim());
  const withoutEmail = jobs.filter((j) => !j.contactEmail?.trim());

  const closeDialog = () => {
    if (sending) return;
    setOpen(false);
    setKind(null);
  };

  const startSend = async () => {
    if (!kind || withEmail.length === 0) {
      toast.error("No recipients with an email address.");
      return;
    }

    setSending(true);
    setProgress({ current: 0, total: withEmail.length });
    let ok = 0;
    let fail = 0;

    for (let i = 0; i < withEmail.length; i++) {
      const row = withEmail[i]!;
      setProgress({ current: i + 1, total: withEmail.length });
      try {
        const url =
          kind === "invoice" ? "/api/email/invoice" : "/api/email/statement";
        const body =
          kind === "invoice"
            ? { purchaseId: row.purchaseId }
            : { purchaseId: row.purchaseId };
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) fail += 1;
        else ok += 1;
      } catch {
        fail += 1;
      }
    }

    setSending(false);
    setOpen(false);
    setKind(null);
    onComplete();

    if (fail === 0) {
      const label =
        ok === 1
          ? `Sent 1 ${kind === "invoice" ? "invoice" : "statement"}.`
          : `Sent ${ok} ${kind === "invoice" ? "invoices" : "statements"}.`;
      toast.success(
        withoutEmail.length > 0
          ? `${label} ${withoutEmail.length} skipped (no email).`
          : label
      );
    } else {
      toast.message(
        `Finished: ${ok} succeeded, ${fail} failed${
          withoutEmail.length
            ? `. ${withoutEmail.length} skipped (no email).`
            : ""
        }`
      );
    }
  };

  const hasSelection = selectedRows.length > 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" disabled={!hasSelection}>
            {hasSelection
              ? `Bulk Actions (${selectedRows.length})`
              : "Select rows to send"}
            <ChevronDown className="ml-1.5 h-4 w-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() => {
              setKind("invoice");
              setOpen(true);
            }}
          >
            Send Invoices
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setKind("statement");
              setOpen(true);
            }}
          >
            Send Statements
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={open} onOpenChange={(v) => !v && closeDialog()}>
        <AlertDialogContent
          className={cn(
            "sm:max-w-md",
            kind && jobs.length > 6 && "sm:max-w-lg"
          )}
          size="default"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {kind === "invoice"
                ? "Send invoices"
                : kind === "statement"
                  ? "Send statements"
                  : "Confirm"}
            </AlertDialogTitle>
            <div className="space-y-3 text-left text-sm text-muted-foreground">
              {sending ? (
                <div className="flex items-center gap-3 py-2">
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
                  <span className="text-foreground">
                    Sending {progress.current} of {progress.total}…
                  </span>
                </div>
              ) : (
                <>
                  <AlertDialogDescription>
                    {kind === "invoice"
                      ? "The following addresses will receive an invoice PDF for the linked purchase."
                      : "The following addresses will receive a statement PDF (all open purchases for that contact)."}
                  </AlertDialogDescription>
                  {withoutEmail.length > 0 && (
                    <p className="text-destructive">
                      {withoutEmail.length} selected{" "}
                      {withoutEmail.length === 1 ? "row has" : "rows have"} no
                      email and will be skipped.
                    </p>
                  )}
                  <ul className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-3 text-foreground">
                    {jobs.map((j) => {
                      const previewUrl =
                        kind === "invoice"
                          ? `/api/pdf/invoice/${j.purchaseId}`
                          : `/api/pdf/purchase-statement/${j.purchaseId}`;

                      return (
                        <li
                          key={
                            kind === "invoice"
                              ? j.purchaseId
                              : (j.contactId ?? j.purchaseId)
                          }
                          className="flex items-start justify-between gap-2 border-b border-border/60 py-1.5 last:border-0"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-medium">{j.displayName}</span>
                            {j.invoiceNumber ? (
                              <span className="text-muted-foreground">
                                {" "}
                                · Invoice {j.invoiceNumber}
                              </span>
                            ) : null}
                            <br />
                            <span
                              className={
                                j.contactEmail?.trim()
                                  ? "text-muted-foreground"
                                  : "text-destructive"
                              }
                            >
                              {j.contactEmail?.trim() || "No email on file"}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 shrink-0 gap-1 px-2 text-xs"
                            onClick={() => window.open(previewUrl, "_blank")}
                          >
                            <Eye className="h-3 w-3" />
                            Preview
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className={sending ? "hidden" : undefined}>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={withEmail.length === 0}
              onClick={(e) => {
                e.preventDefault();
                void startSend();
              }}
            >
              Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
