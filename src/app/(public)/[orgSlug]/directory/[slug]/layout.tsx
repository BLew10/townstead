import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import { truncate } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string; slug: string }>;
}): Promise<Metadata> {
  const { orgSlug, slug } = await params;

  try {
    const business = await fetchQuery(
      api.public.queries.getDirectoryBusiness,
      { orgSlug, slug },
    );

    if (!business) return { title: "Business Not Found" };

    const title = business.company || "Business";
    const description = business.description
      ? truncate(business.description, 160)
      : undefined;

    return {
      title,
      ...(description && { description }),
      openGraph: {
        title,
        ...(description && { description }),
        type: "website",
      },
    };
  } catch {
    return { title: "Business Directory" };
  }
}

export default function BusinessDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
