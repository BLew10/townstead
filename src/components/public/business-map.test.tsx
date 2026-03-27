import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: any) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: any) => <div>{children}</div>,
  Popup: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("leaflet", () => ({
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: vi.fn(),
    },
  },
}));

vi.mock("leaflet/dist/leaflet.css", () => ({}));

import { BusinessMap } from "./business-map";

describe("BusinessMap", () => {
  it("returns null when no lat, lng, or address provided", () => {
    const { container } = render(<BusinessMap />);
    expect(container.innerHTML).toBe("");
  });

  it("renders address fallback when address is given but no coordinates", () => {
    render(<BusinessMap address="123 Main St" />);
    expect(screen.getByText("123 Main St")).toBeDefined();
    expect(
      screen.getByText("Map unavailable — no coordinates on file"),
    ).toBeDefined();
  });

  it("renders the map container when lat and lng are provided", () => {
    render(<BusinessMap lat={40.7128} lng={-74.006} name="Test Biz" />);
    expect(screen.getByText("Loading map...")).toBeDefined();
  });
});
