"use client";

import { useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const RESERVED_SEGMENTS = new Set([
  "events", "directory", "coupons", "blog", "videos", "profile",
  "admin", "portal", "auth", "api", "_next", "c",
]);

/**
 * Extract the community slug from a pathname like /orgSlug/communitySlug/...
 * Returns undefined if the second segment is a reserved route.
 */
function parseCommunitySlug(
  pathname: string,
  orgSlug: string,
): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== orgSlug || segments.length < 2) return undefined;
  return RESERVED_SEGMENTS.has(segments[1]) ? undefined : segments[1];
}

/**
 * Extract the content segment (e.g. "events", "blog/my-post") from a pathname,
 * stripping the orgSlug and optional communitySlug prefix.
 */
function parseContentPath(pathname: string, orgSlug: string): string {
  const communitySlug = parseCommunitySlug(pathname, orgSlug);
  const prefix = communitySlug
    ? `/${orgSlug}/${communitySlug}`
    : `/${orgSlug}`;
  const rest = pathname.startsWith(prefix)
    ? pathname.slice(prefix.length)
    : "";
  return rest.startsWith("/") ? rest.slice(1) : rest;
}

export function useCommunityFilter(orgSlug: string) {
  const router = useRouter();
  const pathname = usePathname();

  const communitySlug = useMemo(
    () => parseCommunitySlug(pathname, orgSlug),
    [pathname, orgSlug],
  );

  const communities = useQuery(api.public.queries.listCommunities, { orgSlug });

  const activeCommunity = useMemo(() => {
    if (!communitySlug || !communities) return undefined;
    return communities.find((c) => c.slug === communitySlug);
  }, [communitySlug, communities]);

  const communityId: Id<"communities"> | undefined = activeCommunity?._id;

  const buildHref = useCallback(
    (segment: string) => {
      const base = communitySlug
        ? `/${orgSlug}/${communitySlug}`
        : `/${orgSlug}`;
      return segment ? `${base}/${segment}` : base;
    },
    [orgSlug, communitySlug],
  );

  const setCommunity = useCallback(
    (slug: string | undefined) => {
      const contentPath = parseContentPath(pathname, orgSlug);
      if (slug) {
        const target = contentPath
          ? `/${orgSlug}/${slug}/${contentPath}`
          : `/${orgSlug}/${slug}`;
        router.push(target, { scroll: false });
      } else {
        const target = contentPath
          ? `/${orgSlug}/${contentPath}`
          : `/${orgSlug}`;
        router.push(target, { scroll: false });
      }
    },
    [pathname, orgSlug, router],
  );

  const communityMap = useMemo(() => {
    if (!communities) return new Map<string, string>();
    return new Map(communities.map((c) => [c._id, c.name]));
  }, [communities]);

  return {
    communitySlug,
    communityId,
    activeCommunity,
    communities: communities ?? [],
    communityMap,
    buildHref,
    setCommunity,
  };
}
