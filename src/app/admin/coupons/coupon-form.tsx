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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ImageUpload } from "@/components/shared/image-upload";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

function timestampToDateString(ts: number | undefined): string {
  if (!ts) return "";
  return new Date(ts).toISOString().split("T")[0];
}

function dateStringToTimestamp(dateStr: string): number {
  return new Date(dateStr).getTime();
}

interface CouponFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Doc<"coupons"> | null;
  contacts: Doc<"contacts">[];
  communities: Doc<"communities">[];
}

export function CouponForm({
  open,
  onOpenChange,
  editing,
  contacts,
  communities,
}: CouponFormProps) {
  const create = useMutation(api.coupons.mutations.create);
  const update = useMutation(api.coupons.mutations.update);
  const generateUploadUrl = useMutation(
    api.coupons.mutations.generateUploadUrl
  );
  const [isPending, setIsPending] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [businessContactId, setBusinessContactId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quantityLimit, setQuantityLimit] = useState("");
  const [terms, setTerms] = useState("");
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[]>(
    []
  );
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
      setTitle(editing.title);
      setDescription(editing.description ?? "");
      setBusinessContactId(editing.businessContactId);
      setStartDate(timestampToDateString(editing.startDate));
      setEndDate(timestampToDateString(editing.endDate));
      setQuantityLimit(
        editing.quantityLimit != null ? String(editing.quantityLimit) : ""
      );
      setTerms(editing.terms ?? "");
      setSelectedCommunityIds(
        (editing.communityIds as string[] | undefined) ?? []
      );
      setImageFileId(
        (editing as Record<string, unknown>).imageFileId as
          | Id<"_storage">
          | undefined
      );
    } else {
      setTitle("");
      setDescription("");
      setBusinessContactId("");
      setStartDate("");
      setEndDate("");
      setQuantityLimit("");
      setTerms("");
      setSelectedCommunityIds([]);
      setImageFileId(undefined);
    }
  }, [editing]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessContactId || !startDate || !endDate) return;

    setIsPending(true);
    try {
      const payload = {
        businessContactId: businessContactId as Id<"contacts">,
        title,
        description: description || undefined,
        startDate: dateStringToTimestamp(startDate),
        endDate: dateStringToTimestamp(endDate),
        quantityLimit: quantityLimit ? Number(quantityLimit) : undefined,
        terms: terms || undefined,
        communityIds:
          selectedCommunityIds.length > 0
            ? (selectedCommunityIds as Id<"communities">[])
            : undefined,
        imageFileId,
      };

      if (editing) {
        await update({ id: editing._id, ...payload });
        toast.success("Coupon updated");
      } else {
        await create(payload);
        toast.success("Coupon created");
      }
      onOpenChange(false);
    } catch {
      toast.error("Failed to save coupon");
    } finally {
      setIsPending(false);
    }
  };

  const toggleCommunity = (communityId: string) => {
    setSelectedCommunityIds((prev) =>
      prev.includes(communityId)
        ? prev.filter((id) => id !== communityId)
        : [...prev, communityId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit" : "New"} Coupon</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Coupon title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Coupon description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Image</Label>
            <ImageUpload
              preset="coupon"
              onUpload={handleImageUpload}
              onRemove={() => setImageFileId(undefined)}
              currentImageUrl={imageUrl ?? null}
              uploading={uploadingImage}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessContactId">Business</Label>
            <Select
              value={businessContactId}
              onValueChange={setBusinessContactId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a business">
                  {contacts.find((c) => c._id === businessContactId)?.company ??
                    "Select a business"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact._id} value={contact._id}>
                    {contact.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantityLimit">Quantity Limit</Label>
            <Input
              id="quantityLimit"
              type="number"
              placeholder="Unlimited"
              value={quantityLimit}
              onChange={(e) => setQuantityLimit(e.target.value)}
              min={0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Terms</Label>
            <Textarea
              id="terms"
              placeholder="Coupon terms and conditions..."
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
          </div>

          {communities.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Communities
                </h3>
                <div className="space-y-2">
                  {communities.map((community) => (
                    <div
                      key={community._id}
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        id={`community-${community._id}`}
                        checked={selectedCommunityIds.includes(community._id)}
                        onCheckedChange={() => toggleCommunity(community._id)}
                      />
                      <Label htmlFor={`community-${community._id}`}>
                        {community.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
