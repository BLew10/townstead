"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";
import { useOrg } from "@/hooks/use-org";
import { PageHeader } from "@/components/shared/page-header";
import { StepForm, type Step } from "@/components/shared/step-form";
import { SelectContact } from "./steps/select-contact";
import { SelectEditionYear } from "./steps/select-edition-year";
import { SelectAdTypes, type AdSelection } from "./steps/select-ad-types";
import type { SlotAssignment } from "./steps/assign-slots";
import {
  PaymentTermsStep,
  type PaymentTermsStepRef,
} from "./steps/payment-terms-step";
import { ReviewConfirm } from "./steps/review-confirm";
import type { PaymentTermsFormValues } from "@/lib/validators";
import { dollarsToCents } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { User } from "lucide-react";

function paymentTermsToCents(terms: PaymentTermsFormValues) {
  return {
    ...terms,
    totalSale: dollarsToCents(terms.totalSale),
    discount1: terms.discount1 != null ? dollarsToCents(terms.discount1) : undefined,
    discount2: terms.discount2 != null ? dollarsToCents(terms.discount2) : undefined,
    additionalSale1: terms.additionalSale1 != null ? dollarsToCents(terms.additionalSale1) : undefined,
    additionalSale2: terms.additionalSale2 != null ? dollarsToCents(terms.additionalSale2) : undefined,
    trade: terms.trade != null ? dollarsToCents(terms.trade) : undefined,
    earlyDiscountAmount:
      terms.earlyDiscountType === "flat" && terms.earlyDiscountAmount != null
        ? dollarsToCents(terms.earlyDiscountAmount)
        : terms.earlyDiscountAmount,
    lateFeeAmount:
      terms.lateFeeType === "flat" && terms.lateFeeAmount != null
        ? dollarsToCents(terms.lateFeeAmount)
        : terms.lateFeeAmount,
    customSchedule: terms.customSchedule?.map((e) => ({
      ...e,
      amount: dollarsToCents(e.amount),
    })),
  };
}

const STEPS: Step[] = [
  { id: "contact", label: "Contact" },
  { id: "edition", label: "Edition & Year" },
  { id: "purchaseDetails", label: "Purchase Details" },
  { id: "terms", label: "Payment Terms" },
  { id: "review", label: "Review" },
];

interface PurchaseFormState {
  contactId: Id<"contacts"> | null;
  contactLabel: string;
  calendarEditionIds: Id<"calendarEditions">[];
  editionNames: string[];
  year: number;
  adSelections: AdSelection[];
  slotAssignments: SlotAssignment[];
  paymentTerms: PaymentTermsFormValues;
}

const currentYear = new Date().getFullYear();

const defaultPaymentTerms: PaymentTermsFormValues = {
  totalSale: 0,
  discount1: undefined,
  discount1Label: undefined,
  discount2: undefined,
  discount2Label: undefined,
  additionalSale1: undefined,
  additionalSale1Label: undefined,
  additionalSale2: undefined,
  additionalSale2Label: undefined,
  trade: undefined,
  earlyDiscountType: undefined,
  earlyDiscountAmount: undefined,
  lateFeeType: undefined,
  lateFeeAmount: undefined,
  dueDayOfMonth: 1,
  splitEqually: true,
  scheduleStartMonth: 1,
  scheduleStartYear: currentYear,
  scheduleEndMonth: 12,
  scheduleEndYear: currentYear,
  customSchedule: undefined,
  deliveryMethod: undefined,
  invoiceMessage: undefined,
  statementMessage: undefined,
};

export default function NewPurchasePage() {
  const { orgId } = useOrg();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillContactId = searchParams.get("contactId");
  const createPurchase = useMutation(api.purchases.mutations.create);
  const paymentTermsRef = useRef<PaymentTermsStepRef>(null);

  const prefillContact = useQuery(
    api.contacts.queries.getById,
    prefillContactId ? { id: prefillContactId } : "skip"
  );

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const [formState, setFormState] = useState<PurchaseFormState>({
    contactId: null,
    contactLabel: "",
    calendarEditionIds: [],
    editionNames: [],
    year: new Date().getFullYear(),
    adSelections: [],
    slotAssignments: [],
    paymentTerms: defaultPaymentTerms,
  });

  useEffect(() => {
    if (prefillContact && !prefilled) {
      const label = `${prefillContact.company ? prefillContact.company + " — " : ""}${prefillContact.firstName} ${prefillContact.lastName}`;
      setFormState((prev) => ({
        ...prev,
        contactId: prefillContact._id,
        contactLabel: label,
      }));
      setCurrentStep(1);
      setPrefilled(true);
    }
  }, [prefillContact, prefilled]);

  const suggestedTotal = useMemo(
    () => formState.adSelections.reduce((sum, sel) => sum + (sel.charge ?? 0), 0),
    [formState.adSelections]
  );

  const validationMessage = useMemo((): string | null => {
    switch (currentStep) {
      case 0:
        if (formState.contactId === null) return "Select a contact to continue.";
        return null;
      case 1:
        if (formState.calendarEditionIds.length === 0)
          return "Select at least one calendar edition.";
        if (formState.year < 2000) return "Enter a valid year.";
        return null;
      case 2: {
        if (formState.adSelections.length === 0)
          return "Add at least one ad type.";
        const unassigned = formState.adSelections.find((ad) => {
          if (ad.slotsPerMonth === 0) return false;
          const matchingSlots = formState.slotAssignments.filter(
            (s) =>
              s.advertisementId === ad.advertisementId &&
              s.calendarEditionId === ad.calendarEditionId
          );
          return matchingSlots.length < ad.quantity;
        });
        if (unassigned) return "Assign all required slots before continuing.";
        return null;
      }
      case 3: {
        if (formState.paymentTerms.totalSale <= 0)
          return "Total sale must be greater than zero.";
        if (formState.paymentTerms.splitEqually === false) {
          const t = formState.paymentTerms;
          let scheduleBase =
            t.totalSale -
            (t.discount1 ?? 0) -
            (t.discount2 ?? 0) +
            (t.additionalSale1 ?? 0) +
            (t.additionalSale2 ?? 0) -
            (t.trade ?? 0);
          if (t.earlyDiscountType && t.earlyDiscountAmount) {
            const ed =
              t.earlyDiscountType === "flat"
                ? t.earlyDiscountAmount
                : t.totalSale * (t.earlyDiscountAmount / 100);
            scheduleBase -= ed;
          }
          const customTotal = (t.customSchedule ?? []).reduce(
            (s, e) => s + (e.amount ?? 0),
            0
          );
          if (scheduleBase > 0 && Math.abs(customTotal - scheduleBase) > 0.01)
            return "Custom schedule amounts must equal the net total.";
        }
        return null;
      }
      case 4:
        return null;
      default:
        return "Unknown step.";
    }
  }, [currentStep, formState]);

  const handleNext = useCallback(async () => {
    if (currentStep === 2) {
      setFormState((prev) => ({
        ...prev,
        paymentTerms: {
          ...prev.paymentTerms,
          ...(suggestedTotal > 0 ? { totalSale: suggestedTotal } : {}),
          scheduleStartYear: prev.paymentTerms.scheduleStartYear ?? prev.year,
          scheduleEndYear: prev.paymentTerms.scheduleEndYear ?? prev.year,
        },
      }));
    }
    if (currentStep === 3 && paymentTermsRef.current) {
      const validated = await paymentTermsRef.current.validate();
      if (!validated) return;
      setFormState((prev) => ({ ...prev, paymentTerms: validated }));
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }, [currentStep, suggestedTotal]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (
      !orgId ||
      !formState.contactId ||
      formState.calendarEditionIds.length === 0
    )
      return;

    setIsSubmitting(true);
    try {
      const adSelections = formState.adSelections.map((sel) => ({
        advertisementId: sel.advertisementId,
        calendarEditionId: sel.calendarEditionId,
        quantity: sel.quantity,
        charge: sel.charge != null ? dollarsToCents(sel.charge) : undefined,
        slots: formState.slotAssignments
          .filter(
            (s) =>
              s.advertisementId === sel.advertisementId &&
              s.calendarEditionId === sel.calendarEditionId
          )
          .map((s) => ({
            month: s.month,
            slotNumber: s.slotNumber,
            date: s.date,
          })),
      }));

      const centTerms = paymentTermsToCents(formState.paymentTerms);
      const { splitEqually, dueDayOfMonth, ...restTerms } = centTerms;
      const termsPayload = {
        ...restTerms,
        splitEqually: splitEqually ?? true,
        dueDayOfMonth: dueDayOfMonth ?? 1,
      };

      const purchaseId = await createPurchase({
        orgId,
        contactId: formState.contactId,
        calendarEditionIds: formState.calendarEditionIds,
        year: formState.year,
        adSelections,
        paymentTerms: termsPayload,
      });

      toast.success("Purchase created");
      router.push(`/admin/purchases/${purchaseId}`);
    } catch {
      toast.error("Failed to create purchase");
    } finally {
      setIsSubmitting(false);
    }
  }, [orgId, formState, createPurchase, router]);

  const handlePaymentTermsChange = useCallback(
    (values: PaymentTermsFormValues) => {
      setFormState((prev) => ({ ...prev, paymentTerms: values }));
    },
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Purchase"
        description="Create a new ad purchase for a contact"
      />

      {(formState.contactId || formState.year) && (
        <div className="flex items-center gap-4 rounded-lg border bg-muted/50 px-4 py-2.5 text-sm">
          {formState.contactId && formState.contactLabel && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Contact:</span>
              <span className="font-medium">{formState.contactLabel}</span>
            </div>
          )}
          {formState.contactId && formState.year && (
            <span className="text-muted-foreground/40">|</span>
          )}
          {formState.year && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Year:</span>
              <span className="font-medium">{formState.year}</span>
            </div>
          )}
        </div>
      )}

      <StepForm
        steps={STEPS}
        currentStep={currentStep}
        onNext={handleNext}
        onBack={handleBack}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        canAdvance={validationMessage === null}
        validationMessage={validationMessage}
      >
        {currentStep === 0 && (
          <SelectContact
            value={formState.contactId}
            onChange={(contactId, contactLabel) =>
              setFormState((prev) => ({ ...prev, contactId, contactLabel }))
            }
          />
        )}

        {currentStep === 1 && (
          <SelectEditionYear
            editionIds={formState.calendarEditionIds}
            year={formState.year}
            onEditionsChange={(ids, names) =>
              setFormState((prev) => ({
                ...prev,
                calendarEditionIds: ids,
                editionNames: names,
              }))
            }
            onYearChange={(year) =>
              setFormState((prev) => ({ ...prev, year }))
            }
          />
        )}

        {currentStep === 2 && (
          <SelectAdTypes
            calendarEditionIds={formState.calendarEditionIds}
            editionNames={formState.editionNames}
            year={formState.year}
            selections={formState.adSelections}
            slotAssignments={formState.slotAssignments}
            onChange={(adSelections) =>
              setFormState((prev) => ({ ...prev, adSelections }))
            }
            onSlotsChange={(slotAssignments) =>
              setFormState((prev) => ({ ...prev, slotAssignments }))
            }
          />
        )}

        {currentStep === 3 && (
          <PaymentTermsStep
            ref={paymentTermsRef}
            values={formState.paymentTerms}
            onChange={handlePaymentTermsChange}
            suggestedTotal={suggestedTotal}
          />
        )}

        {currentStep === 4 && (
          <ReviewConfirm
            contactLabel={formState.contactLabel}
            calendarEditionIds={formState.calendarEditionIds}
            editionNames={formState.editionNames}
            year={formState.year}
            adSelections={formState.adSelections}
            slotAssignments={formState.slotAssignments}
            paymentTerms={formState.paymentTerms}
          />
        )}
      </StepForm>
    </div>
  );
}
