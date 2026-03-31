export const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const IMAGE_WITH_SVG_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  "image/svg+xml",
] as const;

const ASSET_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  "image/gif",
  "application/pdf",
] as const;

export interface ImagePreset {
  allowedTypes: readonly string[];
  formatLabel: string;
  recommendation: string | null;
  maxSizeBytes: number;
  aspectRatio?: number;
}

export const IMAGE_PRESETS = {
  logo: {
    allowedTypes: IMAGE_WITH_SVG_MIME_TYPES,
    formatLabel: "JPG, PNG, WebP, or SVG",
    recommendation: "Recommended: 400 x 400 px (square)",
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
  },
  card: {
    allowedTypes: IMAGE_MIME_TYPES,
    formatLabel: "JPG, PNG, or WebP",
    recommendation: "Recommended: 1200 x 630 px (landscape)",
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
  },
  coupon: {
    allowedTypes: IMAGE_MIME_TYPES,
    formatLabel: "JPG, PNG, or WebP",
    recommendation: "Recommended: 600 x 400 px",
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
  },
  featuredImage: {
    allowedTypes: IMAGE_MIME_TYPES,
    formatLabel: "JPG, PNG, or WebP",
    recommendation: "Recommended: 1200 x 630 px (landscape)",
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
  },
  hero: {
    allowedTypes: IMAGE_MIME_TYPES,
    formatLabel: "JPG, PNG, or WebP",
    recommendation: "Recommended: 1920 x 800 px (wide landscape)",
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
  },
  event: {
    allowedTypes: IMAGE_MIME_TYPES,
    formatLabel: "JPG, PNG, or WebP",
    recommendation: "Recommended: 800 x 420 px (landscape)",
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
    aspectRatio: 800 / 420,
  },
  clientAsset: {
    allowedTypes: ASSET_MIME_TYPES,
    formatLabel: "JPG, PNG, WebP, GIF, or PDF",
    recommendation: null,
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
  },
} as const satisfies Record<string, ImagePreset>;

export type ImagePresetKey = keyof typeof IMAGE_PRESETS;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(
  file: File,
  presetKey: ImagePresetKey
): ValidationResult {
  const preset = IMAGE_PRESETS[presetKey];

  if (!(preset.allowedTypes as readonly string[]).includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Accepted formats: ${preset.formatLabel}.`,
    };
  }

  if (file.size > preset.maxSizeBytes) {
    return {
      valid: false,
      error: `File is too large (${formatFileSize(file.size)}). Maximum size: ${formatFileSize(preset.maxSizeBytes)}.`,
    };
  }

  return { valid: true };
}

export function getAcceptString(presetKey: ImagePresetKey): string {
  return IMAGE_PRESETS[presetKey].allowedTypes.join(",");
}
