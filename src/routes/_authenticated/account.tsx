import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyProfile,
  updateMyProfile,
  listMyAddresses,
  saveMyAddress,
  deleteMyAddress,
} from "@/lib/profile.functions";
import { listMyOrders } from "@/lib/orders.functions";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPKR } from "@/lib/format";
import { toast } from "sonner";
import { LogOut, Plus, Trash2, Pencil, Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [{ title: "My account — BachatAtBazaar.pk" }, { name: "robots", content: "noindex" }],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = Route.useRouteContext() as { user: { email?: string; id: string } };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profileFn = useServerFn(getMyProfile);
  const updateProfileFn = useServerFn(updateMyProfile);
  const addressesFn = useServerFn(listMyAddresses);
  const ordersFn = useServerFn(listMyOrders);

  const profile = useQuery({ queryKey: ["me", "profile"], queryFn: () => profileFn() });
  const addresses = useQuery({ queryKey: ["me", "addresses"], queryFn: () => addressesFn() });
  const orders = useQuery({ queryKey: ["me", "orders"], queryFn: () => ordersFn() });

  const updateProfile = useMutation({
    mutationFn: (input: { full_name: string; phone: string }) =>
      updateProfileFn({ data: input }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["me", "profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: "My account" }]} />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">My account</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="outline" onClick={onSignOut} className="gap-2">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>

      <Tabs defaultValue="orders" className="mt-6">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          {orders.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading orders...</p>
          ) : (orders.data ?? []).length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <Package className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="mt-3 font-medium">No orders yet</p>
              <Link to="/shop" className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Start shopping</Link>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Order</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(orders.data ?? []).map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="p-3 font-medium">{o.order_number}</td>
                      <td className="p-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                      <td className="p-3 capitalize">{o.status}</td>
                      <td className="p-3 capitalize">{o.payment_method.replace("_", " ")}</td>
                      <td className="p-3 text-right font-medium">{formatPKR(Number(o.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile" className="mt-6 max-w-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              updateProfile.mutate({
                full_name: String(fd.get("full_name") ?? ""),
                phone: String(fd.get("phone") ?? ""),
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" defaultValue={profile.data?.full_name ?? ""} key={profile.data?.full_name ?? ""} required />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={profile.data?.phone ?? ""} key={profile.data?.phone ?? ""} placeholder="03XX-XXXXXXX" />
            </div>
            <Button type="submit" disabled={updateProfile.isPending} className="bg-primary hover:bg-primary-dark">
              Save changes
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="addresses" className="mt-6">
          <AddressManager
            addresses={addresses.data ?? []}
            onChanged={() => qc.invalidateQueries({ queryKey: ["me", "addresses"] })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type AddressRow = {
  id: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postal_code: string | null;
  country: string;
  is_default: boolean;
};

function AddressManager({ addresses, onChanged }: { addresses: AddressRow[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<AddressRow | null>(null);
  const [adding, setAdding] = useState(false);
  const saveFn = useServerFn(saveMyAddress);
  const delFn = useServerFn(deleteMyAddress);

  const save = useMutation({
    mutationFn: (data: Parameters<typeof saveFn>[0]["data"]) => saveFn({ data }),
    onSuccess: () => { toast.success("Address saved"); setEditing(null); setAdding(false); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Address removed"); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (adding || editing) {
    return <AddressForm initial={editing} onCancel={() => { setEditing(null); setAdding(false); }} onSubmit={(v) => save.mutate(v)} busy={save.isPending} />;
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setAdding(true)} className="gap-2 bg-primary hover:bg-primary-dark">
        <Plus className="h-4 w-4" /> Add address
      </Button>
      {addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground pt-4">No saved addresses yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {addresses.map((a) => (
            <div key={a.id} className="rounded-lg border border-border p-4 relative">
              {a.is_default && <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded">Default</span>}
              <div className="font-medium">{a.full_name}</div>
              <div className="text-sm text-muted-foreground">{a.phone}</div>
              <div className="mt-2 text-sm">
                {a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />
                {a.city}, {a.province} {a.postal_code}<br />
                {a.country}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="outline" onClick={() => del.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddressForm({
  initial,
  onCancel,
  onSubmit,
  busy,
}: {
  initial: AddressRow | null;
  onCancel: () => void;
  onSubmit: (v: {
    id?: string; full_name: string; phone: string; line1: string; line2: string;
    city: string; province: string; postal_code: string; country: string; is_default: boolean;
  }) => void;
  busy: boolean;
}) {
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);
  useEffect(() => setIsDefault(initial?.is_default ?? false), [initial]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit({
          id: initial?.id,
          full_name: String(fd.get("full_name") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          line1: String(fd.get("line1") ?? ""),
          line2: String(fd.get("line2") ?? ""),
          city: String(fd.get("city") ?? ""),
          province: String(fd.get("province") ?? ""),
          postal_code: String(fd.get("postal_code") ?? ""),
          country: String(fd.get("country") ?? "Pakistan"),
          is_default: isDefault,
        });
      }}
      className="max-w-2xl grid sm:grid-cols-2 gap-4 rounded-lg border border-border p-6"
    >
      <div><Label>Full name</Label><Input name="full_name" defaultValue={initial?.full_name ?? ""} required /></div>
      <div><Label>Phone</Label><Input name="phone" defaultValue={initial?.phone ?? ""} required /></div>
      <div className="sm:col-span-2"><Label>Address line 1</Label><Input name="line1" defaultValue={initial?.line1 ?? ""} required /></div>
      <div className="sm:col-span-2"><Label>Address line 2 (optional)</Label><Input name="line2" defaultValue={initial?.line2 ?? ""} /></div>
      <div><Label>City</Label><Input name="city" defaultValue={initial?.city ?? ""} required /></div>
      <div><Label>Province</Label><Input name="province" defaultValue={initial?.province ?? "Punjab"} required /></div>
      <div><Label>Postal code</Label><Input name="postal_code" defaultValue={initial?.postal_code ?? ""} /></div>
      <div><Label>Country</Label><Input name="country" defaultValue={initial?.country ?? "Pakistan"} required /></div>
      <label className="sm:col-span-2 flex items-center gap-2 text-sm">
        <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(!!v)} /> Set as default
      </label>
      <div className="sm:col-span-2 flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={busy} className="bg-primary hover:bg-primary-dark">Save address</Button>
      </div>
    </form>
  );
}
