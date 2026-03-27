import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepForm, type Step } from "./step-form";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const steps: Step[] = [
  { id: "client", label: "Client Info" },
  { id: "items", label: "Line Items" },
  { id: "payment", label: "Payment" },
];

const baseProps = {
  steps,
  onNext: vi.fn(),
  onBack: vi.fn(),
  onSubmit: vi.fn(),
};

describe("StepForm", () => {
  it("renders step labels", () => {
    render(
      <StepForm {...baseProps} currentStep={0}>
        <div>Content</div>
      </StepForm>
    );
    expect(screen.getByText("Client Info")).toBeDefined();
    expect(screen.getByText("Line Items")).toBeDefined();
    expect(screen.getByText("Payment")).toBeDefined();
  });

  it("renders children content", () => {
    render(
      <StepForm {...baseProps} currentStep={1}>
        <div>Line Items Form</div>
      </StepForm>
    );
    expect(screen.getByText("Line Items Form")).toBeDefined();
  });

  it("shows Back and Continue buttons on a non-last step", () => {
    render(
      <StepForm {...baseProps} currentStep={0}>
        <div>Content</div>
      </StepForm>
    );
    expect(screen.getByRole("button", { name: "Back" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDefined();
  });

  it('shows "Create Purchase" button on the last step', () => {
    render(
      <StepForm {...baseProps} currentStep={2}>
        <div>Content</div>
      </StepForm>
    );
    expect(
      screen.getByRole("button", { name: "Create Purchase" })
    ).toBeDefined();
  });

  it('shows "Creating..." when submitting on the last step', () => {
    render(
      <StepForm {...baseProps} currentStep={2} isSubmitting={true}>
        <div>Content</div>
      </StepForm>
    );
    expect(screen.getByText("Creating...")).toBeDefined();
  });
});
