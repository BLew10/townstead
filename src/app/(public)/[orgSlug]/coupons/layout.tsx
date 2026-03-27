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
      title: `Coupons & Deals | ${siteName}`,
      description: `Browse current deals and coupons from local businesses in ${siteName}`,
      openGraph: {
        title: `Coupons & Deals | ${siteName}`,
        description: `Browse current deals and coupons from local businesses in ${siteName}`,
      },
    };
  } catch {
    return { title: "Coupons & Deals" };
  }
}

export default function CouponsListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
