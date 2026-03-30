import { describe, it, expect } from "vitest";
import {
  validateFile,
  getAcceptString,
  IMAGE_PRESETS,
  MAX_FILE_SIZE_BYTES,
} from "./image-validation";

function makeFile(
  name: string,
  size: number,
  type: string
): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe("validateFile", () => {
  describe("logo preset", () => {
    it("accepts a valid JPEG", () => {
      const file = makeFile("logo.jpg", 1024, "image/jpeg");
      expect(validateFile(file, "logo")).toEqual({ valid: true });
    });

    it("accepts a valid PNG", () => {
      const file = makeFile("logo.png", 1024, "image/png");
      expect(validateFile(file, "logo")).toEqual({ valid: true });
    });

    it("accepts a valid WebP", () => {
      const file = makeFile("logo.webp", 1024, "image/webp");
      expect(validateFile(file, "logo")).toEqual({ valid: true });
    });

    it("accepts SVG", () => {
      const file = makeFile("logo.svg", 512, "image/svg+xml");
      expect(validateFile(file, "logo")).toEqual({ valid: true });
    });

    it("rejects GIF", () => {
      const file = makeFile("logo.gif", 1024, "image/gif");
      const result = validateFile(file, "logo");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file type");
      expect(result.error).toContain(IMAGE_PRESETS.logo.formatLabel);
    });

    it("rejects a file exceeding the size limit", () => {
      const file = makeFile("big.png", MAX_FILE_SIZE_BYTES + 1, "image/png");
      const result = validateFile(file, "logo");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too large");
    });

    it("accepts a file at exactly the size limit", () => {
      const file = makeFile("exact.png", MAX_FILE_SIZE_BYTES, "image/png");
      expect(validateFile(file, "logo")).toEqual({ valid: true });
    });
  });

  describe("card preset", () => {
    it("accepts JPEG, PNG, WebP", () => {
      expect(validateFile(makeFile("a.jpg", 100, "image/jpeg"), "card").valid).toBe(true);
      expect(validateFile(makeFile("a.png", 100, "image/png"), "card").valid).toBe(true);
      expect(validateFile(makeFile("a.webp", 100, "image/webp"), "card").valid).toBe(true);
    });

    it("rejects SVG (not allowed for card preset)", () => {
      const result = validateFile(makeFile("a.svg", 100, "image/svg+xml"), "card");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file type");
    });

    it("rejects PDF", () => {
      const result = validateFile(makeFile("a.pdf", 100, "application/pdf"), "card");
      expect(result.valid).toBe(false);
    });
  });

  describe("event preset", () => {
    it("accepts JPEG, PNG, WebP", () => {
      expect(validateFile(makeFile("e.jpg", 100, "image/jpeg"), "event").valid).toBe(true);
      expect(validateFile(makeFile("e.png", 100, "image/png"), "event").valid).toBe(true);
      expect(validateFile(makeFile("e.webp", 100, "image/webp"), "event").valid).toBe(true);
    });

    it("rejects SVG", () => {
      const result = validateFile(makeFile("e.svg", 100, "image/svg+xml"), "event");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file type");
    });

    it("rejects oversized files", () => {
      const result = validateFile(makeFile("big.png", MAX_FILE_SIZE_BYTES + 1, "image/png"), "event");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too large");
    });

    it("has correct aspect ratio", () => {
      expect(IMAGE_PRESETS.event.aspectRatio).toBeCloseTo(800 / 420);
    });

    it("has correct recommendation text", () => {
      expect(IMAGE_PRESETS.event.recommendation).toBe(
        "Recommended: 800 x 420 px (landscape)"
      );
    });
  });

  describe("featuredImage preset", () => {
    it("accepts standard image types", () => {
      expect(validateFile(makeFile("f.jpg", 100, "image/jpeg"), "featuredImage").valid).toBe(true);
    });

    it("rejects non-image types", () => {
      const result = validateFile(makeFile("f.txt", 100, "text/plain"), "featuredImage");
      expect(result.valid).toBe(false);
    });
  });

  describe("clientAsset preset", () => {
    it("accepts standard image types", () => {
      expect(validateFile(makeFile("a.jpg", 100, "image/jpeg"), "clientAsset").valid).toBe(true);
      expect(validateFile(makeFile("a.png", 100, "image/png"), "clientAsset").valid).toBe(true);
    });

    it("accepts GIF", () => {
      expect(validateFile(makeFile("a.gif", 100, "image/gif"), "clientAsset").valid).toBe(true);
    });

    it("accepts PDF", () => {
      expect(validateFile(makeFile("a.pdf", 100, "application/pdf"), "clientAsset").valid).toBe(true);
    });

    it("rejects SVG", () => {
      const result = validateFile(makeFile("a.svg", 100, "image/svg+xml"), "clientAsset");
      expect(result.valid).toBe(false);
    });

    it("rejects oversized PDF", () => {
      const result = validateFile(
        makeFile("big.pdf", MAX_FILE_SIZE_BYTES + 1, "application/pdf"),
        "clientAsset"
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too large");
    });
  });

  describe("size validation error message", () => {
    it("includes the actual file size in the error", () => {
      const size = MAX_FILE_SIZE_BYTES + 1024 * 1024; // 9 MB
      const result = validateFile(makeFile("big.png", size, "image/png"), "logo");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("9 MB");
    });
  });
});

describe("getAcceptString", () => {
  it("returns comma-separated MIME types for logo", () => {
    const accept = getAcceptString("logo");
    expect(accept).toBe("image/jpeg,image/png,image/webp,image/svg+xml");
  });

  it("returns comma-separated MIME types for card", () => {
    const accept = getAcceptString("card");
    expect(accept).toBe("image/jpeg,image/png,image/webp");
  });

  it("returns comma-separated MIME types for event", () => {
    const accept = getAcceptString("event");
    expect(accept).toBe("image/jpeg,image/png,image/webp");
  });

  it("returns comma-separated MIME types for featuredImage", () => {
    const accept = getAcceptString("featuredImage");
    expect(accept).toBe("image/jpeg,image/png,image/webp");
  });

  it("includes PDF for clientAsset", () => {
    const accept = getAcceptString("clientAsset");
    expect(accept).toContain("application/pdf");
    expect(accept).toContain("image/gif");
  });
});
