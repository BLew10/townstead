import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;

  try {
    const branding = await fetchQuery(api.tenantBranding.queries.getBySlug, {
      orgSlug,
    });
    const siteName = branding?.siteName ?? "Community";
    return {
      title: `Blog | ${siteName}`,
      description: `Latest news and articles from ${siteName}`,
      openGraph: {
        title: `Blog | ${siteName}`,
        description: `Latest news and articles from ${siteName}`,
      },
    };
  } catch {
    return { title: "Blog" };
  }
}

export default function BlogListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
