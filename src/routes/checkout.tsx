import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatPKR } from "@/lib/format";
import { Textarea } from "@/components/ui/textarea";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — BachatAtBazaar.pk" }, { name: "robots", content: "noindex" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [payment, setPayment] = useState("cod");
  const [submitting, setSubmitting] = useState(false);
  const shipping = cart.subtotal > 3000 || cart.subtotal === 0 ? 0 : 250;
  const total = cart.subtotal + shipping;

  if (cart.detailed.length === 0) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="font-display text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Add some products before checking out.</p>
        <Link to="/shop" className="mt-6 inline-flex rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Go to shop</Link>
      </div>
    );
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const orderId = `BAB${Math.floor(100000 + Math.random() * 900000)}`;
    const summary = {
      orderId,
      total,
      shipping,
      subtotal: cart.subtotal,
      payment,
      name: form.get("name"),
      email: form.get("email"),
      city: form.get("city"),
      items: cart.detailed.map((i) => ({ name: i.product.name, quantity: i.quantity, price: i.product.salePrice ?? i.product.price })),
    };
    try {
      localStorage.setItem("bab_last_order", JSON.stringify(summary));
    } catch {}
    cart.clear();
    navigate({ to: "/order-confirmation", search: { id: orderId } });
  };

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: "Cart", to: "/cart" }, { label: "Checkout" }]} />
      <h1 className="font-display text-3xl md:text-4xl font-bold">Checkout</h1>

      <form onSubmit={onSubmit} className="mt-6 grid lg:grid-cols-[1fr_400px] gap-8 items-start">
        <div className="space-y-8">
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-lg font-bold">Contact information</h2>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div><Label htmlFor="name">Full name</Label><Input id="name" name="name" required /></div>
              <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
              <div><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" type="tel" required placeholder="03XX-XXXXXXX" /></div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-lg font-bold">Shipping address</h2>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="sm:col-span-2"><Label htmlFor="address">Street address</Label><Input id="address" name="address" required /></div>
              <div><Label htmlFor="city">City</Label><Input id="city" name="city" required /></div>
              <div><Label htmlFor="province">Province</Label><Input id="province" name="province" required defaultValue="Punjab" /></div>
              <div><Label htmlFor="postal">Postal code</Label><Input id="postal" name="postal" /></div>
              <div><Label htmlFor="country">Country</Label><Input id="country" name="country" defaultValue="Pakistan" readOnly /></div>
              <div className="sm:col-span-2"><Label htmlFor="notes">Order notes (optional)</Label><Textarea id="notes" name="notes" rows={3} /></div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-lg font-bold">Payment method</h2>
            <RadioGroup value={payment} onValueChange={setPayment} className="mt-4 space-y-3">
              {[
                { id: "cod", label: "Cash on Delivery", desc: "Pay in cash when your order arrives." },
                { id: "jazzcash", label: "JazzCash", desc: "Pay securely from your JazzCash mobile wallet." },
                { id: "easypaisa", label: "EasyPaisa", desc: "Pay via EasyPaisa mobile wallet." },
                { id: "bank", label: "Bank transfer", desc: "We'll email you our bank details after checkout." },
              ].map((opt) => (
                <label key={opt.id} htmlFor={opt.id} className={`flex items-start gap-3 rounded-md border p-4 cursor-pointer transition-colors ${payment === opt.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"}`}>
                  <RadioGroupItem value={opt.id} id={opt.id} className="mt-1" />
                  <div>
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-sm text-muted-foreground">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </section>
        </div>

        <aside className="rounded-lg border border-border bg-card p-6 sticky top-24">
          <h2 className="font-display text-lg font-bold">Order summary</h2>
          <ul className="mt-4 divide-y divide-border">
            {cart.detailed.map((i) => (
              <li key={i.productId} className="py-3 flex gap-3 items-center">
                <div className="h-14 w-14 shrink-0 rounded-md overflow-hidden bg-muted"><img src={i.product.images[0]} alt="" className="h-full w-full object-cover" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium line-clamp-1">{i.product.name}</div>
                  <div className="text-xs text-muted-foreground">Qty {i.quantity}</div>
                </div>
                <div className="text-sm font-medium">{formatPKR((i.product.salePrice ?? i.product.price) * i.quantity)}</div>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 text-sm border-t border-border pt-4">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPKR(cart.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>{shipping === 0 ? <span className="text-primary">Free</span> : formatPKR(shipping)}</dd></div>
            <div className="flex justify-between text-base font-semibold pt-2 border-t border-border"><dt>Total</dt><dd>{formatPKR(total)}</dd></div>
          </dl>
          <Button type="submit" disabled={submitting} className="mt-5 w-full bg-primary hover:bg-primary-dark" size="lg">
            <Lock className="h-4 w-4 mr-2" /> {submitting ? "Placing order..." : `Place order · ${formatPKR(total)}`}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground text-center">By placing your order you agree to our terms.</p>
        </aside>
      </form>
    </div>
  );
}
