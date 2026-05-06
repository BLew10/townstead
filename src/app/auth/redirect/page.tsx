"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AuthRedirectPage() {
  const { isLoaded, isSignedIn, orgRole } = useAuth();
  const router = useRouter();

  const grant = useQuery(
    api.orgPermissions.queries.getMyGrant,
    isLoaded && isSignedIn ? {} : "skip"
  );

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/auth/login");
      return;
    }

    if (orgRole === "org:admin") {
      router.replace("/admin");
      return;
    }

    // Wait for grant query to resolve before deciding
    if (grant === undefined) return;

    if (grant && grant.role === "contact" && grant.isActive) {
      router.replace("/portal");
      return;
    }

    router.replace("/");
  }, [isLoaded, isSignedIn, orgRole, grant, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
