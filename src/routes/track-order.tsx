import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Package, Search, Loader2 } from "lucide-react";
import { trackOrderPublic } from "@/lib/orders.functions";
import { formatPKR } from "@/lib/format";

export const Route = createFileRoute("/track-order")({
  head: () => ({
    meta: [
      { title: "Track your order — BachatAtBazaar.pk" },
      { name: "description", content: "Check the live status of your BachatAtBazaar.pk order using your order number and the email you placed it with." },
      { property: "og:title", content: "Track your order — BachatAtBazaar.pk" },
      { property: "og:description", content: "Look up your BachatAtBazaar order status with your order number and email." },
      { property: "og:url", content: "https://bazaar-smart-shop.lovable.app/track-order" },
    ],
    links: [{ rel: "canonical", href: "https://bazaar-smart-shop.lovable.app/track-order" }],
  }),
  component: TrackOrderPage,
});


function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const trackFn = useServerFn(trackOrderPublic);
  const track = useMutation({
    mutationFn: (input: { order_number: string; email: string }) =>
      trackFn({ data: input }),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    track.mutate({ order_number: orderNumber.trim(), email: email.trim() });
  };

  const result = track.data;

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Track Order" }]} />
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary mb-4">
            <Package className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Track Your Order</h1>
          <p className="mt-2 text-muted-foreground">
            Enter your order number and the email you used at checkout.
          </p>
        </div>

        <form onSubmit={onSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Order number</label>
            <input
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. BAB-10245"
              className="w-full rounded-md border border-border bg-background px-3 h-11 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email address</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-border bg-background px-3 h-11 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={track.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary h-11 text-sm font-medium text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
          >
            {track.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Track order
          </button>
        </form>

        {track.isError && (
          <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive text-center">
            Something went wrong. Please try again.
          </div>
        )}

        {result && !result.found && (
          <div className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground text-center">
            We couldn't find an order matching those details. Please double-check your order number and email, or{" "}
            <a href="/contact" className="text-primary underline underline-offset-2">contact support</a>.
          </div>
        )}

        {result && result.found && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Order</div>
                <div className="font-display text-lg font-bold">{result.order.order_number}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
                <div className="font-display text-lg font-bold">{formatPKR(result.order.total)}</div>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium capitalize">{result.order.status}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Payment</dt>
                <dd className="font-medium capitalize">{result.order.payment_status.replace(/_/g, " ")}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Placed on</dt>
                <dd className="font-medium">{new Date(result.order.created_at).toLocaleString()}</dd>
              </div>
            </dl>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your order number was sent to your email after checkout and is shown on the order confirmation page.
        </p>
      </div>
    </div>
  );
}
