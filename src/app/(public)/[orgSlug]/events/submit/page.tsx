"use client";

import { use, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useUser, useAuth, SignInButton } from "@clerk/nextjs";
import { CalendarPlus, LogIn } from "lucide-react";
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

export default function SubmitEventPage({
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
          Events
        </p>
        <h1 className="font-headline mt-2 text-3xl italic tracking-tight md:text-4xl">
          Submit an Event
        </h1>
        <p className="mt-2 text-on-surface/60">
          Share a community event for review and publication
        </p>
      </div>

      {isSignedIn ? (
        <EventSubmissionForm orgSlug={orgSlug} />
      ) : (
        <Card className="rounded-lg border-0 bg-surface-container-lowest editorial-shadow ring-0">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <LogIn className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium text-on-surface">
                Sign in to submit an event
              </p>
              <p className="mt-1 text-sm text-on-surface/60">
                You need an account to submit community events
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

function EventSubmissionForm({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const { user } = useUser();
  const submitEvent = useMutation(api.public.mutations.submitEvent);
  const categories = useQuery(api.public.queries.listCategories, {
    orgSlug,
    type: "event",
  });
  const { communities } = useCommunityFilter(orgSlug);

  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("");

  const [errors, setErrors] = useState<{ name?: string; date?: string }>({});

  function validate(): boolean {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Event name is required";
    if (!date) next.date = "Date is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate() || !user) return;

    setSubmitting(true);
    try {
      await submitEvent({
        orgSlug,
        name: name.trim(),
        description: description.trim() || undefined,
        date: new Date(date).getTime(),
        endDate: endDate ? new Date(endDate).getTime() : undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        location: location.trim() || undefined,
        categoryId: categoryId ? (categoryId as Id<"categories">) : undefined,
        communityIds: selectedCommunityId
          ? [selectedCommunityId as Id<"communities">]
          : undefined,
      });
      toast.success("Event submitted for review!");
      router.push(`/${orgSlug}/events`);
    } catch {
      toast.error("Failed to submit event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="rounded-lg border-0 bg-surface-container-lowest editorial-shadow ring-0">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2 italic">
          <CalendarPlus className="size-5" />
          Event Details
        </CardTitle>
        <CardDescription className="text-on-surface/60">
          Fill in the details below. Your event will be reviewed before
          publishing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Event Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Community Cleanup Day"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
              }}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell people what this event is about…"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (errors.date)
                    setErrors((p) => ({ ...p, date: undefined }));
                }}
                aria-invalid={!!errors.date}
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={date}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g. City Park Pavilion"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {categories && categories.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select
                value={categoryId || null}
                onValueChange={(val) =>
                  setCategoryId(val ?? "")
                }
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
                onValueChange={(val) =>
                  setSelectedCommunityId(val ?? "")
                }
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
              {submitting ? "Submitting…" : "Submit Event"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
