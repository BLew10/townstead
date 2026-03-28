"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/shared/image-upload";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface CommunityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Doc<"communities"> | null;
  calendarEditions: Doc<"calendarEditions">[];
}

export function CommunityForm({
  open,
  onOpenChange,
  editing,
  calendarEditions,
}: CommunityFormProps) {
  const create = useMutation(api.communities.mutations.create);
  const update = useMutation(api.communities.mutations.update);
  const generateUploadUrl = useMutation(
    api.communities.mutations.generateUploadUrl
  );

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedEditions, setSelectedEditions] = useState<
    Id<"calendarEditions">[]
  >([]);
  const [isPending, setIsPending] = useState(false);
  const [imageFileId, setImageFileId] = useState<Id<"_storage"> | undefined>(
    undefined
  );
  const [uploadingImage, setUploadingImage] = useState(false);

  const imageUrl = useQuery(
    api.storage.getUrl,
    imageFileId ? { storageId: imageFileId } : "skip"
  );

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setSlug(editing.slug);
      setSlugManuallyEdited(true);
      setDescription(editing.description ?? "");
      setSelectedEditions([...editing.calendarEditionIds]);
      setImageFileId(
        (editing as Record<string, unknown>).imageFileId as
          | Id<"_storage">
          | undefined
      );
    } else {
      setName("");
      setSlug("");
      setSlugManuallyEdited(false);
      setDescription("");
      setSelectedEditions([]);
      setImageFileId(undefined);
    }
  }, [editing]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setSlug(slugify(value));
  }

  function toggleEdition(editionId: Id<"calendarEditions">) {
    setSelectedEditions((prev) =>
      prev.includes(editionId)
        ? prev.filter((id) => id !== editionId)
        : [...prev, editionId]
    );
  }

  const handleImageUpload = useCallback(
    async (file: File) => {
      setUploadingImage(true);
      try {
        const url = await generateUploadUrl();
        const result = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        setImageFileId(storageId as Id<"_storage">);
      } catch {
        toast.error("Failed to upload image.");
      } finally {
        setUploadingImage(false);
      }
    },
    [generateUploadUrl]
  );

  async function handleSubmit() {
    if (!name.trim() || !slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }

    setIsPending(true);
    try {
      if (editing) {
        await update({
          id: editing._id,
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          calendarEditionIds: selectedEditions,
          imageFileId,
        });
        toast.success("Community updated");
      } else {
        await create({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          calendarEditionIds: selectedEditions,
          imageFileId,
        });
        toast.success("Community created");
      }
      onOpenChange(false);
    } catch {
      toast.error("Failed to save community");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit" : "New"} Community
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="community-name">Name</Label>
            <Input
              id="community-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Downtown Community"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="community-slug">Slug</Label>
            <Input
              id="community-slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="downtown-community"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="community-description">Description</Label>
            <Textarea
              id="community-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this community"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Image</Label>
            <ImageUpload
              preset="card"
              onUpload={handleImageUpload}
              onRemove={() => setImageFileId(undefined)}
              currentImageUrl={imageUrl ?? null}
              uploading={uploadingImage}
            />
          </div>

          {calendarEditions.length > 0 && (
            <div className="space-y-2">
              <Label>Calendar Editions</Label>
              <div className="space-y-3">
                {calendarEditions.map((edition) => (
                  <div key={edition._id} className="flex items-center gap-2">
                    <Checkbox
                      id={`edition-${edition._id}`}
                      checked={selectedEditions.includes(edition._id)}
                      onCheckedChange={() => toggleEdition(edition._id)}
                    />
                    <Label
                      htmlFor={`edition-${edition._id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {edition.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !name.trim() || !slug.trim()}
            >
              {isPending ? "Saving..." : "Save Community"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
