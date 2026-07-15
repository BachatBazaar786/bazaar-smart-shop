import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart } from "@/context/CartContext";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { QuantitySelector } from "@/components/product/QuantitySelector";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@/lib/format";
import { ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — BachatAtBazaar.pk" },
      { name: "description", content: "Review the items in your BachatAtBazaar.pk cart, adjust quantities and continue to secure checkout." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});


function CartPage() {
  const cart = useCart();
  const shipping = cart.subtotal > 3000 || cart.subtotal === 0 ? 0 : 250;
  const total = cart.subtotal + shipping;

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: "Cart" }]} />
      <h1 className="font-display text-3xl md:text-4xl font-bold">Your cart</h1>

      {cart.items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<ShoppingBag className="h-7 w-7" />}
            title="Your cart is empty"
            description="Add products to your cart to see them here."
            action={<Link to="/shop" className="inline-flex rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-dark">Continue shopping</Link>}
          />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-8 mt-6">
          <div className="rounded-lg border border-border bg-card">
            <ul className="divide-y divide-border">
              {cart.items.map((item) => {
                const price = item.salePrice ?? item.price;
                return (
                  <li key={item.id} className="p-4 flex gap-4">
                    <Link to="/product/$slug" params={{ slug: item.slug }} className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <Link to="/product/$slug" params={{ slug: item.slug }} className="font-medium hover:text-primary line-clamp-2">
                            {item.name}
                          </Link>
                        </div>
                        <button onClick={() => cart.remove(item.id)} aria-label="Remove" className="text-muted-foreground hover:text-destructive shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                        <QuantitySelector value={item.quantity} onChange={(n) => cart.setQty(item.id, n)} max={item.stock} />
                        <div className="text-right">
                          <div className="font-semibold">{formatPKR(price * item.quantity)}</div>
                          <div className="text-xs text-muted-foreground">{formatPKR(price)} each</div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="p-4 flex items-center justify-between border-t border-border">
              <Button variant="ghost" onClick={cart.clear} className="text-muted-foreground">Clear cart</Button>
              <Link to="/shop" className="text-sm text-primary font-medium hover:text-primary-dark">Continue shopping</Link>
            </div>
          </div>

          <aside className="rounded-lg border border-border bg-card p-6 h-fit sticky top-24">
            <h2 className="font-display text-xl font-bold">Order summary</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal ({cart.count} item{cart.count !== 1 && "s"})</dt><dd className="font-medium">{formatPKR(cart.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd className="font-medium">{shipping === 0 ? <span className="text-primary">Free</span> : formatPKR(shipping)}</dd></div>
              {shipping > 0 && (
                <p className="text-xs text-muted-foreground">Add {formatPKR(3000 - cart.subtotal)} more for free shipping.</p>
              )}
            </dl>
            <div className="mt-4 pt-4 border-t border-border flex justify-between text-base font-semibold">
              <span>Total</span><span>{formatPKR(total)}</span>
            </div>
            <Link to="/checkout" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-dark">
              Proceed to checkout <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-xs text-muted-foreground text-center">Secure checkout · Nationwide delivery</p>
          </aside>
        </div>
      )}
    </div>
  );
}
