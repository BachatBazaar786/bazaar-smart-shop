import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { products, type Product } from "@/data/products";

export type CartItem = { productId: string; quantity: number };

type CartContextValue = {
  items: CartItem[];
  detailed: (CartItem & { product: Product })[];
  count: number;
  subtotal: number;
  add: (productId: string, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useLocalStorage<CartItem[]>("bab_cart", []);

  const value = useMemo<CartContextValue>(() => {
    const detailed = items
      .map((i) => {
        const p = products.find((pr) => pr.id === i.productId);
        return p ? { ...i, product: p } : null;
      })
      .filter(Boolean) as (CartItem & { product: Product })[];

    const subtotal = detailed.reduce(
      (s, i) => s + (i.product.salePrice ?? i.product.price) * i.quantity,
      0,
    );

    return {
      items,
      detailed,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal,
      add: (productId, qty = 1) =>
        setItems((prev) => {
          const existing = prev.find((i) => i.productId === productId);
          if (existing)
            return prev.map((i) =>
              i.productId === productId ? { ...i, quantity: i.quantity + qty } : i,
            );
          return [...prev, { productId, quantity: qty }];
        }),
      remove: (productId) => setItems((prev) => prev.filter((i) => i.productId !== productId)),
      setQty: (productId, qty) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((i) => i.productId !== productId)
            : prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
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
