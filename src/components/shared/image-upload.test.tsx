import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImageUpload } from "./image-upload";

function makeFile(
  name: string,
  size: number,
  type: string
): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe("ImageUpload", () => {
  it("renders without crashing", () => {
    render(<ImageUpload preset="logo" onUpload={vi.fn()} />);
    expect(screen.getByText("Click or drag to upload")).toBeDefined();
  });

  it("displays the format label for the preset", () => {
    render(<ImageUpload preset="logo" onUpload={vi.fn()} />);
    expect(screen.getByText(/JPG, PNG, WebP, or SVG/)).toBeDefined();
  });

  it("displays the recommendation text when preset has one", () => {
    render(<ImageUpload preset="card" onUpload={vi.fn()} />);
    expect(
      screen.getByText("Recommended: 1200 x 630 px (landscape)")
    ).toBeDefined();
  });

  it("displays the recommendation text for event preset", () => {
    render(<ImageUpload preset="event" onUpload={vi.fn()} />);
    expect(
      screen.getByText("Recommended: 800 x 420 px (landscape)")
    ).toBeDefined();
  });

  it("does not display recommendation text for clientAsset preset", () => {
    render(<ImageUpload preset="clientAsset" onUpload={vi.fn()} />);
    expect(screen.queryByText(/Recommended:/)).toBeNull();
  });

  it("displays max size information", () => {
    render(<ImageUpload preset="logo" onUpload={vi.fn()} />);
    expect(screen.getByText(/max 8 MB/)).toBeDefined();
  });

  it("calls onUpload with a valid file", async () => {
    const onUpload = vi.fn();
    render(<ImageUpload preset="logo" onUpload={onUpload} />);

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = makeFile("logo.png", 1024, "image/png");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(file);
    });
  });

  it("shows an error for invalid file type", async () => {
    const onUpload = vi.fn();
    render(<ImageUpload preset="card" onUpload={onUpload} />);

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = makeFile("doc.pdf", 1024, "application/pdf");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText(/Invalid file type/)).toBeDefined();
    });
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("shows an error for oversized file", async () => {
    const onUpload = vi.fn();
    render(<ImageUpload preset="logo" onUpload={onUpload} />);

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = makeFile("big.png", 9 * 1024 * 1024, "image/png");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText(/too large/)).toBeDefined();
    });
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("shows existing image when currentImageUrl is provided", () => {
    render(
      <ImageUpload
        preset="logo"
        onUpload={vi.fn()}
        currentImageUrl="https://example.com/logo.png"
      />
    );
    const img = screen.getByAltText("Upload preview") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/logo.png");
  });

  it("shows remove button when currentImageUrl and onRemove provided", () => {
    const onRemove = vi.fn();
    render(
      <ImageUpload
        preset="logo"
        onUpload={vi.fn()}
        onRemove={onRemove}
        currentImageUrl="https://example.com/logo.png"
      />
    );
    const removeBtn = screen.getByRole("button");
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("shows uploading state when uploading prop is true", () => {
    render(<ImageUpload preset="logo" onUpload={vi.fn()} uploading />);
    const matches = screen.getAllByText("Uploading...");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("sets correct accept attribute on the file input", () => {
    render(<ImageUpload preset="clientAsset" onUpload={vi.fn()} />);
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(input.accept).toContain("application/pdf");
    expect(input.accept).toContain("image/gif");
  });
});
