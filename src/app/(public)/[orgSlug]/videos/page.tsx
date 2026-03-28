"use client";

import { use, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Play, Film, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommunityFilter } from "@/hooks/use-community-filter";
import { CommunityBadges } from "@/components/public/community-badge";
import type { Id } from "../../../../../convex/_generated/dataModel";

function getEmbedUrl(url: string): string | null {
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

export default function VideosPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const { communityId, communityMap } = useCommunityFilter(orgSlug);
  const [selectedCategory, setSelectedCategory] = useState<
    Id<"categories"> | undefined
  >(undefined);

  const videos = useQuery(api.public.queries.listVideos, {
    orgSlug,
    categoryId: selectedCategory,
    communityId,
  });

  const categories = useQuery(api.public.queries.listCategories, {
    orgSlug,
    type: "video",
  });

  if (!videos || !categories) return <VideosPageSkeleton />;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-24 font-body text-on-surface md:px-6">
      <div className="mb-12">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
          Watch
        </p>
        <h1 className="font-headline text-4xl italic tracking-tight text-on-surface md:text-5xl">
          Videos
        </h1>
        <p className="mt-3 text-on-surface/70">
          Watch the latest from our community
        </p>
      </div>

      {categories.length > 0 && (
        <div className="mb-12 space-y-3">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            <Filter className="size-3" />
            Categories
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!selectedCategory ? "secondary" : "ghost"}
              size="xs"
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
                size="xs"
                className={
                  selectedCategory !== cat._id
                    ? "text-on-surface hover:bg-surface-container"
                    : undefined
                }
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === cat._id ? undefined : cat._id,
                  )
                }
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg bg-surface-container-low py-24 text-center">
          <Film className="mb-3 size-10 text-on-surface/40" />
          <p className="font-headline text-xl italic text-on-surface">
            No videos yet
          </p>
          <p className="mt-2 text-sm text-on-surface/70">
            Check back soon for new content
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {videos.map((video) => {
            const embedUrl = video.url ? getEmbedUrl(video.url) : null;

            return (
              <div
                key={video._id}
                className="overflow-hidden rounded-lg bg-surface-container-lowest editorial-shadow transition-all hover:bg-surface-container"
              >
                <div className="relative aspect-video w-full bg-surface-container-high">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 size-full"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                        <Play className="size-7 text-primary" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <p className="font-headline line-clamp-1 text-xl italic text-on-surface">
                    {video.title}
                  </p>
                  {video.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-on-surface/70">
                      {video.description}
                    </p>
                  )}
                  <div className="mt-3">
                    <CommunityBadges communityIds={video.communityIds} communityMap={communityMap} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VideosPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-24 font-body md:px-6">
      <Skeleton className="mb-2 h-4 w-20 rounded-lg bg-surface-container-high" />
      <Skeleton className="mb-3 h-10 w-40 rounded-lg bg-surface-container-high" />
      <Skeleton className="mb-12 h-5 w-64 rounded-lg bg-surface-container-high" />
      <div className="mb-12 flex gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-lg bg-surface-container-high" />
        ))}
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg bg-surface-container-lowest editorial-shadow"
          >
            <Skeleton className="aspect-video w-full bg-surface-container-high" />
            <div className="space-y-2 p-6">
              <Skeleton className="h-6 w-3/4 rounded-lg bg-surface-container-high" />
              <Skeleton className="h-4 w-full rounded-lg bg-surface-container-high" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
