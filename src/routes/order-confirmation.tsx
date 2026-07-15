import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Package, Loader2 } from "lucide-react";
import { formatPKR } from "@/lib/format";
import { getMyOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/order-confirmation")({
  head: () => ({
    meta: [
      { title: "Order confirmed — BachatAtBazaar.pk" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: z.object({ order: z.string().optional() }),
  component: OrderConfirmationPage,
});

const paymentLabels: Record<string, string> = {
  cod: "Cash on Delivery",
  jazzcash: "JazzCash",
  easypaisa: "EasyPaisa",
  bank_transfer: "Bank Transfer",
};

function OrderConfirmationPage() {
  const { order: orderNumber } = Route.useSearch();
  const getMyOrderFn = useServerFn(getMyOrder);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["order", orderNumber],
    queryFn: () => getMyOrderFn({ data: { order_number: orderNumber! } }),
    enabled: !!orderNumber,
  });

  if (!orderNumber) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="font-display text-2xl font-bold">No order found</h1>
        <Link
          to="/shop"
          className="mt-6 inline-flex rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container-page py-24 grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="font-display text-2xl font-bold">
          We couldn't find that order
        </h1>
        <p className="mt-2 text-muted-foreground">
          It may have been placed with a different account.
        </p>
        <Link
          to="/account"
          className="mt-6 inline-flex rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          View my orders
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-16 max-w-3xl">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-display text-3xl md:text-4xl font-bold">
          Thank you for your order!
        </h1>
        <p className="mt-2 text-muted-foreground">
          We've received your order and will start processing it right away.
          {order.payment_method === "bank_transfer" &&
            " We'll email you our bank details shortly for payment."}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-sm font-medium">
          Order #<span className="text-primary">{order.order_number}</span>
        </div>
      </div>

      <div className="mt-10 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold">Order details</h2>
        </div>
        <ul className="divide-y divide-border">
          {order.items.map((it) => (
            <li key={it.id} className="py-3 flex justify-between gap-4 text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-medium line-clamp-1">
                  {it.name_snapshot}
                </div>
                <div className="text-xs text-muted-foreground">
                  Qty {it.quantity} · {formatPKR(it.unit_price)}
                </div>
              </div>
              <div className="font-medium whitespace-nowrap">
                {formatPKR(it.subtotal)}
              </div>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 text-sm border-t border-border pt-4">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatPKR(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd>
              {order.shipping === 0 ? "Free" : formatPKR(order.shipping)}
            </dd>
          </div>
          <div className="flex justify-between text-base font-semibold pt-2 border-t border-border">
            <dt>Total</dt>
            <dd>{formatPKR(order.total)}</dd>
          </div>
          <div className="flex justify-between pt-2">
            <dt className="text-muted-foreground">Payment</dt>
            <dd>
              {paymentLabels[order.payment_method] ?? order.payment_method} ·{" "}
              <span className="capitalize">
                {order.payment_status.replace(/_/g, " ")}
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="capitalize">{order.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Deliver to</dt>
            <dd className="text-right">
              {order.shipping_address.full_name}
              <div className="text-xs text-muted-foreground">
                {order.shipping_address.line1}, {order.shipping_address.city}
              </div>
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/account"
          className="inline-flex rounded-md border border-border px-6 py-3 text-sm font-semibold hover:bg-accent"
        >
          View my orders
        </Link>
        <Link
          to="/shop"
          className="inline-flex rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
