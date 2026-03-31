"use client";

import { useMutation } from "convex/react";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

interface VideoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Doc<"videos"> | null;
  contacts: Doc<"contacts">[];
  categories: Doc<"categories">[];
  communities: Doc<"communities">[];
}

export function VideoForm({
  open,
  onOpenChange,
  editing,
  contacts,
  categories,
  communities,
}: VideoFormProps) {
  const create = useMutation(api.videos.mutations.create);
  const update = useMutation(api.videos.mutations.update);
  const [isPending, setIsPending] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [businessContactId, setBusinessContactId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [communityIds, setCommunityIds] = useState<string[]>([]);

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description ?? "");
      setUrl(editing.url ?? "");
      setBusinessContactId(editing.businessContactId ?? "");
      setCategoryId(editing.categoryId ?? "");
      setCommunityIds((editing.communityIds as string[]) ?? []);
    } else {
      setTitle("");
      setDescription("");
      setUrl("");
      setBusinessContactId("");
      setCategoryId("");
      setCommunityIds([]);
    }
  }, [editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsPending(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        url: url.trim() || undefined,
        businessContactId: businessContactId
          ? (businessContactId as Id<"contacts">)
          : undefined,
        categoryId: categoryId
          ? (categoryId as Id<"categories">)
          : undefined,
        communityIds:
          communityIds.length > 0
            ? (communityIds as Id<"communities">[])
            : undefined,
      };

      if (editing) {
        await update({ id: editing._id, ...payload });
        toast.success("Video updated");
      } else {
        await create(payload);
        toast.success("Video created");
      }
      onOpenChange(false);
    } catch {
      toast.error("Failed to save video");
    } finally {
      setIsPending(false);
    }
  };

  const contactLabel = (c: Doc<"contacts">) =>
    c.company ||
    [c.firstName, c.lastName].filter(Boolean).join(" ") ||
    "Unknown";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit" : "New"} Video</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Video title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              placeholder="YouTube or Vimeo URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Business Contact</Label>
            <Select
              value={businessContactId}
              onValueChange={(v) => v != null && setBusinessContactId(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a contact">
                  {(() => {
                    const match = contacts.find((c) => c._id === businessContactId);
                    return match ? contactLabel(match) : "Select a contact";
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {contacts.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {contactLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={(v) => v != null && setCategoryId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category">
                  {categories.find((c) => c._id === categoryId)?.name ??
                    "Select a category"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {communities.length > 0 && (
            <div className="space-y-2">
              <Label>Communities</Label>
              <div className="space-y-2">
                {communities.map((community) => {
                  const checked = communityIds.includes(community._id);
                  return (
                    <div
                      key={community._id}
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        id={`community-${community._id}`}
                        checked={checked}
                        onCheckedChange={(val) => {
                          if (val) {
                            setCommunityIds((prev) => [
                              ...prev,
                              community._id,
                            ]);
                          } else {
                            setCommunityIds((prev) =>
                              prev.filter((id) => id !== community._id)
                            );
                          }
                        }}
                      />
                      <Label htmlFor={`community-${community._id}`}>
                        {community.name}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Video"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
