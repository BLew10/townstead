import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { OrgSlugShell } from "./org-slug-shell";

export const revalidate = 60;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { orgSlug } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const communitySlug = typeof sp?._community === "string" ? sp._community : undefined;

  try {
    const branding = await fetchQuery(api.tenantBranding.queries.getBySlug, {
      orgSlug,
    });
    const siteName = branding?.siteName ?? "Community";
    const tagline = branding?.tagline;

    let communityName: string | undefined;
    if (communitySlug) {
      const community = await fetchQuery(
        api.public.queries.getCommunityBySlug,
        { orgSlug, communitySlug },
      );
      communityName = community?.name;
    }

    const displayName = communityName
      ? `${communityName} | ${siteName}`
      : siteName;

    return {
      title: {
        default: displayName,
        template: `%s | ${displayName}`,
      },
      ...(tagline && { description: tagline }),
      openGraph: {
        siteName: displayName,
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
