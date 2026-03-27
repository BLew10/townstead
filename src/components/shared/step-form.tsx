"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export interface Step {
  id: string;
  label: string;
}

interface StepFormProps {
  steps: Step[];
  currentStep: number;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  canAdvance?: boolean;
  validationMessage?: string | null;
  children: ReactNode;
}

export function StepForm({
  steps,
  currentStep,
  onNext,
  onBack,
  onSubmit,
  isSubmitting = false,
  canAdvance = true,
  validationMessage,
  children,
}: StepFormProps) {
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    setAttempted(false);
    containerRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [currentStep]);

  const showMessage = attempted && !canAdvance && !!validationMessage;

  const handleContinue = () => {
    if (!canAdvance) {
      setAttempted(true);
      return;
    }
    onNext();
  };

  const handleSubmit = () => {
    if (!canAdvance) {
      setAttempted(true);
      return;
    }
    onSubmit();
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-8">
      <StepIndicator steps={steps} currentStep={currentStep} />
      <div className="min-h-[300px]">{children}</div>
      <div className="border-t pt-4 space-y-2">
        {showMessage && (
          <p className="text-sm text-destructive text-right">
            {validationMessage}
          </p>
        )}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isFirst || isSubmitting}
          >
            Back
          </Button>
          {isLast ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Purchase"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleContinue}
            >
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: Step[];
  currentStep: number;
}) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <li
              key={step.id}
              className={cn(
                "relative flex items-center",
                idx < steps.length - 1 && "flex-1"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    isCompleted &&
                      "bg-primary text-primary-foreground",
                    isCurrent &&
                      "border-2 border-primary bg-background text-primary",
                    !isCompleted &&
                      !isCurrent &&
                      "border-2 border-muted-foreground/30 bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    idx + 1
                  )}
                </span>
                <span
                  className={cn(
                    "hidden text-sm font-medium sm:inline",
                    isCurrent
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 hidden h-0.5 flex-1 sm:block",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
