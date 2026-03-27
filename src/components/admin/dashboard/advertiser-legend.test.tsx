import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdvertiserLegend } from "./advertiser-legend";

const contacts = [
  { id: "c1", company: "Acme Corp" },
  { id: "c2", company: "Globex Inc" },
  { id: "c3", company: "Initech" },
];

describe("AdvertiserLegend", () => {
  it("renders without crashing", () => {
    render(<AdvertiserLegend contacts={contacts} />);
    expect(screen.getByText("Advertiser Legend")).toBeDefined();
  });

  it("renders all contact company names", () => {
    render(<AdvertiserLegend contacts={contacts} />);
    expect(screen.getByText("Acme Corp")).toBeDefined();
    expect(screen.getByText("Globex Inc")).toBeDefined();
    expect(screen.getByText("Initech")).toBeDefined();
  });

  it("returns null when contacts array is empty", () => {
    const { container } = render(<AdvertiserLegend contacts={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("applies deterministic background colors from contact IDs", () => {
    render(<AdvertiserLegend contacts={[{ id: "c1", company: "Solo" }]} />);
    const badge = screen.getByText("Solo");
    expect(badge.style.backgroundColor).toBeTruthy();
  });
});
