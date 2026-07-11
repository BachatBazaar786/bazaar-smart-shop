import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { CheckCircle2, Package } from "lucide-react";
import { formatPKR } from "@/lib/format";

export const Route = createFileRoute("/order-confirmation")({
  head: () => ({ meta: [{ title: "Order confirmed — BachatAtBazaar.pk" }, { name: "robots", content: "noindex" }] }),
  validateSearch: z.object({ id: z.string().optional() }),
  component: OrderConfirmationPage,
});

type Order = {
  orderId: string;
  total: number;
  shipping: number;
  subtotal: number;
  payment: string;
  name: string;
  email: string;
  city: string;
  items: { name: string; quantity: number; price: number }[];
};

function OrderConfirmationPage() {
  const { id } = Route.useSearch();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bab_last_order");
      if (raw) setOrder(JSON.parse(raw));
    } catch {}
  }, []);

  return (
    <div className="container-page py-16 max-w-3xl">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-display text-3xl md:text-4xl font-bold">Thank you for your order!</h1>
        <p className="mt-2 text-muted-foreground">A confirmation has been sent to your email. We'll be in touch shortly.</p>
        {id && <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-sm font-medium">Order ID: <span className="text-primary">{id}</span></div>}
      </div>

      {order && (
        <div className="mt-10 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4"><Package className="h-5 w-5 text-primary" /><h2 className="font-display text-xl font-bold">Order details</h2></div>
          <ul className="divide-y divide-border">
            {order.items.map((it, i) => (
              <li key={i} className="py-3 flex justify-between text-sm">
                <span>{it.name} × {it.quantity}</span>
                <span className="font-medium">{formatPKR(it.price * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 text-sm border-t border-border pt-4">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPKR(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>{order.shipping === 0 ? "Free" : formatPKR(order.shipping)}</dd></div>
            <div className="flex justify-between text-base font-semibold pt-2 border-t border-border"><dt>Total</dt><dd>{formatPKR(order.total)}</dd></div>
            <div className="flex justify-between pt-2"><dt className="text-muted-foreground">Payment</dt><dd className="capitalize">{order.payment}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Deliver to</dt><dd>{order.name} · {order.city}</dd></div>
          </dl>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link to="/shop" className="inline-flex rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-dark">Continue shopping</Link>
      </div>
    </div>
  );
}
