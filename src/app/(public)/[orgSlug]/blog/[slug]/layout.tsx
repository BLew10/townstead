import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import { truncate } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string; slug: string }>;
}): Promise<Metadata> {
  const { orgSlug, slug } = await params;

  try {
    const post = await fetchQuery(api.public.queries.getBlogPost, {
      orgSlug,
      slug,
    });

    if (!post) return { title: "Post Not Found" };

    const title = post.seoTitle || post.title;
    const description = post.seoDescription || post.excerpt;

    return {
      title,
      ...(description && { description: truncate(description, 160) }),
      openGraph: {
        title,
        ...(description && { description: truncate(description, 200) }),
        type: "article",
        ...(post.publishedAt && {
          publishedTime: new Date(post.publishedAt).toISOString(),
        }),
      },
    };
  } catch {
    return { title: "Blog" };
  }
}

export default function BlogPostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
