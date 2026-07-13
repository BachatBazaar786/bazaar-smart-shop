import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Package, Search } from "lucide-react";

export const Route = createFileRoute("/track-order")({
  head: () => ({
    meta: [
      { title: "Track Your Order — BachatAtBazaar.pk" },
      { name: "description", content: "Track the status of your BachatAtBazaar order using your order number and email." },
      { property: "og:title", content: "Track Your Order — BachatAtBazaar.pk" },
      { property: "og:description", content: "Track the status of your BachatAtBazaar order using your order number and email." },
    ],
  }),
  component: TrackOrderPage,
});

function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<null | "not-found" | "searching">(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("searching");
    setTimeout(() => setStatus("not-found"), 600);
  };

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
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary h-11 text-sm font-medium text-primary-foreground hover:bg-primary-dark"
          >
            <Search className="h-4 w-4" />
            Track order
          </button>
        </form>

        {status === "not-found" && (
          <div className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground text-center">
            We couldn't find an order matching those details. Please double-check your order number and email, or{" "}
            <a href="/contact" className="text-primary underline underline-offset-2">contact support</a>.
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your order number was sent to your email after checkout and is shown on the order confirmation page.
        </p>
      </div>
    </div>
  );
}
