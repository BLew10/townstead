"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function usePortalAuth() {
  const { user, isLoaded: clerkLoaded } = useUser();

  const grant = useQuery(
    api.orgPermissions.queries.getMyGrant,
    clerkLoaded && user ? {} : "skip"
  );

  const contact = useQuery(
    api.contacts.queries.getById,
    grant?.contactId ? { id: grant.contactId } : "skip"
  );

  const permissions = useQuery(
    api.portal.queries.getMyPermissions,
    clerkLoaded && user ? {} : "skip"
  );

  return {
    contactId: grant?.contactId ?? null,
    contact: contact ?? null,
    grantId: grant?._id ?? null,
    isLoading: !clerkLoaded || grant === undefined,
    isLinked: !!grant && grant.role === "contact" && grant.isActive,
    permissions: permissions ?? [],
  };
}
