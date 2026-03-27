"use client";

import { use, useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import { Search, MapPin, Globe, Phone, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function DirectoryPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const debouncedSearch = useDebounce(searchInput, 300);

  const categoryFilter =
    selectedCategory !== "all"
      ? (selectedCategory as Id<"categories">)
      : undefined;

  const businesses = useQuery(api.public.queries.listDirectoryBusinesses, {
    orgSlug,
    search: debouncedSearch || undefined,
    categoryId: categoryFilter,
  });

  const categories = useQuery(api.public.queries.listCategories, {
    orgSlug,
    type: "business",
  });

  const categoryMap = useMemo(() => {
    if (!categories) return new Map<string, string>();
    return new Map(categories.map((c) => [c._id, c.name]));
  }, [categories]);

  const sortedBusinesses = useMemo(() => {
    if (!businesses) return undefined;
    return [...businesses].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (a.company ?? "").localeCompare(b.company ?? "");
    });
  }, [businesses]);

  const handleCategoryChange = useCallback((val: string | null) => {
    setSelectedCategory(val ?? "all");
  }, []);

  const inputCurator =
    "border-0 bg-surface-container-low text-on-surface shadow-none placeholder:text-on-surface/50 focus-visible:ring-2 focus-visible:ring-primary/30";

  return (
    <div className="font-body mx-auto max-w-7xl px-4 py-12 text-on-surface sm:px-6 lg:px-8 md:py-24">
      <div className="mb-12 md:mb-24">
        <h1 className="font-headline text-3xl italic tracking-tight text-on-surface md:text-4xl">
          Business Directory
        </h1>
        <p className="mt-2 text-on-surface/70">
          Discover local businesses in your community
        </p>
      </div>

      <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface/60" />
          <Input
            placeholder="Search businesses..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={cn("h-10 pl-9", inputCurator)}
          />
        </div>
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger
            className={cn(
              "h-10 w-full border-0 bg-surface-container-low sm:w-[200px]",
              "text-on-surface focus:ring-2 focus:ring-primary/30 data-placeholder:text-on-surface/50",
            )}
          >
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="border-0 bg-surface-container-lowest shadow-lg">
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat._id} value={cat._id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!sortedBusinesses ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="editorial-shadow rounded-lg bg-surface-container-lowest p-6"
            >
              <Skeleton className="h-5 w-3/4 rounded-lg bg-surface-container-high" />
              <Skeleton className="mt-3 h-4 w-1/3 rounded-lg bg-surface-container-high" />
              <div className="mt-6 space-y-2">
                <Skeleton className="h-4 w-full rounded-lg bg-surface-container-high" />
                <Skeleton className="h-4 w-2/3 rounded-lg bg-surface-container-high" />
                <Skeleton className="mt-4 h-4 w-1/2 rounded-lg bg-surface-container-high" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedBusinesses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg bg-surface-container-low py-16 text-center">
          <Search className="mb-4 size-10 text-on-surface/40" />
          <h3 className="font-headline text-lg italic text-on-surface">
            No businesses found
          </h3>
          <p className="mt-2 text-sm text-on-surface/70">
            {searchInput
              ? "Try adjusting your search or filters"
              : "No businesses are listed yet"}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sortedBusinesses.map((biz) => (
            <Link
              key={biz._id}
              href={`/${orgSlug}/directory/${biz.slug ?? biz._id}`}
              className="group"
            >
              <div
                className={cn(
                  "editorial-shadow h-full rounded-lg bg-surface-container-lowest p-6 transition-colors hover:bg-surface-container",
                  biz.featured && "bg-surface-container-low",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-headline text-xl italic text-on-surface transition-colors group-hover:text-primary">
                    {biz.company}
                  </p>
                  {biz.featured && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
                      <Star className="size-3" />
                      Featured
                    </span>
                  )}
                </div>
                {biz.category && categoryMap.get(biz.category) && (
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-primary">
                    {categoryMap.get(biz.category)}
                  </p>
                )}
                <div className="mt-4 space-y-3">
                  {biz.description && (
                    <p className="line-clamp-2 text-sm text-on-surface/70">
                      {biz.description}
                    </p>
                  )}
                  <div className="space-y-1.5 text-sm text-on-surface/70">
                    {biz.address?.street && (
                      <div className="flex items-center gap-2">
                        <MapPin className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate">
                          {[
                            biz.address.street,
                            biz.address.city,
                            biz.address.state,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                    {biz.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 shrink-0 text-primary" />
                        <span>{biz.phone}</span>
                      </div>
                    )}
                    {biz.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate font-bold text-primary transition-colors group-hover:text-primary/80">
                          {biz.website.replace(/^https?:\/\//, "")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
