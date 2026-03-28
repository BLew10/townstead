import { create } from "zustand";
import { persist } from "zustand/middleware";

interface YearState {
  defaultYear: number;
  setDefaultYear: (year: number) => void;
}

export const useYearStore = create<YearState>()(
  persist(
    (set) => ({
      defaultYear: new Date().getFullYear() + 1,
      setDefaultYear: (year) => set({ defaultYear: year }),
    }),
    { name: "planner-default-year" }
  )
);
