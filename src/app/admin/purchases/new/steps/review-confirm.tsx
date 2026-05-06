"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ClipboardCheck } from "lucide-react";
import { computeScheduleBase, generateScheduledPayments } from "../../../../../../convex/billing/helpers";
import { dollarsToCents, centsToDollars } from "@/lib/utils";
import type { PaymentTermsFormValues } from "@/lib/validators";
import type { AdSelection } from "./select-ad-types";
import type { SlotAssignment } from "./assign-slots";
import type { Id } from "../../../../../../convex/_generated/dataModel";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface ReviewConfirmProps {
  contactLabel: string;
  calendarEditionIds: Id<"calendarEditions">[];
  editionNames: string[];
  year: number;
  adSelections: AdSelection[];
  slotAssignments: SlotAssignment[];
  paymentTerms: PaymentTermsFormValues;
}

export function ReviewConfirm({
  contactLabel,
  calendarEditionIds,
  editionNames,
  year,
  adSelections,
  slotAssignments,
  paymentTerms,
}: ReviewConfirmProps) {
  const editionNameMap = new Map(
    calendarEditionIds.map((id, i) => [id, editionNames[i] ?? "Unknown"])
  );

  const adsByEdition = calendarEditionIds.map((editionId) => ({
    editionId,
    editionName: editionNameMap.get(editionId) ?? "Unknown",
    ads: adSelections.filter((a) => a.calendarEditionId === editionId),
  })).filter((group) => group.ads.length > 0);
  const scheduleBase = computeScheduleBase({
    totalSale: paymentTerms.totalSale ?? 0,
    discount1: paymentTerms.discount1,
    discount2: paymentTerms.discount2,
    additionalSale1: paymentTerms.additionalSale1,
    additionalSale2: paymentTerms.additionalSale2,
    trade: paymentTerms.trade,
    earlyDiscountType: paymentTerms.earlyDiscountType,
    earlyDiscountAmount: paymentTerms.earlyDiscountAmount,
  });

  const scheduledPaymentsCents = generateScheduledPayments({
    baseNet: dollarsToCents(scheduleBase),
    dueDayOfMonth: paymentTerms.dueDayOfMonth ?? 1,
    splitEqually: paymentTerms.splitEqually ?? true,
    startMonth: paymentTerms.scheduleStartMonth ?? 1,
    startYear: paymentTerms.scheduleStartYear ?? year,
    endMonth: paymentTerms.scheduleEndMonth ?? 12,
    endYear: paymentTerms.scheduleEndYear ?? year,
    customSchedule: paymentTerms.customSchedule?.map((e) => ({
      ...e,
      amount: dollarsToCents(e.amount),
    })),
  });
  const scheduledPayments = scheduledPaymentsCents.map((sp) => ({
    ...sp,
    amount: centsToDollars(sp.amount),
  }));

  const paymentsByYear = scheduledPayments.reduce<
    Record<number, typeof scheduledPayments>
  >((acc, sp) => {
    (acc[sp.year] ??= []).push(sp);
    return acc;
  }, {});
  const paymentYears = Object.keys(paymentsByYear)
    .map(Number)
    .sort((a, b) => a - b);
  const paymentTotal = scheduledPayments.reduce((s, p) => s + p.amount, 0);

  const fmt = (dollars: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(dollars);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10">
          <ClipboardCheck className="h-5 w-5 text-teal-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Review & Confirm</h3>
          <p className="text-sm text-muted-foreground">
            Please review all details before creating this purchase.
          </p>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <Section title="Contact">
          <p className="text-sm">{contactLabel}</p>
        </Section>

        <Separator />

        <Section title="Calendar">
          <p className="text-sm">
            {editionNames.join(", ")} — {year}
          </p>
        </Section>

        <Separator />

        <Section title="Ad Placements">
          {adsByEdition.map((group) => (
            <div key={group.editionId} className="space-y-2">
              {adsByEdition.length > 1 && (
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.editionName}
                </p>
              )}
              {group.ads.map((ad, adIdx) => {
                const slots = slotAssignments.filter(
                  (s) =>
                    s.advertisementId === ad.advertisementId &&
                    s.calendarEditionId === ad.calendarEditionId
                );
                return (
                  <div key={`${ad.advertisementId}-${ad.calendarEditionId}-${adIdx}`} className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{ad.advertisementName}</p>
                      {adsByEdition.length === 1 && (
                        <Badge variant="outline" className="text-xs">
                          {group.editionName}
                        </Badge>
                      )}
                      <Badge variant={ad.isDayType ? "default" : "secondary"}>
                        {ad.isDayType ? "Day" : "Non-Day"}
                      </Badge>
                      <Badge variant="outline">Qty: {ad.quantity}</Badge>
                      {ad.charge != null && ad.charge > 0 && (
                        <Badge variant="outline">{fmt(ad.charge)}</Badge>
                      )}
                    </div>
                    {slots.length > 0 && (
                      <div className="flex flex-wrap gap-1 pl-2">
                        {slots.map((s, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {MONTHS[(s.month ?? 1) - 1]} #{s.slotNumber}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </Section>

        <Separator />

        <Section title="Pricing">
          <div className="space-y-1 text-sm">
            <LineItem label="Total Sale" amount={fmt(paymentTerms.totalSale)} />

            {paymentTerms.discount1 != null && paymentTerms.discount1 > 0 && (
              <LineItem
                label={paymentTerms.discount1Label || "Discount 1"}
                amount={`-${fmt(paymentTerms.discount1)}`}
                variant="deduction"
              />
            )}
            {paymentTerms.discount2 != null && paymentTerms.discount2 > 0 && (
              <LineItem
                label={paymentTerms.discount2Label || "Discount 2"}
                amount={`-${fmt(paymentTerms.discount2)}`}
                variant="deduction"
              />
            )}
            {paymentTerms.additionalSale1 != null && paymentTerms.additionalSale1 > 0 && (
              <LineItem
                label={paymentTerms.additionalSale1Label || "Additional 1"}
                amount={`+${fmt(paymentTerms.additionalSale1)}`}
                variant="addition"
              />
            )}
            {paymentTerms.additionalSale2 != null && paymentTerms.additionalSale2 > 0 && (
              <LineItem
                label={paymentTerms.additionalSale2Label || "Additional 2"}
                amount={`+${fmt(paymentTerms.additionalSale2)}`}
                variant="addition"
              />
            )}
            {paymentTerms.trade != null && paymentTerms.trade > 0 && (
              <LineItem
                label="Trade"
                amount={`-${fmt(paymentTerms.trade)}`}
                variant="deduction"
              />
            )}

            <div className="flex justify-between items-center pt-2 mt-1 border-t font-medium">
              <span>Net</span>
              <span>{fmt(scheduleBase)}</span>
            </div>
          </div>
        </Section>

        <Separator />

        <Section title="Payment Schedule">
          {scheduledPayments.length > 0 ? (
            <div className="space-y-4">
              {paymentYears.map((yr) => (
                <div key={yr} className="space-y-1">
                  {paymentYears.length > 1 && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      {yr}
                    </p>
                  )}
                  {paymentsByYear[yr].map((sp, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-8 font-medium">{MONTHS[sp.month - 1]}</span>
                        <span className="text-xs text-muted-foreground">
                          due {new Date(sp.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                      <span>{fmt(sp.amount)}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t text-sm font-medium">
                <span>
                  Total ({scheduledPayments.length} payment{scheduledPayments.length !== 1 && "s"})
                </span>
                <span>{fmt(paymentTotal)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No scheduled payments (net is $0)
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function LineItem({
  label,
  amount,
  variant,
}: {
  label: string;
  amount: string;
  variant?: "deduction" | "addition";
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          variant === "deduction"
            ? "text-red-600"
            : variant === "addition"
              ? "text-green-600"
              : ""
        }
      >
        {amount}
      </span>
    </div>
  );
}
