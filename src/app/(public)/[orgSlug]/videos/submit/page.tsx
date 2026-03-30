"use client";

import { use, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { Video, LogIn } from "lucide-react";
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

export default function SubmitVideoPage({
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
          Videos
        </p>
        <h1 className="font-headline mt-2 text-3xl italic tracking-tight md:text-4xl">
          Submit a Video
        </h1>
        <p className="mt-2 text-on-surface/60">
          Share a video for review and publication
        </p>
      </div>

      {isSignedIn ? (
        <VideoSubmissionForm orgSlug={orgSlug} />
      ) : (
        <Card className="rounded-lg border-0 bg-surface-container-lowest editorial-shadow ring-0">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <LogIn className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium text-on-surface">
                Sign in to submit a video
              </p>
              <p className="mt-1 text-sm text-on-surface/60">
                You need an account to submit videos
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

function VideoSubmissionForm({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const submitVideo = useMutation(api.public.mutations.submitVideo);
  const categories = useQuery(api.public.queries.listCategories, {
    orgSlug,
    type: "video",
  });
  const { communities } = useCommunityFilter(orgSlug);

  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("");

  const [errors, setErrors] = useState<{ title?: string; url?: string }>({});

  function validate(): boolean {
    const next: typeof errors = {};
    if (!title.trim()) next.title = "Title is required";
    if (!url.trim()) next.url = "Video URL is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await submitVideo({
        orgSlug,
        title: title.trim(),
        description: description.trim() || undefined,
        url: url.trim(),
        categoryId: categoryId
          ? (categoryId as Id<"categories">)
          : undefined,
        communityIds: selectedCommunityId
          ? [selectedCommunityId as Id<"communities">]
          : undefined,
      });
      toast.success("Video submitted for review!");
      router.push(`/${orgSlug}/videos`);
    } catch {
      toast.error("Failed to submit video. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="rounded-lg border-0 bg-surface-container-lowest editorial-shadow ring-0">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2 italic">
          <Video className="size-5" />
          Video Details
        </CardTitle>
        <CardDescription className="text-on-surface/60">
          Fill in the details below. Your video will be reviewed before publishing.
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
              placeholder="e.g. Community Highlight Reel"
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
            <Label htmlFor="url">
              Video URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errors.url) setErrors((p) => ({ ...p, url: undefined }));
              }}
              aria-invalid={!!errors.url}
            />
            {errors.url && (
              <p className="text-xs text-destructive">{errors.url}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this video is about…"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
              {submitting ? "Submitting…" : "Submit Video"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
