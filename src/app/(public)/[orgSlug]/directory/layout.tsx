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
      title: `Business Directory | ${siteName}`,
      description: `Browse local businesses and services in ${siteName}`,
      openGraph: {
        title: `Business Directory | ${siteName}`,
        description: `Browse local businesses and services in ${siteName}`,
      },
    };
  } catch {
    return { title: "Business Directory" };
  }
}

export default function DirectoryListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
