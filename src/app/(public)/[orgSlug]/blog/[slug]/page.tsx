"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { JsonLd } from "@/components/public/json-ld";

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ orgSlug: string; slug: string }>;
}) {
  const { orgSlug, slug } = use(params);

  const post = useQuery(api.public.queries.getBlogPost, { orgSlug, slug });

  const categories = useQuery(api.public.queries.listCategories, {
    orgSlug,
    type: "blog",
  });

  if (post === undefined) return <BlogPostSkeleton />;

  if (post === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 font-body text-on-surface sm:px-6 lg:px-8">
        <Link
          href={`/${orgSlug}/blog`}
          className="mb-6 inline-flex items-center gap-1 text-sm font-bold text-primary transition-colors hover:text-primary/80"
        >
          <ArrowLeft className="size-4" />
          Back to Blog
        </Link>
        <div className="flex flex-col items-center justify-center rounded-lg bg-surface-container-low py-24 text-center">
          <h3 className="font-headline text-xl italic text-on-surface">
            Post not found
          </h3>
          <p className="mt-2 text-sm text-on-surface/70">
            This blog post may have been removed or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-24 font-body text-on-surface sm:px-6 lg:px-8">
      <Link
        href={`/${orgSlug}/blog`}
        className="mb-6 inline-flex items-center gap-1 text-sm font-bold text-primary transition-colors hover:text-primary/80"
      >
        <ArrowLeft className="size-4" />
        Back to Blog
      </Link>

      <JsonLd
        data={{
          "@type": "Article",
          headline: post.title,
          ...(post.publishedAt && {
            datePublished: new Date(post.publishedAt).toISOString(),
          }),
          ...(post.excerpt && { description: post.excerpt }),
        }}
      />

      <article className="mt-6">
        {post.categoryIds && categories && (
          <div className="mb-4 flex flex-wrap gap-2">
            {post.categoryIds.map((catId) => {
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
        )}

        <h1 className="font-headline text-3xl italic tracking-tight text-on-surface sm:text-4xl md:text-5xl">
          {post.title}
        </h1>

        <div className="mt-4 flex items-center gap-4 text-sm text-on-surface/70">
          {post.publishedAt && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {format(new Date(post.publishedAt), "MMMM d, yyyy")}
            </span>
          )}
          {post.authorId && (
            <span className="inline-flex items-center gap-1.5">
              <User className="size-4" />
              Author
            </span>
          )}
        </div>

        <div
          className="my-10 h-px bg-surface-container-high"
          aria-hidden
        />

        {post.content ? (
          <div
            className="prose prose-neutral max-w-none text-on-surface prose-headings:font-headline prose-headings:italic prose-p:text-on-surface/90 prose-a:font-bold prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        ) : (
          <p className="italic text-on-surface/70">
            This post has no content yet.
          </p>
        )}
      </article>
    </div>
  );
}

function BlogPostSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 font-body sm:px-6 lg:px-8">
      <Skeleton className="mb-6 h-5 w-28 rounded-lg bg-surface-container-high" />
      <div className="mt-6 space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16 rounded-lg bg-surface-container-high" />
          <Skeleton className="h-4 w-20 rounded-lg bg-surface-container-high" />
        </div>
        <Skeleton className="h-12 w-3/4 rounded-lg bg-surface-container-high" />
        <div className="flex gap-4">
          <Skeleton className="h-5 w-32 rounded-lg bg-surface-container-high" />
          <Skeleton className="h-5 w-24 rounded-lg bg-surface-container-high" />
        </div>
        <Skeleton className="my-10 h-px w-full bg-surface-container-high" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full rounded-lg bg-surface-container-high" />
          <Skeleton className="h-4 w-full rounded-lg bg-surface-container-high" />
          <Skeleton className="h-4 w-5/6 rounded-lg bg-surface-container-high" />
          <Skeleton className="h-4 w-full rounded-lg bg-surface-container-high" />
          <Skeleton className="h-4 w-3/4 rounded-lg bg-surface-container-high" />
        </div>
      </div>
    </div>
  );
}
