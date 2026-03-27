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
      title: `Videos | ${siteName}`,
      description: `Watch videos from ${siteName}`,
      openGraph: {
        title: `Videos | ${siteName}`,
        description: `Watch videos from ${siteName}`,
      },
    };
  } catch {
    return { title: "Videos" };
  }
}

export default function VideosListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
