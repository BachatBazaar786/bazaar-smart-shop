import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProductsAdmin, adjustStockAdmin, listStockMovementsAdmin } from "@/lib/admin.functions";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminUI";
import { Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/inventory")({ component: InventoryPage });

const REASONS = ["restock", "manual", "correction", "damaged", "return"] as const;

function InventoryPage() {
  const listProducts = useServerFn(listProductsAdmin);
  const adjust = useServerFn(adjustStockAdmin);
  const listMovements = useServerFn(listStockMovementsAdmin);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showLow, setShowLow] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["admin-inventory", search],
    queryFn: () => listProducts({ data: { search, limit: 500 } }),
  });
  const { data: movements = [] } = useQuery({
    queryKey: ["admin-stock-movements"],
    queryFn: () => listMovements({ data: { limit: 100 } }),
  });

  const filtered = showLow ? products.filter((p) => p.stock < 10) : products;

  const adjustMut = useMutation({
    mutationFn: (v: { product_id: string; delta: number; reason: (typeof REASONS)[number] }) => adjust({ data: v }),
    onSuccess: () => {
      toast.success("Stock adjusted");
      qc.invalidateQueries({ queryKey: ["admin-inventory"] });
      qc.invalidateQueries({ queryKey: ["admin-stock-movements"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AdminPageHeader title="Inventory" subtitle={`${products.length} products · ${products.filter((p) => p.stock < 10).length} low stock`} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product" className="w-full rounded-md border border-border pl-9 pr-3 py-2 text-sm" />
        </div>
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={showLow} onChange={(e) => setShowLow(e.target.checked)} /> Low stock only</label>
      </div>

      <AdminCard title="Adjust stock">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Product</th><th>SKU</th><th className="text-right">Stock</th><th>Adjust</th></tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <InventoryRow key={p.id} product={p} onAdjust={(v) => adjustMut.mutate(v)} />
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No products.</td></tr>}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <div className="mt-4">
        <AdminCard title="Recent stock movements">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="py-2">When</th><th>Product</th><th>Reason</th><th className="text-right">Δ</th><th>Note</th></tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-t border-border/50">
                    <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(m.created_at).toLocaleString()}</td>
                    <td>{m.product_name} <span className="text-xs text-muted-foreground">({m.product_sku})</span></td>
                    <td className="capitalize">{m.reason}</td>
                    <td className={`text-right font-medium ${m.delta > 0 ? "text-savings" : "text-destructive"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                    <td className="text-xs text-muted-foreground">{m.note ?? "—"}</td>
                  </tr>
                ))}
                {movements.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No movements yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

function InventoryRow({ product, onAdjust }: {
  product: { id: string; name: string; sku: string; stock: number };
  onAdjust: (v: { product_id: string; delta: number; reason: (typeof REASONS)[number] }) => void;
}) {
  const [delta, setDelta] = useState<number>(0);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("restock");
  return (
    <tr className="border-t border-border/50">
      <td className="py-2 font-medium truncate max-w-[300px]">{product.name}</td>
      <td className="text-xs text-muted-foreground">{product.sku}</td>
      <td className="text-right"><span className={product.stock <= 0 ? "text-rose-600 font-medium" : product.stock < 10 ? "text-amber-700 font-medium" : ""}>{product.stock}</span></td>
      <td>
        <div className="flex flex-wrap items-center gap-1.5">
          <input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} className="w-20 rounded-md border border-border px-2 py-1 text-sm" />
          <select value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])} className="rounded-md border border-border px-2 py-1 text-sm">
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button disabled={delta === 0} onClick={() => { onAdjust({ product_id: product.id, delta, reason }); setDelta(0); }} className="rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm disabled:opacity-40">Apply</button>
        </div>
      </td>
    </tr>
  );
}
