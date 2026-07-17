import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/context/SiteContext";
import { supabase } from "@/integrations/supabase/client";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { formatPKR } from "@/lib/format";
import { createOrder } from "@/lib/orders.functions";
import { validateCoupon } from "@/lib/phase6.functions";
import { listMyAddresses } from "@/lib/profile.functions";
import { Loader2, ShoppingBag, Tag, Upload, X, CheckCircle2, Building2, Wallet } from "lucide-react";
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
  const settings = useSiteSettings();
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new">("new");
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPath, setProofPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const validateCouponFn = useServerFn(validateCoupon);
  const applyCoupon = useMutation({
    mutationFn: (code: string) => validateCouponFn({ data: { code, subtotal: cart.subtotal } }),
    onSuccess: (res, code) => {
      if (res.valid) {
        setApplied({ code: code.toUpperCase(), discount: Number(res.discount) });
        toast.success(res.message || "Coupon applied");
      } else {
        setApplied(null);
        toast.error(res.message || "Coupon is not valid");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });



  const addressesFn = useServerFn(listMyAddresses);
  const addresses = useQuery({
    queryKey: ["me", "addresses"],
    queryFn: () => addressesFn(),
    enabled: isAuthenticated,
  });

  const createOrderFn = useServerFn(createOrder);
  const orderMutation = useMutation({
    mutationFn: createOrderFn,
    onSuccess: (res, vars) => {
      const v = vars as { data: { shipping_address: { email: string } } };
      const email = v.data.shipping_address.email;
      cart.clear();
      navigate({
        to: "/order-confirmation",
        search: { order: res.order_number, email },
      });
    },


    onError: (e: Error) => toast.error(e.message),
  });


  useEffect(() => {
    const list = addresses.data;
    if (list && list.length > 0 && selectedAddressId === "new") {
      const def = list.find((a) => a.is_default) ?? list[0];
      setSelectedAddressId(def.id);
    }
  }, [addresses.data, selectedAddressId]);

  const discount = applied ? Math.min(applied.discount, cart.subtotal) : 0;
  const shipping = cart.subtotal >= 3000 || cart.subtotal === 0 ? 0 : 250;
  const total = Math.max(0, cart.subtotal - discount) + shipping;


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

  if (authLoading) {
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

  const uploadProof = async (file: File): Promise<string | null> => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Receipt file must be under 5 MB.");
      return null;
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
    setUploading(true);
    try {
      const { error } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) {
        toast.error("Failed to upload receipt. Please try again.");
        return null;
      }
      return path;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    // Manual payment methods require reference + proof
    if (payment !== "cod") {
      if (!paymentReference.trim()) {
        toast.error("Please enter your payment transaction ID / reference.");
        return;
      }
      if (!proofFile && !proofPath) {
        toast.error("Please upload your payment receipt screenshot.");
        return;
      }
    }

    let uploadedPath = proofPath;
    if (proofFile && !proofPath) {
      uploadedPath = await uploadProof(proofFile);
      if (!uploadedPath) return;
      setProofPath(uploadedPath);
    }

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
        coupon_code: applied?.code ?? null,
        payment_reference: payment !== "cod" ? paymentReference.trim() : null,
        payment_proof_url: payment !== "cod" ? uploadedPath : null,
      },
    });
  };


  return (
    <div className="container-page py-8">
      <Breadcrumbs
        items={[{ label: "Cart", to: "/cart" }, { label: "Checkout" }]}
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Checkout</h1>
          {!isAuthenticated && (
            <p className="mt-2 text-sm text-muted-foreground">
              You can place your order as a guest. Sign in only if you want to save addresses.
            </p>
          )}
        </div>
        {!isAuthenticated && (
          <Link
            to="/auth"
            search={{ redirect: "/checkout" }}
            className="text-sm font-semibold text-primary hover:text-primary-dark"
          >
            Sign in for saved addresses
          </Link>
        )}
      </div>

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
                  desc: "Transfer to our bank account. Details shown below after selecting.",
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

            {payment !== "cod" && (
              <div className="mt-5 rounded-md border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  {payment === "bank_transfer" ? (
                    <Building2 className="h-4 w-4" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  {payment === "bank_transfer" && "Bank transfer details"}
                  {payment === "jazzcash" && "JazzCash details"}
                  {payment === "easypaisa" && "EasyPaisa details"}
                </div>
                <pre className="mt-3 whitespace-pre-wrap break-words text-sm font-mono bg-background/60 rounded p-3 border border-border">
                  {payment === "bank_transfer" && (settings.bank_details?.trim() || "Bank details will be shared soon.")}
                  {payment === "jazzcash" && `JazzCash Number: ${settings.jazzcash?.trim() || "Not configured"}`}
                  {payment === "easypaisa" && `EasyPaisa Number: ${settings.easypaisa?.trim() || "Not configured"}`}
                </pre>
                <p className="mt-3 text-xs text-muted-foreground">
                  Transfer the exact total amount, then enter your transaction ID and upload the receipt below.
                </p>

                <div className="mt-4 grid gap-4">
                  <div>
                    <Label htmlFor="payment_reference">Transaction ID / Reference *</Label>
                    <Input
                      id="payment_reference"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="e.g. TRX123456789"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="proof">Payment receipt (screenshot) *</Label>
                    <div className="mt-1 flex items-center gap-3">
                      <label
                        htmlFor="proof"
                        className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
                      >
                        <Upload className="h-4 w-4" />
                        {proofFile ? "Change file" : "Choose file"}
                      </label>
                      <input
                        id="proof"
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setProofFile(f);
                          setProofPath(null);
                        }}
                      />
                      {proofFile && (
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {proofFile.name}
                        </span>
                      )}
                      {proofPath && (
                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                          <CheckCircle2 className="h-3 w-3" /> Uploaded
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Max 5 MB. Image or PDF.
                    </p>
                  </div>
                </div>
              </div>
            )}
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

          <div className="mt-4 pt-4 border-t border-border">
            {applied ? (
              <div className="flex items-center justify-between rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="font-medium">{applied.code}</span>
                  <span className="text-muted-foreground">−{formatPKR(applied.discount)}</span>
                </div>
                <button type="button" onClick={() => setApplied(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Coupon code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!couponInput.trim() || applyCoupon.isPending}
                  onClick={() => applyCoupon.mutate(couponInput.trim())}
                >
                  {applyCoupon.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            )}
          </div>

          <dl className="mt-4 space-y-2 text-sm border-t border-border pt-4">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatPKR(cart.subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-primary">
                <dt>Discount</dt>
                <dd>−{formatPKR(discount)}</dd>
              </div>
            )}
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
                <ShoppingBag className="h-4 w-4 mr-2" /> Place order ·{" "}
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
