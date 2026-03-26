"use client";

import { useOrganization } from "@clerk/nextjs";

/**
 * Returns the current Clerk organization ID with loading state.
 * All Convex queries require orgId for tenant isolation.
 */
export function useOrg() {
  const { organization, isLoaded } = useOrganization();

  return {
    orgId: organization?.id ?? null,
    orgName: organization?.name ?? null,
    isLoaded,
    isReady: isLoaded && !!organization?.id,
  };
}
