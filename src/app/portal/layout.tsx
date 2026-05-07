"use client";

import { PortalSidebar } from "@/components/portal/sidebar";
import { PortalHeader } from "@/components/portal/header";
import { usePortalAuth } from "@/hooks/use-portal-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const { isLoading, isLinked } = usePortalAuth();

  const isInviteRoute = pathname?.startsWith("/portal/invite/") ?? false;

  useEffect(() => {
    // Don't bounce signed-out users away from the invite page — they need to
    // see it to know what they were invited to before being asked to sign in.
    if (clerkLoaded && !isSignedIn && !isInviteRoute) {
      const returnTo = encodeURIComponent(pathname ?? "/portal");
      router.replace(`/auth/login?redirect_url=${returnTo}`);
    }
  }, [clerkLoaded, isSignedIn, isInviteRoute, pathname, router]);

  // The invite-redeem page must render for users who aren't linked yet —
  // redeeming is what creates the link in the first place.
  if (isInviteRoute) {
    return <>{children}</>;
  }

  if (!clerkLoaded || !isSignedIn) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
      </div>
    );
  }

  if (!isLinked) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8">
        <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight">
          Account Not Linked
        </h1>
        <p className="mt-2 max-w-md text-center text-muted-foreground">
          Your account hasn&apos;t been connected to a client profile yet.
          If you received an invite link, use it to connect your account.
          Otherwise, contact your account administrator to request portal access.
        </p>
        <div className="mt-6">
          <SignOutButton redirectUrl="/">
            <Button>Sign Out</Button>
          </SignOutButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <PortalSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PortalHeader />
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
