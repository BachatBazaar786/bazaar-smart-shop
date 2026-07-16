import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProductsAdmin, deleteProductAdmin, duplicateProductAdmin, listCategoriesAdmin, listBrandsAdmin } from "@/lib/admin.functions";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { formatPKR } from "@/lib/format";
import { Plus, Copy, Trash2, Pencil, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/products")({ component: ProductsPage });

function ProductsPage() {
  const nav = useNavigate();
  const list = useServerFn(listProductsAdmin);
  const del = useServerFn(deleteProductAdmin);
  const dup = useServerFn(duplicateProductAdmin);
  const catsFn = useServerFn(listCategoriesAdmin);
  const brandsFn = useServerFn(listBrandsAdmin);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [catId, setCatId] = useState("");
  const [brandId, setBrandId] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-products", search, status, catId, brandId],
    queryFn: () => list({ data: { search, status: (status || undefined) as never, category_id: catId || undefined, brand_id: brandId || undefined } }),
  });
  const { data: cats = [] } = useQuery({ queryKey: ["admin-categories"], queryFn: () => catsFn() });
  const { data: brands = [] } = useQuery({ queryKey: ["admin-brands"], queryFn: () => brandsFn() });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Product deleted"); qc.invalidateQueries({ queryKey: ["admin-products"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const dupMut = useMutation({
    mutationFn: (id: string) => dup({ data: { id } }),
    onSuccess: (r) => { toast.success("Product duplicated"); nav({ to: "/admin/products/$id", params: { id: r.id } }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AdminPageHeader
        title="Products"
        subtitle={`${data.length} product${data.length === 1 ? "" : "s"}`}
        actions={<Link to="/admin/products/new" className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary-dark"><Plus className="h-4 w-4" /> New product</Link>}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, SKU, slug" className="w-full rounded-md border border-border pl-9 pr-3 py-2 text-sm" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-border px-3 py-2 text-sm">
          <option value="">All status</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
        </select>
        <select value={catId} onChange={(e) => setCatId(e.target.value)} className="rounded-md border border-border px-3 py-2 text-sm">
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="rounded-md border border-border px-3 py-2 text-sm">
          <option value="">All brands</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="bg-background border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground bg-muted/50">
              <tr>
                <th className="px-3 py-2.5">Product</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Price</th>
                <th className="px-3 py-2.5">Stock</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && data.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No products.</td></tr>}
              {data.map((p) => (
                <tr key={p.id} className="border-t border-border/50 hover:bg-muted/40">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-muted overflow-hidden flex-shrink-0">
                        {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <Link to="/admin/products/$id" params={{ id: p.id }} className="font-medium hover:underline block truncate max-w-[280px]">{p.name}</Link>
                        <div className="text-xs text-muted-foreground">{p.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{p.category_name ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{formatPKR(p.sale_price ?? p.price)}</div>
                    {p.sale_price !== null && <div className="text-xs text-muted-foreground line-through">{formatPKR(p.price)}</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={p.stock <= 0 ? "text-rose-600 font-medium" : p.stock < 10 ? "text-amber-700 font-medium" : ""}>{p.stock}</span>
                  </td>
                  <td className="px-3 py-2.5"><span className="text-xs px-2 py-1 rounded-full bg-muted capitalize">{p.status}</span></td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link to="/admin/products/$id" params={{ id: p.id }} className="p-1.5 hover:bg-accent rounded" title="Edit"><Pencil className="h-4 w-4" /></Link>
                      <button onClick={() => dupMut.mutate(p.id)} className="p-1.5 hover:bg-accent rounded" title="Duplicate"><Copy className="h-4 w-4" /></button>
                      <button onClick={() => { if (confirm(`Delete ${p.name}?`)) delMut.mutate(p.id); }} className="p-1.5 hover:bg-destructive/10 text-destructive rounded" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
