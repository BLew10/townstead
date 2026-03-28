import { useMemo } from "react";

/**
 * Returns a stable timestamp (midnight today) for passing to Convex queries.
 * Convex caches query results deterministically — using Date.now() inside a query
 * defeats caching because the value changes every millisecond. By rounding to
 * midnight and memoizing, the query args stay stable for the entire session,
 * allowing Convex to serve cached results until underlying data changes.
 */
export function useStableNow(): number {
  return useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
}
