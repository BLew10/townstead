"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Calendar, Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "../../../convex/_generated/dataModel";

interface SiteEntry {
  orgSlug: string;
  siteName: string | null;
  tagline: string | null;
  logo: Id<"_storage"> | null;
}

function SiteLogo({ storageId }: { storageId: Id<"_storage"> }) {
  const url = useQuery(api.storage.getUrl, { storageId });

  if (!url) {
    return (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Calendar className="size-5 text-primary" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      className="size-12 shrink-0 rounded-xl object-cover"
    />
  );
}

function SiteCard({ site }: { site: SiteEntry }) {
  return (
    <Link
      href={`/${site.orgSlug}`}
      className="group flex flex-col rounded-2xl bg-surface-container-low p-6 editorial-shadow transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="mb-4 flex items-center gap-3">
        {site.logo ? (
          <SiteLogo storageId={site.logo} />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Calendar className="size-5 text-primary" />
          </div>
        )}
        <h3 className="font-headline text-lg font-bold text-on-surface">
          {site.siteName ?? site.orgSlug}
        </h3>
      </div>

      {site.tagline && (
        <p className="mb-4 line-clamp-2 text-sm text-on-surface/60">
          {site.tagline}
        </p>
      )}

      <div className="mt-auto flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span>Visit site</span>
        <ArrowRight className="size-3.5" />
      </div>
    </Link>
  );
}

function DirectorySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-surface-container-low p-6 editorial-shadow"
        >
          <div className="mb-4 flex items-center gap-3">
            <Skeleton className="size-12 rounded-xl" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function SiteDirectory() {
  const sites = useQuery(api.public.queries.listPublicSites);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!sites) return [];
    if (!search.trim()) return sites;
    const q = search.toLowerCase().trim();
    return sites.filter(
      (s) =>
        s.orgSlug.toLowerCase().includes(q) ||
        s.siteName?.toLowerCase().includes(q),
    );
  }, [sites, search]);

  if (sites === undefined) {
    return (
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-8">
        <DirectorySkeleton />
      </section>
    );
  }

  if (sites.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-8">
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface/40" />
        <Input
          type="text"
          placeholder="Search communities…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 rounded-xl border-outline-variant/20 bg-surface-container-low pl-10 text-on-surface placeholder:text-on-surface/40"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-on-surface/50">
          No communities found matching &ldquo;{search}&rdquo;
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((site) => (
            <SiteCard key={site.orgSlug} site={site} />
          ))}
        </div>
      )}
    </section>
  );
}
