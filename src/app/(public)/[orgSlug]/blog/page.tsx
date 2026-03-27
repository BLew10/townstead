"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { format } from "date-fns";
import { CalendarDays, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function BlogPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const [selectedCategory, setSelectedCategory] = useState<
    Id<"categories"> | undefined
  >(undefined);

  const posts = useQuery(api.public.queries.listBlogPosts, {
    orgSlug,
    categoryId: selectedCategory,
  });

  const categories = useQuery(api.public.queries.listCategories, {
    orgSlug,
    type: "blog",
  });

  if (!posts || !categories) return <BlogPageSkeleton />;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-24 font-body text-on-surface md:px-6">
      <div className="mb-12">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
          Journal
        </p>
        <h1 className="font-headline text-4xl italic tracking-tight text-on-surface md:text-5xl">
          Blog
        </h1>
        <p className="mt-3 text-on-surface/70">
          News, updates, and stories from the community
        </p>
      </div>

      {categories.length > 0 && (
        <div className="mb-12 flex flex-wrap gap-2">
          <Button
            variant={!selectedCategory ? "secondary" : "ghost"}
            size="sm"
            className={
              selectedCategory
                ? "text-on-surface hover:bg-surface-container"
                : undefined
            }
            onClick={() => setSelectedCategory(undefined)}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat._id}
              variant={
                selectedCategory === cat._id ? "secondary" : "ghost"
              }
              size="sm"
              className={
                selectedCategory !== cat._id
                  ? "text-on-surface hover:bg-surface-container"
                  : undefined
              }
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === cat._id ? undefined : cat._id
                )
              }
            >
              {cat.name}
            </Button>
          ))}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg bg-surface-container-low py-24 text-center">
          <CalendarDays className="mb-3 size-10 text-on-surface/40" />
          <p className="font-headline text-xl italic text-on-surface">
            No posts yet
          </p>
          <p className="mt-2 text-sm text-on-surface/70">
            Check back soon for new content.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post._id} href={`/${orgSlug}/blog/${post.slug}`}>
              <div className="group h-full overflow-hidden rounded-lg bg-surface-container-lowest editorial-shadow transition-all hover:bg-surface-container">
                <div className="aspect-video bg-surface-container-high" />
                <div className="p-6">
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {post.categoryIds?.map((catId: Id<"categories">) => {
                      const cat = categories.find((c) => c._id === catId);
                      return cat ? (
                        <span
                          key={catId}
                          className="text-[10px] font-bold uppercase tracking-widest text-primary"
                        >
                          {cat.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <p className="font-headline line-clamp-2 text-xl italic text-on-surface transition-colors group-hover:text-primary">
                    {post.title}
                  </p>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-3 text-sm text-on-surface/70">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-4 text-xs text-on-surface/70">
                    {post.publishedAt && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3" />
                        {format(new Date(post.publishedAt), "MMM d, yyyy")}
                      </span>
                    )}
                    {post.authorId && (
                      <span className="inline-flex items-center gap-1">
                        <User className="size-3" />
                        Author
                      </span>
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

function BlogPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-24 font-body md:px-6">
      <Skeleton className="mb-2 h-4 w-24 rounded-lg bg-surface-container-high" />
      <Skeleton className="mb-3 h-10 w-32 rounded-lg bg-surface-container-high" />
      <Skeleton className="mb-12 h-5 w-64 rounded-lg bg-surface-container-high" />
      <div className="mb-12 flex gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-lg bg-surface-container-high" />
        ))}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-video w-full rounded-lg bg-surface-container-high" />
            <Skeleton className="h-5 w-3/4 rounded-lg bg-surface-container-high" />
            <Skeleton className="h-4 w-full rounded-lg bg-surface-container-high" />
            <Skeleton className="h-4 w-2/3 rounded-lg bg-surface-container-high" />
          </div>
        ))}
      </div>
    </div>
  );
}
