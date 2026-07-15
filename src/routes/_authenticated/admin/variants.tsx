import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listProductsAdmin } from "@/lib/admin.functions";
import { listVariantsAdmin, upsertVariantAdmin, deleteVariantAdmin } from "@/lib/phase6.functions";
import { AdminPageHeader, AdminCard } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/variants")({ component: VariantsPage });

type VForm = {
  id?: string;
  name: string;
  sku: string;
  price: string;
  sale_price: string;
  stock: string;
  attributes: string;
  sort_order: string;
  active: boolean;
};

const emptyV: VForm = { name: "", sku: "", price: "0", sale_price: "", stock: "0", attributes: "", sort_order: "0", active: true };

function VariantsPage() {
  const qc = useQueryClient();
  const productsFn = useServerFn(listProductsAdmin);
  const listFn = useServerFn(listVariantsAdmin);
  const upFn = useServerFn(upsertVariantAdmin);
  const delFn = useServerFn(deleteVariantAdmin);

  const products = useQuery({
    queryKey: ["admin", "products", "for-variants"],
    queryFn: () => productsFn({ data: { search: "", limit: 500 } }),
  });

  const [productId, setProductId] = useState<string>("");
  const variants = useQuery({
    queryKey: ["admin", "variants", productId],
    queryFn: () => listFn({ data: { product_id: productId } }),
    enabled: !!productId,
  });

  const [form, setForm] = useState<VForm>(emptyV);

  const productOptions = useMemo(() => products.data ?? [], [products.data]);

  const save = useMutation({
    mutationFn: () => {
      const parsedAttrs: Record<string, string> = {};
      form.attributes.split(",").map((s) => s.trim()).filter(Boolean).forEach((kv) => {
        const [k, ...rest] = kv.split(":");
        if (k && rest.length) parsedAttrs[k.trim()] = rest.join(":").trim();
      });
      return upFn({
        data: {
          id: form.id,
          product_id: productId,
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          price: Number(form.price),
          sale_price: form.sale_price ? Number(form.sale_price) : null,
          stock: Number(form.stock),
          attributes: parsedAttrs,
          sort_order: Number(form.sort_order) || 0,
          active: form.active,
        },
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "variants", productId] }); setForm(emptyV); toast.success("Saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "variants", productId] }),
  });

  return (
    <div>
      <AdminPageHeader title="Product variants" subtitle="Size, weight or option-level SKUs sharing the parent product's stock" />

      <div className="mb-4">
        <Label>Product</Label>
        <select className="w-full max-w-md border border-border rounded-md px-2 py-2 mt-1" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Select a product…</option>
          {productOptions.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {productId && (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          <AdminCard title="Variants">
            {variants.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !variants.data?.length ? (
              <p className="text-sm text-muted-foreground">No variants yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2">Name</th>
                      <th className="py-2">SKU</th>
                      <th className="py-2 text-right">Price</th>
                      <th className="py-2 text-right">Stock</th>
                      <th className="py-2">Active</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {variants.data.map((v) => (
                      <tr key={v.id}>
                        <td className="py-2 font-medium">{v.name}</td>
                        <td className="py-2 text-xs text-muted-foreground">{v.sku ?? "—"}</td>
                        <td className="py-2 text-right">Rs {Number(v.price)}{v.sale_price ? ` (sale ${Number(v.sale_price)})` : ""}</td>
                        <td className="py-2 text-right">{v.stock}</td>
                        <td className="py-2">{v.active ? "Yes" : "No"}</td>
                        <td className="py-2 text-right">
                          <div className="inline-flex gap-1">
                            <button className="p-1.5 hover:bg-accent rounded text-xs" onClick={() => setForm({
                              id: v.id, name: v.name, sku: v.sku ?? "",
                              price: String(v.price), sale_price: v.sale_price ? String(v.sale_price) : "",
                              stock: String(v.stock),
                              attributes: Object.entries(v.attributes ?? {}).map(([k,vv]) => `${k}:${vv}`).join(", "),
                              sort_order: String(v.sort_order ?? 0), active: !!v.active,
                            })}>Edit</button>
                            <button className="p-1.5 text-destructive hover:bg-destructive/10 rounded" onClick={() => del.mutate(v.id)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>

          <AdminCard title={form.id ? "Edit variant" : "New variant"} action={form.id ? <Button size="sm" variant="ghost" onClick={() => setForm(emptyV)}>Cancel</Button> : null}>
            <div className="space-y-3 text-sm">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="500g / Large" /></div>
              <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Price</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div><Label>Sale price</Label><Input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
                <div><Label>Sort</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
              </div>
              <div>
                <Label>Attributes (key:value, comma-separated)</Label>
                <Input value={form.attributes} onChange={(e) => setForm({ ...form, attributes: e.target.value })} placeholder="size:large, weight:500g" />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active
              </label>
              <Button disabled={!form.name || save.isPending} onClick={() => save.mutate()} className="w-full gap-1">
                <Plus className="h-4 w-4" /> {form.id ? "Update" : "Add variant"}
              </Button>
            </div>
          </AdminCard>
        </div>
      )}
    </div>
  );
}
