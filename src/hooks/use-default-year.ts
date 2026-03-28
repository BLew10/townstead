"use client";

import { useState, useEffect } from "react";
import { useYearStore } from "@/stores/use-year-store";

const NEXT_YEAR = new Date().getFullYear() + 1;

export function useDefaultYear() {
  const storeYear = useYearStore((s) => s.defaultYear);
  const setDefaultYear = useYearStore((s) => s.setDefaultYear);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  return {
    defaultYear: hydrated ? storeYear : NEXT_YEAR,
    setDefaultYear,
  };
}
