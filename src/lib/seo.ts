import type { Metadata } from "next";

export function createJsonLd(type: string, data: Record<string, unknown>) {
  return {
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": type,
      ...data,
    }),
  };
}

export function buildOpenGraph({
  title,
  description,
  type = "website",
  url,
  imageUrl,
}: {
  title: string;
  description?: string;
  type?: "website" | "article";
  url?: string;
  imageUrl?: string;
}): Metadata["openGraph"] {
  return {
    title,
    ...(description && { description }),
    type,
    ...(url && { url }),
    ...(imageUrl && { images: [{ url: imageUrl }] }),
  };
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1).trimEnd() + "\u2026";
}
