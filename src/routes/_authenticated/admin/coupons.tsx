import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listCouponsAdmin, upsertCouponAdmin, deleteCouponAdmin } from "@/lib/phase6.functions";
import { AdminPageHeader, AdminCard } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/coupons")({ component: CouponsPage });

type Form = {
  id?: string;
  code: string;
  description: string;
  discount_type: "percent" | "fixed";
  discount_value: string;
  min_order: string;
  max_discount: string;
  starts_at: string;
  expires_at: string;
  usage_limit: string;
  per_user_limit: string;
  active: boolean;
};

const empty: Form = {
  code: "", description: "", discount_type: "percent", discount_value: "10",
  min_order: "0", max_discount: "", starts_at: "", expires_at: "",
  usage_limit: "", per_user_limit: "", active: true,
};

function CouponsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCouponsAdmin);
  const upFn = useServerFn(upsertCouponAdmin);
  const delFn = useServerFn(deleteCouponAdmin);

  const list = useQuery({ queryKey: ["admin", "coupons"], queryFn: () => listFn() });
  const [form, setForm] = useState<Form>(empty);
  const [editing, setEditing] = useState(false);

  const save = useMutation({
    mutationFn: () => upFn({
      data: {
        id: form.id,
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order: Number(form.min_order) || 0,
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        per_user_limit: form.per_user_limit ? Number(form.per_user_limit) : null,
        active: form.active,
      },
    }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
      setForm(empty); setEditing(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "coupons"] }); toast.success("Deleted"); },
  });

  return (
    <div>
      <AdminPageHeader title="Coupons" subtitle="Percentage or fixed-amount discount codes" />

      <div className="grid lg:grid-cols-[1fr_400px] gap-6 items-start">
        <AdminCard title="All coupons">
          {list.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !list.data?.length ? (
            <p className="text-sm text-muted-foreground">No coupons yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2">Code</th>
                    <th className="py-2">Discount</th>
                    <th className="py-2">Min order</th>
                    <th className="py-2">Used</th>
                    <th className="py-2">Active</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.data.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 font-mono font-medium">{c.code}</td>
                      <td className="py-2">
                        {c.discount_type === "percent" ? `${Number(c.discount_value)}%` : `Rs ${Number(c.discount_value)}`}
                      </td>
                      <td className="py-2">Rs {Number(c.min_order ?? 0)}</td>
                      <td className="py-2">{c.used_count ?? 0}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                      <td className="py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${c.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{c.active ? "Yes" : "No"}</span>
                      </td>
                      <td className="py-2 text-right">
                        <div className="inline-flex gap-1">
                          <button className="p-1.5 hover:bg-accent rounded" onClick={() => { setEditing(true); setForm({
                            id: c.id, code: c.code, description: c.description ?? "",
                            discount_type: c.discount_type as "percent" | "fixed",
                            discount_value: String(c.discount_value),
                            min_order: String(c.min_order ?? 0),
                            max_discount: c.max_discount ? String(c.max_discount) : "",
                            starts_at: c.starts_at ? new Date(c.starts_at).toISOString().slice(0,16) : "",
                            expires_at: c.expires_at ? new Date(c.expires_at).toISOString().slice(0,16) : "",
                            usage_limit: c.usage_limit ? String(c.usage_limit) : "",
                            per_user_limit: c.per_user_limit ? String(c.per_user_limit) : "",
                            active: !!c.active,
                          }); }}><Edit className="h-4 w-4" /></button>
                          <button className="p-1.5 text-destructive hover:bg-destructive/10 rounded" onClick={() => { if (confirm(`Delete ${c.code}?`)) del.mutate(c.id); }}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        <AdminCard title={editing ? `Edit ${form.code || "coupon"}` : "New coupon"} action={
          editing ? <Button size="sm" variant="ghost" onClick={() => { setForm(empty); setEditing(false); }}>Cancel</Button> : null
        }>
          <div className="space-y-3 text-sm">
            <div>
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE10" />
            </div>
            <div>
              <Label>Description (internal)</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Type</Label>
                <select className="w-full border border-border rounded-md px-2 py-2 mt-1" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percent" | "fixed" })}>
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed (PKR)</option>
                </select>
              </div>
              <div>
                <Label>Value</Label>
                <Input type="number" min={0} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Min order</Label>
                <Input type="number" min={0} value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} />
              </div>
              <div>
                <Label>Max discount</Label>
                <Input type="number" min={0} value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Starts</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div>
                <Label>Expires</Label>
                <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Total usage limit</Label>
                <Input type="number" min={1} value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} placeholder="Unlimited" />
              </div>
              <div>
                <Label>Per user limit</Label>
                <Input type="number" min={1} value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} placeholder="Unlimited" />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active
            </label>
            <Button disabled={!form.code || save.isPending} onClick={() => save.mutate()} className="w-full gap-1">
              <Plus className="h-4 w-4" /> {editing ? "Update coupon" : "Create coupon"}
            </Button>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
