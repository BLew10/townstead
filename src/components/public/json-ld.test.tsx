import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { JsonLd } from "./json-ld";

describe("JsonLd", () => {
  it("renders a script tag with type application/ld+json", () => {
    const { container } = render(
      <JsonLd data={{ "@type": "Event", name: "Test Event" }} />,
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
  });

  it("includes @context schema.org in the output", () => {
    const { container } = render(
      <JsonLd data={{ "@type": "Event", name: "Test Event" }} />,
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    const parsed = JSON.parse(script!.innerHTML);
    expect(parsed["@context"]).toBe("https://schema.org");
  });

  it("merges provided data with the schema context", () => {
    const { container } = render(
      <JsonLd data={{ "@type": "LocalBusiness", name: "Acme" }} />,
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    const parsed = JSON.parse(script!.innerHTML);
    expect(parsed["@type"]).toBe("LocalBusiness");
    expect(parsed.name).toBe("Acme");
  });
});
