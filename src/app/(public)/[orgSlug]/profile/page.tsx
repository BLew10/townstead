"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useUser, useAuth, SignInButton } from "@clerk/nextjs";
import { format } from "date-fns";
import {
  User,
  Mail,
  CalendarDays,
  Ticket,
  LogIn,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const { isSignedIn } = useAuth();

  return (
    <div className="font-body mx-auto w-full max-w-4xl px-4 py-24 text-on-surface md:px-6">
      {isSignedIn ? (
        <ProfileContent orgSlug={orgSlug} />
      ) : (
        <Card className="rounded-lg border-0 bg-surface-container-lowest editorial-shadow ring-0">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <LogIn className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium text-on-surface">
                Sign in to view your profile
              </p>
              <p className="mt-1 text-sm text-on-surface/60">
                You need an account to see your submissions and claimed coupons
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

function ProfileContent({ orgSlug }: { orgSlug: string }) {
  const { user } = useUser();

  const submissions = useQuery(
    api.public.queries.getUserSubmissions,
    user ? { orgSlug, userId: user.id } : "skip"
  );

  const claims = useQuery(
    api.public.queries.getUserClaims,
    user ? { userId: user.id } : "skip"
  );

  if (!user) return null;

  return (
    <div className="space-y-8">
      <Card className="rounded-lg border-0 bg-surface-container-lowest editorial-shadow ring-0">
        <CardContent className="flex items-center gap-5 pt-6">
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.fullName ?? "Profile"}
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <User className="size-7 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Profile
            </p>
            <h1 className="font-headline mt-1 text-2xl italic tracking-tight">
              {user.fullName ?? "User"}
            </h1>
            {user.primaryEmailAddress && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-on-surface/60">
                <Mail className="size-3.5 shrink-0" />
                {user.primaryEmailAddress.emailAddress}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="submissions">
        <TabsList className="w-full border-0 bg-surface-container-low p-1 text-on-surface/70">
          <TabsTrigger
            value="submissions"
            className="flex-1 gap-1.5 data-active:bg-surface-container-lowest data-active:text-on-surface"
          >
            <CalendarDays className="size-4" />
            My Submissions
            {submissions && submissions.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {submissions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="coupons"
            className="flex-1 gap-1.5 data-active:bg-surface-container-lowest data-active:text-on-surface"
          >
            <Ticket className="size-4" />
            My Coupons
            {claims && claims.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {claims.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="mt-4">
          <SubmissionsList submissions={submissions} />
        </TabsContent>

        <TabsContent value="coupons" className="mt-4">
          <ClaimsList claims={claims} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Submission = {
  _id: string;
  name: string;
  date: number;
  location?: string;
  isApproved?: boolean;
};

function SubmissionsList({
  submissions,
}: {
  submissions: Submission[] | undefined;
}) {
  if (submissions === undefined) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-surface-container-high"
          />
        ))}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <Card className="rounded-lg border-0 bg-surface-container-low editorial-shadow ring-0">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CalendarDays className="size-10 text-on-surface/40" />
          <div>
            <p className="font-medium text-on-surface">No submissions yet</p>
            <p className="mt-1 text-sm text-on-surface/60">
              Events you submit to the community will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((event) => (
        <Card
          key={event._id}
          className="rounded-lg border-0 bg-surface-container-lowest editorial-shadow ring-0 transition-colors hover:bg-surface-container"
        >
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="font-medium text-on-surface">{event.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-on-surface/60">
                <CalendarDays className="size-3.5 shrink-0" />
                {format(new Date(event.date), "MMM d, yyyy")}
                {event.location && ` · ${event.location}`}
              </p>
            </div>
            {event.isApproved === true ? (
              <Badge className="shrink-0 gap-1">
                <CheckCircle2 className="size-3" />
                Approved
              </Badge>
            ) : (
              <Badge variant="secondary" className="shrink-0 gap-1">
                <Clock className="size-3" />
                Pending
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type Claim = {
  _id: string;
  claimedAt: number;
  coupon: {
    title: string;
    description?: string;
    endDate: number;
  } | null;
};

function ClaimsList({ claims }: { claims: Claim[] | undefined }) {
  if (claims === undefined) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-surface-container-high"
          />
        ))}
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <Card className="rounded-lg border-0 bg-surface-container-low editorial-shadow ring-0">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Ticket className="size-10 text-on-surface/40" />
          <div>
            <p className="font-medium text-on-surface">No coupons claimed</p>
            <p className="mt-1 text-sm text-on-surface/60">
              Coupons you claim from local businesses will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {claims.map((claim) => {
        if (!claim.coupon) return null;
        const isExpired = claim.coupon.endDate < Date.now();
        return (
          <Card
            key={claim._id}
            className="rounded-lg border-0 bg-surface-container-lowest editorial-shadow ring-0 transition-colors hover:bg-surface-container"
          >
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="font-medium text-on-surface">{claim.coupon.title}</p>
                {claim.coupon.description && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-on-surface/60">
                    {claim.coupon.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-on-surface/60">
                  Claimed {format(new Date(claim.claimedAt), "MMM d, yyyy")}
                </p>
              </div>
              {isExpired ? (
                <Badge variant="destructive" className="shrink-0">
                  Expired
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0">
                  Valid until{" "}
                  {format(new Date(claim.coupon.endDate), "MMM d, yyyy")}
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
