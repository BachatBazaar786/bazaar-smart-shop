import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { products, type Product } from "@/data/products";

type Ctx = {
  items: Product[];
  add: (id: string) => void;
};

const RecentContext = createContext<Ctx | null>(null);

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useLocalStorage<string[]>("bab_recent", []);
  const value = useMemo<Ctx>(
    () => ({
      items: ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[],
      add: (id) =>
        setIds((prev) => {
          const next = [id, ...prev.filter((x) => x !== id)];
          return next.slice(0, 8);
        }),
    }),
    [ids, setIds],
  );
  return <RecentContext.Provider value={value}>{children}</RecentContext.Provider>;
}

export function useRecentlyViewed() {
  const ctx = useContext(RecentContext);
  if (!ctx) throw new Error("useRecentlyViewed must be used within RecentlyViewedProvider");
  return ctx;
}
