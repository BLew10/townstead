import { MapPin } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

interface CommunityBadgesProps {
  communityIds?: Id<"communities">[];
  communityMap: Map<string, string>;
}

export function CommunityBadges({
  communityIds,
  communityMap,
}: CommunityBadgesProps) {
  if (!communityIds?.length || communityMap.size === 0) return null;

  const names = communityIds
    .map((id) => communityMap.get(id))
    .filter(Boolean) as string[];

  if (names.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {names.map((name) => (
        <span
          key={name}
          className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary"
        >
          <MapPin className="size-2.5" strokeWidth={2} />
          {name}
        </span>
      ))}
    </div>
  );
}
