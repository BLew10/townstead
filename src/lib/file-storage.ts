"use client";

// NOTE: This file requires `npx convex dev` to have been run.
// The `convex/_generated/` directory is created during Convex setup.
// Nothing in Phase 1 imports this file, so it won't cause build errors.

// TODO: Uncomment these imports after running `npx convex dev`
// import { useQuery } from "convex/react";
// import { api } from "../../convex/_generated/api";
// import type { Id } from "../../convex/_generated/dataModel";
//
// export function useFileUrl(
//   storageId: Id<"_storage"> | undefined | null
// ): string | undefined | null {
//   const url = useQuery(
//     api.files.getUrl,
//     storageId ? { storageId } : "skip"
//   );
//   if (!storageId) return null;
//   return url;
// }

export {};
