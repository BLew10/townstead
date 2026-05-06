"use client";

import { useAuth, useOrganizationList } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AuthRedirectPage() {
  const { isLoaded, isSignedIn, orgRole } = useAuth();
  const router = useRouter();

  // Some users belong to an org but haven't had one activated on the session
  // (multi-org accounts, fresh sign-ups via invitation, etc). Pull the
  // membership list so we can auto-activate an admin org if one exists.
  const { isLoaded: orgListLoaded, userMemberships, setActive } =
    useOrganizationList({ userMemberships: { infinite: true } });

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

    // No active admin org? See if the user is a member of one and activate it.
    if (!orgRole && orgListLoaded && setActive) {
      const adminMembership = userMemberships?.data?.find(
        (m) => m.role === "org:admin"
      );
      if (adminMembership) {
        void setActive({ organization: adminMembership.organization.id });
        return; // re-render once orgRole updates
      }
    }

    // Wait for grant query to resolve before deciding
    if (grant === undefined) return;

    if (grant && grant.role === "contact" && grant.isActive) {
      router.replace("/portal");
      return;
    }

    router.replace("/");
  }, [
    isLoaded,
    isSignedIn,
    orgRole,
    grant,
    router,
    orgListLoaded,
    userMemberships,
    setActive,
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
