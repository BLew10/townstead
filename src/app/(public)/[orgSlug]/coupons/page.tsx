"use client";

import { use, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import { format } from "date-fns";
import { Ticket, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommunityFilter } from "@/hooks/use-community-filter";
import { CommunityBadges } from "@/components/public/community-badge";
import { useStableNow } from "@/hooks/use-stable-now";

export default function CouponsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const { communityId, communityMap, buildHref } = useCommunityFilter(orgSlug);
  const now = useStableNow();

  const coupons = useQuery(api.public.queries.listCoupons, {
    orgSlug,
    communityId,
    now,
  });

  const businesses = useQuery(api.public.queries.listDirectoryBusinesses, {
    orgSlug,
  });

  const businessMap = useMemo(() => {
    if (!businesses) return new Map<string, string>();
    return new Map(
      businesses.map((b) => [b._id, b.company ?? "Unknown Business"])
    );
  }, [businesses]);

  if (!coupons || !businesses) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 font-body text-on-surface sm:px-6 lg:px-8">
        <div className="mb-12">
          <Skeleton className="h-10 w-48 rounded-lg bg-surface-container-high" />
          <Skeleton className="mt-3 h-5 w-72 rounded-lg bg-surface-container-high" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg bg-surface-container-lowest p-6 editorial-shadow"
            >
              <Skeleton className="h-6 w-3/4 rounded-lg bg-surface-container-high" />
              <Skeleton className="mt-3 h-4 w-1/2 rounded-lg bg-surface-container-high" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full rounded-lg bg-surface-container-high" />
                <Skeleton className="h-4 w-2/3 rounded-lg bg-surface-container-high" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-24 font-body text-on-surface sm:px-6 lg:px-8">
      <div className="mb-12">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
          Offers
        </p>
        <h1 className="font-headline text-4xl italic tracking-tight text-on-surface md:text-5xl">
          Coupons & Deals
        </h1>
        <p className="mt-3 text-on-surface/70">
          Exclusive offers from local businesses
        </p>
      </div>

      {coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg bg-surface-container-low py-24 text-center">
          <Ticket className="mb-4 size-10 text-on-surface/40" />
          <h3 className="font-headline text-xl italic text-on-surface">
            No active coupons
          </h3>
          <p className="mt-2 text-sm text-on-surface/70">
            Check back soon for new deals and offers
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((coupon) => {
            const businessName = businessMap.get(coupon.businessContactId);
            const startFormatted = format(
              new Date(coupon.startDate),
              "MMM d"
            );
            const endFormatted = format(
              new Date(coupon.endDate),
              "MMM d, yyyy"
            );

            return (
              <Link
                key={coupon._id}
                href={buildHref(`coupons/${coupon._id}`)}
                className="group"
              >
                <div className="h-full rounded-lg bg-surface-container-lowest editorial-shadow transition-all hover:bg-surface-container">
                  <div className="p-6 pb-0">
                    <p className="font-headline text-xl italic text-on-surface transition-colors group-hover:text-primary">
                      {coupon.title}
                    </p>
                    {businessName && (
                      <p className="mt-2 text-sm text-on-surface/70">
                        {businessName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-3 p-6 pt-4">
                    {coupon.description && (
                      <p className="line-clamp-2 text-sm text-on-surface/70">
                        {coupon.description}
                      </p>
                    )}
                    <CommunityBadges communityIds={coupon.communityIds} communityMap={communityMap} />
                    <div className="flex items-center gap-2 text-xs text-on-surface/70">
                      <Calendar className="size-3.5" />
                      <span>
                        {startFormatted} – {endFormatted}
                      </span>
                    </div>
                    {coupon.isSoldOut ? (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-destructive">
                        Sold out
                      </span>
                    ) : coupon.quantityLimit !== undefined ? (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-primary">
                        Limited availability
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
