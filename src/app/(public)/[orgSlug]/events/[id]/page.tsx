"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Building2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { JsonLd } from "@/components/public/json-ld";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = use(params);
  const event = useQuery(api.public.queries.getEvent, {
    id: id as Id<"events">,
  });

  if (event === undefined) return <EventDetailSkeleton orgSlug={orgSlug} />;

  if (event === null) {
    return (
      <div className="font-body mx-auto max-w-3xl px-4 py-16 text-center text-on-surface md:py-24">
        <CalendarDays className="mx-auto mb-4 size-12 text-on-surface/40" />
        <h1 className="font-headline text-2xl italic text-on-surface">
          Event Not Found
        </h1>
        <p className="mt-2 text-on-surface/70">
          This event may have been removed or doesn&apos;t exist.
        </p>
        <Link
          href={`/${orgSlug}/events`}
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:text-primary/80"
        >
          <ArrowLeft className="size-3.5" />
          Back to Events
        </Link>
      </div>
    );
  }

  const eventDate = new Date(event.date);
  const endDate = event.endDate ? new Date(event.endDate) : null;

  return (
    <article className="font-body mx-auto max-w-3xl px-4 py-12 text-on-surface md:py-24">
      <JsonLd
        data={{
          "@type": "Event",
          name: event.name,
          startDate: eventDate.toISOString(),
          ...(endDate && { endDate: endDate.toISOString() }),
          ...(event.location && {
            location: { "@type": "Place", name: event.location },
          }),
          ...(event.description && { description: event.description }),
        }}
      />
      {/* Back link */}
      <Link
        href={`/${orgSlug}/events`}
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:text-primary/80"
      >
        <ArrowLeft className="size-3.5" />
        Back to Events
      </Link>

      {/* Date badge */}
      <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-surface-container-high px-4 py-2">
        <CalendarDays className="size-4 text-primary" />
        <span className="text-sm font-bold text-primary">
          {format(eventDate, "EEEE, MMMM d, yyyy")}
        </span>
      </div>

      {/* Title */}
      <h1 className="font-headline text-3xl italic tracking-tight text-on-surface sm:text-4xl">
        {event.name}
      </h1>

      {/* Meta row */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-on-surface/70">
        {/* Time */}
        {event.startTime && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4 shrink-0" />
            {event.startTime}
            {event.endTime && ` – ${event.endTime}`}
          </span>
        )}

        {/* Date range */}
        {endDate && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0" />
            Through {format(endDate, "MMM d, yyyy")}
          </span>
        )}

        {/* Location */}
        {event.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0" />
            {event.location}
          </span>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <div className="prose prose-neutral mt-12 max-w-none text-on-surface prose-p:text-on-surface/90 prose-headings:font-headline prose-headings:italic">
          {event.description.split("\n").map((paragraph, i) =>
            paragraph.trim() ? <p key={i}>{paragraph}</p> : null,
          )}
        </div>
      )}

      {/* Associated business */}
      {event.contactId && (
        <div className="mt-12 rounded-lg bg-surface-container-low p-6">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            <Building2 className="size-3.5" />
            Hosted by
          </p>
          <p className="mt-2 text-sm font-medium text-on-surface">
            Contact ID: {event.contactId}
          </p>
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */

function EventDetailSkeleton({ orgSlug }: { orgSlug: string }) {
  return (
    <div className="font-body mx-auto max-w-3xl px-4 py-12 text-on-surface md:py-24">
      <Link
        href={`/${orgSlug}/events`}
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:text-primary/80"
      >
        <ArrowLeft className="size-3.5" />
        Back to Events
      </Link>
      <Skeleton className="mb-4 h-8 w-48 rounded-lg bg-surface-container-high" />
      <Skeleton className="h-10 w-3/4 rounded-lg bg-surface-container-high" />
      <div className="mt-6 flex gap-6">
        <Skeleton className="h-5 w-32 rounded-lg bg-surface-container-high" />
        <Skeleton className="h-5 w-40 rounded-lg bg-surface-container-high" />
      </div>
      <div className="mt-12 space-y-3">
        <Skeleton className="h-4 w-full rounded-lg bg-surface-container-high" />
        <Skeleton className="h-4 w-full rounded-lg bg-surface-container-high" />
        <Skeleton className="h-4 w-2/3 rounded-lg bg-surface-container-high" />
      </div>
    </div>
  );
}
