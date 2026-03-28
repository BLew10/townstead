"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, Building2, User } from "lucide-react";
import { useState } from "react";

export default function PortalInviteRedeemPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { user, isLoaded: clerkLoaded } = useUser();

  const validation = useQuery(
    api.portalInvites.queries.validateToken,
    token ? { token } : "skip"
  );

  const redeemInvite = useMutation(api.portalInvites.mutations.redeem);

  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!clerkLoaded || validation === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="mx-auto h-12 w-12 rounded-full" />
            <Skeleton className="mx-auto h-6 w-48" />
            <Skeleton className="mx-auto h-4 w-64" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!validation.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="text-xl font-bold tracking-tight">
              Invalid Invite
            </h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {validation.error}
            </p>
            <Button variant="outline" onClick={() => router.push("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (redeemed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <h1 className="text-xl font-bold tracking-tight">
              Welcome to the Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              Your account has been connected. Redirecting...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userEmail =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress;

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <Building2 className="mx-auto h-10 w-10 text-violet-500 mb-2" />
          <CardTitle className="text-xl">Client Portal Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              You&apos;ve been invited to access
            </p>
            <p className="text-lg font-semibold">{validation.orgName}</p>
            {validation.companyName && (
              <p className="text-sm text-muted-foreground">
                as {validation.companyName}
              </p>
            )}
          </div>

          <div className="rounded-md border p-3 bg-muted/50">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.fullName ?? "Your Account"}
                </p>
                {userEmail && (
                  <p className="text-xs text-muted-foreground truncate">
                    {userEmail}
                  </p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full"
              disabled={redeeming}
              onClick={async () => {
                try {
                  setRedeeming(true);
                  setError(null);
                  await redeemInvite({ token });
                  setRedeemed(true);
                  setTimeout(() => router.push("/portal"), 1500);
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Failed to accept invite"
                  );
                } finally {
                  setRedeeming(false);
                }
              }}
            >
              {redeeming ? "Connecting..." : "Accept Invitation"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              This will connect your account to the client portal.
              You can sign out and use a different account if needed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
