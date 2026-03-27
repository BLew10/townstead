"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function usePortalAuth() {
  const { user, isLoaded: clerkLoaded } = useUser();

  const link = useQuery(
    api.clientLinks.queries.getByUserId,
    clerkLoaded && user ? { userId: user.id } : "skip"
  );

  const contact = useQuery(
    api.contacts.queries.getById,
    link?.contactId ? { id: link.contactId } : "skip"
  );

  return {
    contactId: link?.contactId ?? null,
    contact: contact ?? null,
    linkId: link?._id ?? null,
    isLoading: !clerkLoaded || link === undefined,
    isLinked: !!link,
  };
}
