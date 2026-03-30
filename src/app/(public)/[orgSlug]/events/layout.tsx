import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";

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
  const communitySlug =
    typeof sp?._community === "string" ? sp._community : undefined;

  try {
    const branding = await fetchQuery(api.tenantBranding.queries.getBySlug, {
      orgSlug,
    });
    const siteName = branding?.siteName ?? "Community";

    let communityName: string | undefined;
    if (communitySlug) {
      const community = await fetchQuery(
        api.public.queries.getCommunityBySlug,
        { orgSlug, communitySlug },
      );
      communityName = community?.name;
    }

    const pageTitle = `Events | ${communityName ? communityName + " | " : ""}${siteName}`;
    return {
      title: pageTitle,
      description: `Upcoming events and activities from ${siteName}`,
      openGraph: {
        title: pageTitle,
        description: `Upcoming events and activities from ${siteName}`,
      },
    };
  } catch {
    return { title: "Events" };
  }
}

export default function EventsListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
