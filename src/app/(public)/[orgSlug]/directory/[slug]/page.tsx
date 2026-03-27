"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import Link from "next/link";
import {
  MapPin,
  Globe,
  Phone,
  Mail,
  ArrowLeft,
  ExternalLink,
  Tag,
  Ticket,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { JsonLd } from "@/components/public/json-ld";
import { BusinessMap } from "@/components/public/business-map";
import { formatDate } from "@/lib/utils";

export default function BusinessDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; slug: string }>;
}) {
  const { orgSlug, slug } = use(params);

  const business = useQuery(api.public.queries.getDirectoryBusiness, {
    orgSlug,
    slug,
  });

  const categories = useQuery(api.public.queries.listCategories, {
    orgSlug,
    type: "business",
  });

  const allCoupons = useQuery(api.public.queries.listCoupons, { orgSlug });

  const relatedCoupons = allCoupons?.filter(
    (c) => business && c.businessContactId === business._id,
  );

  const categoryName = business?.category
    ? categories?.find((c) => c._id === business.category)?.name
    : undefined;

  if (business === undefined) {
    return (
      <div className="font-body mx-auto max-w-4xl px-4 py-12 text-on-surface sm:px-6 lg:px-8 md:py-24">
        <Skeleton className="mb-6 h-5 w-32 rounded-lg bg-surface-container-high" />
        <Skeleton className="mb-2 h-9 w-2/3 rounded-lg bg-surface-container-high" />
        <Skeleton className="mb-8 h-5 w-24 rounded-lg bg-surface-container-high" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg bg-surface-container-high" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg bg-surface-container-high" />
          </div>
        </div>
      </div>
    );
  }

  if (business === null) {
    return (
      <div className="font-body mx-auto max-w-4xl px-4 py-12 text-on-surface sm:px-6 lg:px-8 md:py-24">
        <Link
          href={`/${orgSlug}/directory`}
          className="mb-8 inline-flex items-center gap-1 text-sm font-bold text-primary transition-colors hover:text-primary/80"
        >
          <ArrowLeft className="size-4" />
          Back to Directory
        </Link>
        <div className="flex flex-col items-center justify-center rounded-lg bg-surface-container-low py-16 text-center">
          <h3 className="font-headline text-lg italic text-on-surface">
            Business not found
          </h3>
          <p className="mt-2 text-sm text-on-surface/70">
            This business listing may have been removed.
          </p>
        </div>
      </div>
    );
  }

  const fullAddress = [
    business.address?.street,
    business.address?.street2,
    [business.address?.city, business.address?.state, business.address?.zip]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="font-body mx-auto max-w-4xl px-4 py-12 text-on-surface sm:px-6 lg:px-8 md:py-24">
      <JsonLd
        data={{
          "@type": "LocalBusiness",
          name: business.company,
          ...(business.description && { description: business.description }),
          ...(business.phone && { telephone: business.phone }),
          ...(business.website && {
            url: business.website.startsWith("http")
              ? business.website
              : `https://${business.website}`,
          }),
          ...(business.address && {
            address: {
              "@type": "PostalAddress",
              ...(business.address.street && {
                streetAddress: business.address.street,
              }),
              ...(business.address.city && {
                addressLocality: business.address.city,
              }),
              ...(business.address.state && {
                addressRegion: business.address.state,
              }),
              ...(business.address.zip && {
                postalCode: business.address.zip,
              }),
            },
          }),
        }}
      />

      <Link
        href={`/${orgSlug}/directory`}
        className="mb-8 inline-flex items-center gap-1 text-sm font-bold text-primary transition-colors hover:text-primary/80"
      >
        <ArrowLeft className="size-4" />
        Back to Directory
      </Link>

      <div className="mb-12 md:mb-24">
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="font-headline text-3xl italic tracking-tight text-on-surface md:text-4xl">
            {business.company}
          </h1>
          {business.featured && (
            <span className="mt-1 inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
              Featured
            </span>
          )}
        </div>
        {categoryName && (
          <p className="mt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            <Tag className="size-3" />
            {categoryName}
          </p>
        )}
      </div>

      <div className="grid gap-12 md:grid-cols-3 md:gap-16">
        <div className="space-y-12 md:col-span-2 md:space-y-24">
          {business.description && (
            <section>
              <h2 className="font-headline mb-4 text-2xl italic text-on-surface">
                About
              </h2>
              <p className="leading-relaxed whitespace-pre-wrap text-on-surface/80">
                {business.description}
              </p>
            </section>
          )}

          <BusinessMap
            lat={business.lat}
            lng={business.lng}
            name={business.company}
            address={fullAddress || undefined}
          />

          {relatedCoupons && relatedCoupons.length > 0 && (
            <section>
              <h2 className="font-headline mb-6 flex items-center text-2xl italic text-on-surface">
                <Ticket className="mr-2 inline-block size-5 shrink-0 text-primary" />
                Coupons & Deals
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {relatedCoupons.map((coupon) => (
                  <Link
                    key={coupon._id}
                    href={`/${orgSlug}/coupons/${coupon._id}`}
                  >
                    <div className="editorial-shadow h-full rounded-lg bg-surface-container-lowest p-5 transition-colors hover:bg-surface-container">
                      <h3 className="font-headline text-base italic text-on-surface">
                        {coupon.title}
                      </h3>
                      <p className="mt-2 text-xs text-on-surface/70">
                        Valid through {formatDate(coupon.endDate)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <div className="editorial-shadow rounded-lg bg-surface-container-lowest p-6">
            <h2 className="font-headline text-lg italic text-on-surface">
              Contact Information
            </h2>
            <div className="mt-6 space-y-4">
              {fullAddress && (
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p className="text-sm whitespace-pre-line text-on-surface/80">
                    {fullAddress}
                  </p>
                </div>
              )}
              {business.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="size-4 shrink-0 text-primary" />
                  <a
                    href={`tel:${business.phone}`}
                    className="text-sm font-bold text-primary transition-colors hover:text-primary/80"
                  >
                    {business.phone}
                  </a>
                </div>
              )}
              {business.email && (
                <div className="flex items-center gap-3">
                  <Mail className="size-4 shrink-0 text-primary" />
                  <a
                    href={`mailto:${business.email}`}
                    className="text-sm font-bold text-primary transition-colors hover:text-primary/80"
                  >
                    {business.email}
                  </a>
                </div>
              )}
              {business.website && (
                <div className="flex items-center gap-3">
                  <Globe className="size-4 shrink-0 text-primary" />
                  <a
                    href={
                      business.website.startsWith("http")
                        ? business.website
                        : `https://${business.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-primary transition-colors hover:text-primary/80"
                  >
                    {business.website.replace(/^https?:\/\//, "")}
                    <ExternalLink className="ml-1 inline-block size-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {(business.firstName || business.lastName) && (
            <div className="editorial-shadow rounded-lg bg-surface-container-lowest p-6">
              <h2 className="font-headline text-lg italic text-on-surface">
                Contact Person
              </h2>
              <p className="mt-4 text-sm text-on-surface/80">
                {[business.salutation, business.firstName, business.lastName]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
