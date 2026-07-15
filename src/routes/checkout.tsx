import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { formatPKR } from "@/lib/format";
import { createOrder } from "@/lib/orders.functions";
import { listMyAddresses } from "@/lib/profile.functions";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — BachatAtBazaar.pk" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

type PaymentMethod = "cod" | "jazzcash" | "easypaisa" | "bank_transfer";

function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new">("new");

  const addressesFn = useServerFn(listMyAddresses);
  const addresses = useQuery({
    queryKey: ["me", "addresses"],
    queryFn: () => addressesFn(),
    enabled: isAuthenticated,
  });

  const createOrderFn = useServerFn(createOrder);
  const orderMutation = useMutation({
    mutationFn: createOrderFn,
    onSuccess: (res) => {
      cart.clear();
      navigate({
        to: "/order-confirmation",
        search: { order: res.order_number },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({
        to: "/auth",
        search: { redirect: "/checkout" },
        replace: true,
      });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const list = addresses.data;
    if (list && list.length > 0 && selectedAddressId === "new") {
      const def = list.find((a) => a.is_default) ?? list[0];
      setSelectedAddressId(def.id);
    }
  }, [addresses.data, selectedAddressId]);

  const shipping = cart.subtotal >= 3000 || cart.subtotal === 0 ? 0 : 250;
  const total = cart.subtotal + shipping;

  if (cart.items.length === 0 && !orderMutation.isPending) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="font-display text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">
          Add some products before checking out.
        </p>
        <Link
          to="/shop"
          className="mt-6 inline-flex rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Go to shop
        </Link>
      </div>
    );
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="container-page py-24 grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const savedAddresses = addresses.data ?? [];
  const usingSaved = selectedAddressId !== "new";
  const savedAddress = usingSaved
    ? savedAddresses.find((a) => a.id === selectedAddressId)
    : null;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const shippingAddress = savedAddress
      ? {
          full_name: savedAddress.full_name,
          phone: savedAddress.phone,
          email: (form.get("email") as string) || user?.email || "",
          line1: savedAddress.line1,
          line2: savedAddress.line2 ?? "",
          city: savedAddress.city,
          province: savedAddress.province,
          postal_code: savedAddress.postal_code ?? "",
          country: savedAddress.country,
        }
      : {
          full_name: String(form.get("name") ?? "").trim(),
          phone: String(form.get("phone") ?? "").trim(),
          email: String(form.get("email") ?? user?.email ?? "").trim(),
          line1: String(form.get("address") ?? "").trim(),
          line2: "",
          city: String(form.get("city") ?? "").trim(),
          province: String(form.get("province") ?? "").trim(),
          postal_code: String(form.get("postal") ?? "").trim(),
          country: "Pakistan",
        };

    orderMutation.mutate({
      data: {
        items: cart.items.map((i) => ({
          product_id: i.id,
          quantity: i.quantity,
        })),
        shipping_address: shippingAddress,
        payment_method: payment,
        notes: String(form.get("notes") ?? ""),
      },
    });
  };

  return (
    <div className="container-page py-8">
      <Breadcrumbs
        items={[{ label: "Cart", to: "/cart" }, { label: "Checkout" }]}
      />
      <h1 className="font-display text-3xl md:text-4xl font-bold">Checkout</h1>

      <form
        onSubmit={onSubmit}
        className="mt-6 grid lg:grid-cols-[1fr_400px] gap-8 items-start"
      >
        <div className="space-y-8">
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-lg font-bold">Contact</h2>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="sm:col-span-2">
                <Label htmlFor="email">Email for order updates</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  defaultValue={user?.email ?? ""}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-lg font-bold">Shipping address</h2>

            {savedAddresses.length > 0 && (
              <RadioGroup
                value={selectedAddressId}
                onValueChange={(v) => setSelectedAddressId(v as string)}
                className="mt-4 space-y-2"
              >
                {savedAddresses.map((a) => (
                  <label
                    key={a.id}
                    htmlFor={`addr-${a.id}`}
                    className={`flex items-start gap-3 rounded-md border p-4 cursor-pointer transition-colors ${
                      selectedAddressId === a.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent/50"
                    }`}
                  >
                    <RadioGroupItem
                      value={a.id}
                      id={`addr-${a.id}`}
                      className="mt-1"
                    />
                    <div className="text-sm">
                      <div className="font-medium">
                        {a.full_name}
                        {a.is_default && (
                          <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {a.line1}
                        {a.line2 ? `, ${a.line2}` : ""}, {a.city},{" "}
                        {a.province} {a.postal_code}
                      </div>
                      <div className="text-muted-foreground">{a.phone}</div>
                    </div>
                  </label>
                ))}
                <label
                  htmlFor="addr-new"
                  className={`flex items-start gap-3 rounded-md border p-4 cursor-pointer transition-colors ${
                    selectedAddressId === "new"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent/50"
                  }`}
                >
                  <RadioGroupItem value="new" id="addr-new" className="mt-1" />
                  <div className="text-sm font-medium">Use a new address</div>
                </label>
              </RadioGroup>
            )}

            {!usingSaved && (
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="03XX-XXXXXXX"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address">Street address</Label>
                  <Input id="address" name="address" required />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" required />
                </div>
                <div>
                  <Label htmlFor="province">Province</Label>
                  <Input
                    id="province"
                    name="province"
                    required
                    defaultValue="Punjab"
                  />
                </div>
                <div>
                  <Label htmlFor="postal">Postal code</Label>
                  <Input id="postal" name="postal" />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    name="country"
                    defaultValue="Pakistan"
                    readOnly
                  />
                </div>
              </div>
            )}

            <div className="mt-4">
              <Label htmlFor="notes">Order notes (optional)</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-lg font-bold">Payment method</h2>
            <RadioGroup
              value={payment}
              onValueChange={(v) => setPayment(v as PaymentMethod)}
              className="mt-4 space-y-3"
            >
              {[
                {
                  id: "cod" as const,
                  label: "Cash on Delivery",
                  desc: "Pay in cash when your order arrives.",
                },
                {
                  id: "jazzcash" as const,
                  label: "JazzCash",
                  desc: "Pay securely from your JazzCash wallet.",
                },
                {
                  id: "easypaisa" as const,
                  label: "EasyPaisa",
                  desc: "Pay via EasyPaisa mobile wallet.",
                },
                {
                  id: "bank_transfer" as const,
                  label: "Bank transfer",
                  desc: "We'll email you our bank details after checkout.",
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  htmlFor={opt.id}
                  className={`flex items-start gap-3 rounded-md border p-4 cursor-pointer transition-colors ${
                    payment === opt.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent/50"
                  }`}
                >
                  <RadioGroupItem
                    value={opt.id}
                    id={opt.id}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {opt.desc}
                    </div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </section>
        </div>

        <aside className="rounded-lg border border-border bg-card p-6 sticky top-24">
          <h2 className="font-display text-lg font-bold">Order summary</h2>
          <ul className="mt-4 divide-y divide-border">
            {cart.items.map((i) => (
              <li key={i.id} className="py-3 flex gap-3 items-center">
                <div className="h-14 w-14 shrink-0 rounded-md overflow-hidden bg-muted">
                  <img
                    src={i.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium line-clamp-1">
                    {i.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Qty {i.quantity}
                  </div>
                </div>
                <div className="text-sm font-medium">
                  {formatPKR((i.salePrice ?? i.price) * i.quantity)}
                </div>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 text-sm border-t border-border pt-4">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatPKR(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>
                {shipping === 0 ? (
                  <span className="text-primary">Free</span>
                ) : (
                  formatPKR(shipping)
                )}
              </dd>
            </div>
            <div className="flex justify-between text-base font-semibold pt-2 border-t border-border">
              <dt>Total</dt>
              <dd>{formatPKR(total)}</dd>
            </div>
          </dl>
          <Button
            type="submit"
            disabled={orderMutation.isPending}
            className="mt-5 w-full bg-primary hover:bg-primary-dark"
            size="lg"
          >
            {orderMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Placing
                order...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" /> Place order ·{" "}
                {formatPKR(total)}
              </>
            )}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground text-center">
            By placing your order you agree to our terms.
          </p>
        </aside>
      </form>
    </div>
  );
}
