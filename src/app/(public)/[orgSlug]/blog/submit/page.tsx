"use client";

import { use, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { FileText, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCommunityFilter } from "@/hooks/use-community-filter";
import type { Id } from "../../../../../../convex/_generated/dataModel";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function SubmitBlogPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const { isSignedIn } = useAuth();

  return (
    <div className="font-body mx-auto w-full max-w-2xl px-4 py-24 text-on-surface md:px-6">
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
          Blog
        </p>
        <h1 className="font-headline mt-2 text-3xl italic tracking-tight md:text-4xl">
          Submit a Blog Post
        </h1>
        <p className="mt-2 text-on-surface/60">
          Share your story or news for review and publication
        </p>
      </div>

      {isSignedIn ? (
        <BlogSubmissionForm orgSlug={orgSlug} />
      ) : (
        <Card className="rounded-lg border-0 bg-surface-container-lowest editorial-shadow ring-0">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <LogIn className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium text-on-surface">
                Sign in to submit a blog post
              </p>
              <p className="mt-1 text-sm text-on-surface/60">
                You need an account to submit blog posts
              </p>
            </div>
            <SignInButton mode="modal">
              <Button size="lg">Sign In</Button>
            </SignInButton>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BlogSubmissionForm({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const submitBlog = useMutation(api.public.mutations.submitBlog);
  const categories = useQuery(api.public.queries.listCategories, {
    orgSlug,
    type: "blog",
  });
  const { communities } = useCommunityFilter(orgSlug);

  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("");

  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});

  function validate(): boolean {
    const next: typeof errors = {};
    if (!title.trim()) next.title = "Title is required";
    if (!content.trim()) next.content = "Content is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await submitBlog({
        orgSlug,
        title: title.trim(),
        slug: slugify(title),
        content: content.trim(),
        excerpt: excerpt.trim() || undefined,
        categoryIds: categoryId
          ? [categoryId as Id<"categories">]
          : undefined,
        communityIds: selectedCommunityId
          ? [selectedCommunityId as Id<"communities">]
          : undefined,
      });
      toast.success("Blog post submitted for review!");
      router.push(`/${orgSlug}/blog`);
    } catch {
      toast.error("Failed to submit blog post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="rounded-lg border-0 bg-surface-container-lowest editorial-shadow ring-0">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2 italic">
          <FileText className="size-5" />
          Post Details
        </CardTitle>
        <CardDescription className="text-on-surface/60">
          Fill in the details below. Your post will be reviewed before publishing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g. Community Garden Grand Opening"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((p) => ({ ...p, title: undefined }));
              }}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Input
              id="excerpt"
              placeholder="A brief summary of your post"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="content">
              Content <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="content"
              placeholder="Write your blog post content here…"
              rows={10}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (errors.content) setErrors((p) => ({ ...p, content: undefined }));
              }}
              aria-invalid={!!errors.content}
            />
            {errors.content && (
              <p className="text-xs text-destructive">{errors.content}</p>
            )}
          </div>

          {categories && categories.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select
                value={categoryId || null}
                onValueChange={(val) => setCategoryId(val ?? "")}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category">
                    {categories.find((cat) => cat._id === categoryId)?.name ??
                      "Select a category"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {communities.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="community">Community</Label>
              <Select
                value={selectedCommunityId || null}
                onValueChange={(val) => setSelectedCommunityId(val ?? "")}
              >
                <SelectTrigger id="community">
                  <SelectValue placeholder="Select a community">
                    {communities.find((c) => c._id === selectedCommunityId)?.name ??
                      "Select a community"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {communities.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={submitting} size="lg">
              {submitting ? "Submitting…" : "Submit Post"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
