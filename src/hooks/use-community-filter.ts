"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useCommunityFilter(orgSlug: string) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const communitySlug = searchParams.get("community") ?? undefined;

  const communities = useQuery(api.public.queries.listCommunities, { orgSlug });

  const activeCommunity = useMemo(() => {
    if (!communitySlug || !communities) return undefined;
    return communities.find((c) => c.slug === communitySlug);
  }, [communitySlug, communities]);

  const communityId: Id<"communities"> | undefined = activeCommunity?._id;

  const setCommunity = useCallback(
    (slug: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (slug) {
        params.set("community", slug);
      } else {
        params.delete("community");
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const communityMap = useMemo(() => {
    if (!communities) return new Map<string, string>();
    return new Map(communities.map((c) => [c._id, c.name]));
  }, [communities]);

  return {
    communitySlug,
    communityId,
    communities: communities ?? [],
    communityMap,
    setCommunity,
  };
}
