"use client";

import { use, useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import Link from "next/link";
import { format } from "date-fns";
import { useUser, useAuth, SignInButton } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Ticket,
  Building2,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommunityFilter } from "@/hooks/use-community-filter";

export default function CouponDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = use(params);
  const { buildHref } = useCommunityFilter(orgSlug);
  const { user } = useUser();
  const { isSignedIn } = useAuth();
  const [claiming, setClaiming] = useState(false);

  const coupon = useQuery(api.public.queries.getCoupon, {
    id: id as Id<"coupons">,
  });

  const businesses = useQuery(api.public.queries.listDirectoryBusinesses, {
    orgSlug,
  });

  const business = useMemo(
    () =>
      coupon && businesses
        ? businesses.find((b) => b._id === coupon.businessContactId)
        : undefined,
    [coupon, businesses]
  );

  const claimInfo = useQuery(api.public.queries.getCouponClaimInfo, 
    coupon ? { couponId: coupon._id } : "skip"
  );
  const claimCoupon = useMutation(api.public.mutations.claimCoupon);

  const isSoldOut =
    coupon?.quantityLimit !== undefined &&
    claimInfo !== undefined &&
    claimInfo.totalClaims >= coupon.quantityLimit;

  const isUserLimitReached =
    coupon?.perUserLimit !== undefined &&
    claimInfo !== undefined &&
    claimInfo.userClaims >= coupon.perUserLimit;

  const handleClaim = useCallback(async () => {
    if (!user || !coupon) return;
    setClaiming(true);
    try {
      await claimCoupon({ couponId: coupon._id });
      toast.success("Coupon claimed successfully!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to claim coupon";
      toast.error(message);
    } finally {
      setClaiming(false);
    }
  }, [user, coupon, claimCoupon]);

  if (coupon === undefined) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 font-body text-on-surface sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-5 w-32 rounded-lg bg-surface-container-high" />
        <Skeleton className="mb-2 h-10 w-2/3 rounded-lg bg-surface-container-high" />
        <Skeleton className="mb-8 h-5 w-48 rounded-lg bg-surface-container-high" />
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-lg bg-surface-container-high" />
          <Skeleton className="h-24 w-full rounded-lg bg-surface-container-high" />
        </div>
      </div>
    );
  }

  if (coupon === null) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 font-body text-on-surface sm:px-6 lg:px-8">
        <Link
          href={buildHref("coupons")}
          className="mb-6 inline-flex items-center gap-1 text-sm font-bold text-primary transition-colors hover:text-primary/80"
        >
          <ArrowLeft className="size-4" />
          Back to Coupons
        </Link>
        <div className="flex flex-col items-center justify-center rounded-lg bg-surface-container-low py-24 text-center">
          <h3 className="font-headline text-xl italic text-on-surface">
            Coupon not found
          </h3>
          <p className="mt-2 text-sm text-on-surface/70">
            This coupon may have expired or been removed.
          </p>
        </div>
      </div>
    );
  }

  const startFormatted = format(new Date(coupon.startDate), "MMM d, yyyy");
  const endFormatted = format(new Date(coupon.endDate), "MMM d, yyyy");
  const isExpired = coupon.endDate < Date.now();

  return (
    <div className="mx-auto max-w-4xl px-4 py-24 font-body text-on-surface sm:px-6 lg:px-8">
      <Link
        href={buildHref("coupons")}
        className="mb-6 inline-flex items-center gap-1 text-sm font-bold text-primary transition-colors hover:text-primary/80"
      >
        <ArrowLeft className="size-4" />
        Back to Coupons
      </Link>

      <div className="mb-12">
        <div className="flex items-start gap-3">
          <Ticket className="mt-1 size-7 text-primary" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Offer
            </p>
            <h1 className="font-headline text-3xl italic tracking-tight text-on-surface md:text-4xl">
              {coupon.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-surface-container-low px-3 py-1.5 text-sm text-on-surface">
                <Calendar className="size-3" />
                {startFormatted} – {endFormatted}
              </span>
              {isExpired && (
                <span className="rounded-lg bg-destructive/15 px-3 py-1.5 text-sm font-medium text-destructive">
                  Expired
                </span>
              )}
              {!isExpired && isSoldOut && (
                <span className="rounded-lg bg-destructive/15 px-3 py-1.5 text-sm font-medium text-destructive">
                  Sold Out
                </span>
              )}
              {coupon.quantityLimit !== undefined && (
                <span className="rounded-lg bg-surface-container-high px-3 py-1.5 text-sm text-on-surface">
                  Limited to {coupon.quantityLimit} claims
                </span>
              )}
              {coupon.perUserLimit !== undefined && (
                <span className="rounded-lg bg-surface-container-high px-3 py-1.5 text-sm text-on-surface">
                  Limit {coupon.perUserLimit} per person
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-12 md:grid-cols-3">
        <div className="space-y-10 md:col-span-2">
          {coupon.description && (
            <section>
              <h2 className="font-headline mb-4 text-xl italic text-on-surface">
                Details
              </h2>
              <p className="whitespace-pre-wrap leading-relaxed text-on-surface/70">
                {coupon.description}
              </p>
            </section>
          )}

          {coupon.terms && (
            <section>
              <h2 className="font-headline mb-4 flex items-center gap-2 text-xl italic text-on-surface">
                <FileText className="size-5 shrink-0" />
                Terms & Conditions
              </h2>
              <div className="rounded-lg bg-surface-container-low p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface/70">
                  {coupon.terms}
                </p>
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          {business && (
            <div className="rounded-lg bg-surface-container-lowest p-6 editorial-shadow">
              <h3 className="flex items-center gap-2 font-headline text-lg italic text-on-surface">
                <Building2 className="size-4 shrink-0" />
                Business
              </h3>
              <div className="mt-4 space-y-2">
                <p className="font-medium text-on-surface">{business.company}</p>
                {business.slug && (
                  <Link
                    href={buildHref(`directory/${business.slug}`)}
                    className="inline-flex items-center gap-1 text-sm font-bold text-primary transition-transform hover:translate-x-0.5"
                  >
                    View business
                    <ExternalLink className="size-3" />
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-surface-container-lowest p-6 editorial-shadow">
            {isExpired ? (
              <p className="text-center text-sm text-on-surface/70">
                This coupon has expired
              </p>
            ) : isSoldOut ? (
              <div className="text-center">
                <p className="text-sm font-medium text-destructive">
                  Sold out
                </p>
                <p className="mt-1 text-xs text-on-surface/50">
                  All available claims have been redeemed
                </p>
              </div>
            ) : isSignedIn ? (
              isUserLimitReached ? (
                <div className="text-center">
                  <Button disabled variant="secondary" className="w-full">
                    Claim Coupon
                  </Button>
                  <p className="mt-2 text-xs text-on-surface/50">
                    You&apos;ve reached your claim limit
                  </p>
                </div>
              ) : (
                <Button
                  onClick={handleClaim}
                  disabled={claiming}
                  variant="secondary"
                  className="w-full"
                  size="default"
                >
                  {claiming ? "Claiming..." : "Claim Coupon"}
                </Button>
              )
            ) : (
              <div className="text-center">
                <p className="mb-3 text-sm text-on-surface/70">
                  Sign in to claim this coupon
                </p>
                <SignInButton mode="modal">
                  <Button
                    variant="ghost"
                    className="w-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                  >
                    Sign In
                  </Button>
                </SignInButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
