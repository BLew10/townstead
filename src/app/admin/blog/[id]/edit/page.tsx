"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Id } from "../../../../../../convex/_generated/dataModel";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = use(params);
  const id = rawId as Id<"blogPosts">;
  const router = useRouter();
  const { orgId, isReady } = useOrg();

  const post = useQuery(api.blog.queries.getById, { id });
  const updatePost = useMutation(api.blog.mutations.update);

  const categories = useQuery(
    api.categories.queries.list,
    isReady ? { orgId: orgId!, type: "blog" } : "skip"
  );
  const communities = useQuery(
    api.communities.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [status, setStatus] = useState<"draft" | "pending" | "published">(
    "draft"
  );
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<
    Id<"categories">[]
  >([]);
  const [selectedCommunities, setSelectedCommunities] = useState<
    Id<"communities">[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (post && !initialized) {
      setTitle(post.title);
      setSlug(post.slug);
      setContent(post.content ?? "");
      setExcerpt(post.excerpt ?? "");
      setStatus(post.status);
      setSeoTitle(post.seoTitle ?? "");
      setSeoDescription(post.seoDescription ?? "");
      setSelectedCategories(post.categoryIds ?? []);
      setSelectedCommunities((post.communityIds ?? []) as Id<"communities">[]);
      setSlugManuallyEdited(true);
      setInitialized(true);
    }
  }, [post, initialized]);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setSlug(slugify(value));
  }

  function toggleCategory(catId: Id<"categories">) {
    setSelectedCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((cid) => cid !== catId)
        : [...prev, catId]
    );
  }

  function toggleCommunity(communityId: Id<"communities">) {
    setSelectedCommunities((prev) =>
      prev.includes(communityId)
        ? prev.filter((cid) => cid !== communityId)
        : [...prev, communityId]
    );
  }

  async function handleSubmit() {
    if (!title.trim() || !slug.trim()) {
      toast.error("Title and slug are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePost({
        id,
        title: title.trim(),
        slug: slug.trim(),
        content: content.trim() || undefined,
        excerpt: excerpt.trim() || undefined,
        status,
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
        communityIds: selectedCommunities.length > 0 ? selectedCommunities : undefined,
      });
      toast.success("Blog post updated");
      router.push("/admin/blog");
    } catch {
      toast.error("Failed to update blog post");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (post === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (post === null) {
    return (
      <div className="space-y-6">
        <Link href="/admin/blog">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Button>
        </Link>
        <EmptyState
          title="Post not found"
          description="This blog post may have been deleted."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/blog">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Button>
        </Link>
      </div>

      <PageHeader
        title={`Edit: ${post.title}`}
        description="Update blog post content and settings"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter post title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="post-url-slug"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Brief summary for listing pages"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content (HTML)</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your blog post content here..."
                  rows={16}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Supports HTML markup. Can be upgraded to a rich text editor.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) =>
                    setStatus(
                      (v ?? "draft") as "draft" | "pending" | "published"
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !title.trim()}
                className="w-full"
              >
                {isSubmitting ? "Saving..." : "Update Post"}
              </Button>
            </CardContent>
          </Card>

          {categories && categories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categories.map((cat) => (
                  <div key={cat._id} className="flex items-center gap-2">
                    <Checkbox
                      id={`cat-${cat._id}`}
                      checked={selectedCategories.includes(cat._id)}
                      onCheckedChange={() => toggleCategory(cat._id)}
                    />
                    <Label
                      htmlFor={`cat-${cat._id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {cat.name}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {communities && communities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Communities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {communities.map((community) => (
                  <div key={community._id} className="flex items-center gap-2">
                    <Checkbox
                      id={`community-${community._id}`}
                      checked={selectedCommunities.includes(community._id)}
                      onCheckedChange={() => toggleCommunity(community._id)}
                    />
                    <Label
                      htmlFor={`community-${community._id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {community.name}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">SEO Title</Label>
                <Input
                  id="seoTitle"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Override page title for search engines"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoDescription">SEO Description</Label>
                <Textarea
                  id="seoDescription"
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Meta description for search engines"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
