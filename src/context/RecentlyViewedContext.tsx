import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { ProductListItem } from "@/types/catalog";

type Ctx = {
  items: ProductListItem[];
  add: (item: ProductListItem) => void;
  clear: () => void;
};

const RecentContext = createContext<Ctx | null>(null);

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useLocalStorage<ProductListItem[]>("bab_recent_v2", []);
  const value = useMemo<Ctx>(
    () => ({
      items,
      add: (item) =>
        setItems((prev) => {
          const next = [item, ...prev.filter((x) => x.id !== item.id)];
          return next.slice(0, 8);
        }),
      clear: () => setItems([]),
    }),
    [items, setItems],
  );
  return <RecentContext.Provider value={value}>{children}</RecentContext.Provider>;
}

export function useRecentlyViewed() {
  const ctx = useContext(RecentContext);
  if (!ctx) throw new Error("useRecentlyViewed must be used within RecentlyViewedProvider");
  return ctx;
}
