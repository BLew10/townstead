import type { MetadataRoute } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  try {
    const tenants = await fetchQuery(api.public.queries.getSitemapData);

    for (const tenant of tenants) {
      const orgBase = `${BASE_URL}/${tenant.orgSlug}`;

      entries.push(
        { url: orgBase, changeFrequency: "daily", priority: 0.9 },
        { url: `${orgBase}/events`, changeFrequency: "daily", priority: 0.8 },
        { url: `${orgBase}/blog`, changeFrequency: "daily", priority: 0.7 },
        { url: `${orgBase}/directory`, changeFrequency: "weekly", priority: 0.7 },
        { url: `${orgBase}/coupons`, changeFrequency: "daily", priority: 0.6 },
        { url: `${orgBase}/videos`, changeFrequency: "weekly", priority: 0.5 },
      );

      for (const eventId of tenant.eventIds) {
        entries.push({
          url: `${orgBase}/events/${eventId}`,
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }

      for (const slug of tenant.blogSlugs) {
        entries.push({
          url: `${orgBase}/blog/${slug}`,
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }

      for (const slug of tenant.businessSlugs) {
        entries.push({
          url: `${orgBase}/directory/${slug}`,
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
    }
  } catch {
    // Convex may be unavailable at build time; return static entries only
  }

  return entries;
}
