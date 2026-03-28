"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { format } from "date-fns";
import { ArrowRight, Search, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommunityFilter } from "@/hooks/use-community-filter";
import { CommunityBadges } from "@/components/public/community-badge";
import { useStableNow } from "@/hooks/use-stable-now";

export default function OrgHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const { communityId, communityMap } = useCommunityFilter(orgSlug);
  const now = useStableNow();
  const data = useQuery(api.public.queries.getHomepageData, {
    orgSlug,
    communityId,
    now,
  });
  const businessCategories = useQuery(api.public.queries.listCategories, {
    orgSlug,
    type: "business" as const,
  });
  const bizCategoryMap = useMemo(() => {
    if (!businessCategories) return new Map<string, string>();
    return new Map(businessCategories.map((c) => [c._id, c.name]));
  }, [businessCategories]);

  if (!data) return <HomepageSkeleton />;

  const {
    branding,
    featuredEvents,
    featuredBusinesses,
    activeCoupons,
    recentPosts,
  } = data;

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative flex min-h-[600px] items-center overflow-hidden bg-on-surface/80 pt-20">
        <div className="absolute inset-0 bg-linear-to-r from-on-surface/80 via-on-surface/40 to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-8">
          <div className="max-w-2xl">
            <h1 className="mb-8 font-headline text-6xl italic leading-tight text-white md:text-7xl">
              Discover the{" "}
              <span className="font-bold not-italic">
                {branding.siteName ?? "Community"}
              </span>
            </h1>
            {branding.tagline && (
              <p className="mb-8 text-lg text-white/70">{branding.tagline}</p>
            )}
            <div className="editorial-shadow flex max-w-xl items-center rounded-xl bg-surface-container-lowest/10 p-2 backdrop-blur-md">
              <div className="flex flex-1 items-center gap-3 px-4">
                <Search className="size-5 text-white/70" strokeWidth={1.5} />
                <Link
                  href={`/${orgSlug}/events`}
                  className="w-full py-4 font-body text-white/60"
                >
                  Find events, businesses, and deals near you
                </Link>
              </div>
              <Link
                href={`/${orgSlug}/events`}
                className="rounded-lg bg-secondary px-8 py-4 font-bold text-secondary-foreground transition-colors hover:bg-secondary/80"
              >
                Search
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Events ── */}
      {featuredEvents.length > 0 && (
        <section className="mx-auto max-w-7xl px-8 py-24">
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-xl">
              <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-primary">
                What&apos;s Happening
              </span>
              <h2 className="font-headline text-5xl italic text-on-surface">
                Featured Local Events
              </h2>
            </div>
            <Link
              href={`/${orgSlug}/events`}
              className="group flex items-center gap-2 font-bold text-primary"
            >
              View all events
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {featuredEvents.slice(0, 3).map((event) => (
              <Link
                key={event._id}
                href={`/${orgSlug}/events/${event._id}`}
                className="group cursor-pointer"
              >
                <div className="editorial-shadow relative mb-6 h-[400px] overflow-hidden rounded-lg bg-surface-container-high">
                  <div className="flex h-full items-center justify-center text-on-surface-variant">
                    <span className="font-headline text-2xl italic opacity-30">
                      {event.name.charAt(0)}
                    </span>
                  </div>
                  <div className="editorial-shadow absolute left-6 top-6 rounded-full bg-surface-container-lowest px-4 py-2 text-center">
                    <span className="block font-bold leading-tight text-primary">
                      {format(new Date(event.date), "d")}
                    </span>
                    <span className="block text-[10px] font-bold uppercase text-on-surface/50">
                      {format(new Date(event.date), "MMM")}
                    </span>
                  </div>
                </div>
                {event.location && (
                  <span className="mb-2 flex items-center gap-1 text-sm font-bold text-primary">
                    <MapPin className="size-3" strokeWidth={1.5} />
                    {event.location}
                  </span>
                )}
                <h3 className="mb-2 font-headline text-2xl transition-colors group-hover:text-primary">
                  {event.name}
                </h3>
                <p className="text-sm text-on-surface/60">
                  {format(new Date(event.date), "EEEE, MMMM d · h:mm a")}
                </p>
                <CommunityBadges communityIds={event.communityIds} communityMap={communityMap} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Deals & Coupons ── */}
      {activeCoupons.length > 0 && (
        <section className="overflow-hidden bg-surface-container-low py-24">
          <div className="mx-auto mb-12 max-w-7xl px-8">
            <h2 className="font-headline text-4xl italic text-on-surface">
              Member Exclusive Deals
            </h2>
          </div>
          <div className="no-scrollbar flex gap-6 overflow-x-auto px-8 pb-8">
            {activeCoupons.map((coupon) => (
              <Link
                key={coupon._id}
                href={`/${orgSlug}/coupons/${coupon._id}`}
                className="editorial-shadow flex min-w-[400px] items-center gap-6 rounded-lg bg-surface-container-lowest p-8"
              >
                <div className="flex size-24 shrink-0 items-center justify-center rounded-full bg-surface-container">
                  <span className="font-headline text-2xl italic text-primary">
                    %
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="mb-1 text-lg font-bold">{coupon.title}</h4>
                  {coupon.description && (
                    <p className="mb-2 font-headline text-lg italic text-primary">
                      {coupon.description}
                    </p>
                  )}
                  <CommunityBadges communityIds={coupon.communityIds} communityMap={communityMap} />
                  <span className="mt-2 inline-block border-b-2 border-secondary pb-0.5 text-sm font-bold transition-colors hover:text-secondary">
                    View Deal
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Featured Businesses ── */}
      {featuredBusinesses.length > 0 && (
        <section className="mx-auto max-w-7xl px-8 py-24">
          <div className="mb-16 text-center">
            <h2 className="mb-4 font-headline text-5xl italic text-on-surface">
              Top Local Partners
            </h2>
            <p className="mx-auto max-w-xl font-body text-on-surface/60">
              Supporting the businesses that make our community a vibrant place
              to live, work, and play.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {featuredBusinesses.slice(0, 8).map((biz) => (
              <div
                key={biz._id}
                className="group cursor-pointer rounded-lg bg-surface-container-low p-8 text-center transition-colors hover:bg-surface-container-high"
              >
                <div className="editorial-shadow mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-surface-container-lowest transition-transform group-hover:scale-110">
                  <span className="font-headline text-xl text-primary">
                    {(biz.company ?? biz.firstName ?? "B").charAt(0)}
                  </span>
                </div>
                {biz.categoryId && bizCategoryMap.get(biz.categoryId) && (
                  <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase text-primary">
                    {bizCategoryMap.get(biz.categoryId)}
                  </span>
                )}
                <h5 className="font-bold text-on-surface">
                  {biz.company ?? `${biz.firstName} ${biz.lastName}`}
                </h5>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Blog / Editorial Picks ── */}
      {recentPosts.length > 0 && (
        <section className="bg-surface py-24">
          <div className="mx-auto max-w-7xl px-8">
            <div className="mb-16 flex items-end justify-between">
              <h2 className="font-headline text-5xl italic text-on-surface">
                Editorial Picks
              </h2>
              <Link
                href={`/${orgSlug}/blog`}
                className="font-bold text-primary"
              >
                Read the Blog
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
              {/* Major post */}
              {recentPosts[0] && (
                <Link
                  href={`/${orgSlug}/blog/${recentPosts[0].slug}`}
                  className="group cursor-pointer md:col-span-7"
                >
                  <div className="editorial-shadow mb-8 h-[500px] overflow-hidden rounded-xl bg-surface-container-high">
                    <div className="flex h-full items-center justify-center">
                      <span className="font-headline text-6xl italic text-on-surface/10">
                        {recentPosts[0].title.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <h3 className="mb-6 font-headline text-4xl leading-tight transition-colors group-hover:text-primary">
                    {recentPosts[0].title}
                  </h3>
                  {recentPosts[0].excerpt && (
                    <p className="mb-6 text-lg leading-relaxed text-on-surface/70">
                      {recentPosts[0].excerpt}
                    </p>
                  )}
                  <div className="mb-4">
                    <CommunityBadges communityIds={recentPosts[0].communityIds} communityMap={communityMap} />
                  </div>
                  {recentPosts[0].publishedAt && (
                    <span className="text-sm font-semibold">
                      {format(
                        new Date(recentPosts[0].publishedAt),
                        "MMMM d, yyyy"
                      )}
                    </span>
                  )}
                </Link>
              )}

              {/* Secondary posts */}
              <div className="flex flex-col gap-12 md:col-span-5">
                {recentPosts.slice(1, 4).map((post) => (
                  <Link
                    key={post._id}
                    href={`/${orgSlug}/blog/${post.slug}`}
                    className="group flex cursor-pointer gap-6"
                  >
                    <div className="editorial-shadow size-32 shrink-0 overflow-hidden rounded-lg bg-surface-container-high">
                      <div className="flex h-full items-center justify-center">
                        <span className="font-headline text-2xl italic text-on-surface/10">
                          {post.title.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="mb-2 font-headline text-2xl transition-colors group-hover:text-primary">
                        {post.title}
                      </h4>
                      <CommunityBadges communityIds={post.communityIds} communityMap={communityMap} />
                      {post.publishedAt && (
                        <span className="mt-1 block text-xs font-semibold italic text-on-surface/50">
                          {format(new Date(post.publishedAt), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function HomepageSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex min-h-[600px] items-center bg-surface-container-high px-8 pt-20">
        <div className="max-w-2xl space-y-6">
          <Skeleton className="h-16 w-[500px]" />
          <Skeleton className="h-6 w-[300px]" />
          <Skeleton className="h-16 w-[500px] rounded-xl" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl space-y-24 px-8 py-24">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-8">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-[400px] rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
