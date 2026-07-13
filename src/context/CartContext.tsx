import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { CartSnapshot } from "@/types/catalog";

export type CartItem = CartSnapshot & { quantity: number };

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (snapshot: CartSnapshot, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useLocalStorage<CartItem[]>("bab_cart_v2", []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce(
      (s, i) => s + (i.salePrice ?? i.price) * i.quantity,
      0,
    );
    return {
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal,
      add: (snap, qty = 1) =>
        setItems((prev) => {
          const existing = prev.find((i) => i.id === snap.id);
          if (existing)
            return prev.map((i) =>
              i.id === snap.id
                ? { ...i, ...snap, quantity: i.quantity + qty }
                : i,
            );
          return [...prev, { ...snap, quantity: qty }];
        }),
      remove: (id) => setItems((prev) => prev.filter((i) => i.id !== id)),
      setQty: (id, qty) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((i) => i.id !== id)
            : prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
        ),
      clear: () => setItems([]),
    };
  }, [items, setItems]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
