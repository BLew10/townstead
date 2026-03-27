import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { OrgSlugShell } from "./org-slug-shell";

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
    const tagline = branding?.tagline;
    return {
      title: {
        default: siteName,
        template: `%s | ${siteName}`,
      },
      ...(tagline && { description: tagline }),
      openGraph: {
        siteName,
        ...(tagline && { description: tagline }),
      },
    };
  } catch {
    return { title: "Community" };
  }
}

export default async function OrgSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return <OrgSlugShell orgSlug={orgSlug}>{children}</OrgSlugShell>;
}
