import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOrderAdmin, updateOrderStatusAdmin } from "@/lib/orders.functions";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminUI";
import { formatPKR } from "@/lib/format";
import { ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/orders/$id")({ component: OrderDetailPage });

const STATUS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"] as const;
const PAY = ["unpaid", "awaiting_verification", "paid", "failed", "refunded"] as const;

function OrderDetailPage() {
  const { id } = Route.useParams();
  const get = useServerFn(getOrderAdmin);
  const update = useServerFn(updateOrderStatusAdmin);
  const qc = useQueryClient();
  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => get({ data: { order_number: id } }),
  });

  const [status, setStatus] = useState<string>("");
  const [pay, setPay] = useState<string>("");
  const [note, setNote] = useState("");

  const mut = useMutation({
    mutationFn: () => update({ data: { order_id: (order as { id: string }).id, status: (status || (order as { status: string }).status) as never, payment_status: (pay || (order as { payment_status: string }).payment_status) as never, note } }),
    onSuccess: () => {
      toast.success("Order updated");
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-order", id] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!order) return <div className="text-muted-foreground">Order not found.</div>;

  const o = order as {
    id: string; order_number: string; status: string; payment_status: string; payment_method: string;
    subtotal: number; shipping: number; total: number; email: string; notes: string | null; created_at: string;
    shipping_address: { full_name: string; phone: string; line1: string; line2?: string; city: string; province: string; postal_code?: string; country: string };
    items: { id: string; name_snapshot: string; sku_snapshot: string; image_url: string | null; unit_price: number; quantity: number; subtotal: number }[];
    history: { id: string; status: string; note: string | null; created_at: string }[];
  };

  return (
    <div>
      <AdminPageHeader
        title={o.order_number}
        subtitle={`Placed ${new Date(o.created_at).toLocaleString()}`}
        actions={
          <>
            <Link to="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"><Printer className="h-4 w-4" /> Print invoice</button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <AdminCard title="Items">
            <div className="divide-y divide-border">
              {o.items.map((it) => (
                <div key={it.id} className="flex gap-3 py-3">
                  {it.image_url && <img src={it.image_url} alt="" className="h-14 w-14 rounded object-cover" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{it.name_snapshot}</div>
                    <div className="text-xs text-muted-foreground">SKU {it.sku_snapshot} · {formatPKR(it.unit_price)} × {it.quantity}</div>
                  </div>
                  <div className="font-medium">{formatPKR(it.subtotal)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border space-y-1 text-sm">
              <Row label="Subtotal" value={formatPKR(o.subtotal)} />
              <Row label="Shipping" value={formatPKR(o.shipping)} />
              <Row label="Total" value={formatPKR(o.total)} bold />
            </div>
          </AdminCard>

          <AdminCard title="Status timeline">
            {o.history.length === 0 ? (
              <div className="text-sm text-muted-foreground">No changes recorded.</div>
            ) : (
              <ol className="space-y-3">
                {o.history.map((h) => (
                  <li key={h.id} className="flex gap-3">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
                    <div className="flex-1">
                      <div className="text-sm font-medium capitalize">{h.status}</div>
                      {h.note ? <div className="text-xs text-muted-foreground">{h.note}</div> : null}
                      <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </AdminCard>
        </div>

        <div className="space-y-4">
          <AdminCard title="Update">
            <div className="space-y-2">
              <label className="text-xs uppercase text-muted-foreground">Status</label>
              <select value={status || o.status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-md border border-border px-3 py-2 text-sm">
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <label className="text-xs uppercase text-muted-foreground pt-2 block">Payment</label>
              <select value={pay || o.payment_status} onChange={(e) => setPay(e.target.value)} className="w-full rounded-md border border-border px-3 py-2 text-sm">
                {PAY.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <label className="text-xs uppercase text-muted-foreground pt-2 block">Note (optional)</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full rounded-md border border-border px-3 py-2 text-sm" />
              <button onClick={() => mut.mutate()} disabled={mut.isPending} className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-60">
                {mut.isPending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </AdminCard>

          <AdminCard title="Customer">
            <div className="text-sm space-y-1">
              <div className="font-medium">{o.shipping_address.full_name}</div>
              <div className="text-muted-foreground">{o.email}</div>
              <div className="text-muted-foreground">{o.shipping_address.phone}</div>
            </div>
            <div className="text-sm mt-3">
              <div>{o.shipping_address.line1}</div>
              {o.shipping_address.line2 && <div>{o.shipping_address.line2}</div>}
              <div>{o.shipping_address.city}, {o.shipping_address.province} {o.shipping_address.postal_code ?? ""}</div>
              <div>{o.shipping_address.country}</div>
            </div>
          </AdminCard>

          <AdminCard title="Payment">
            <div className="text-sm">Method: <span className="font-medium capitalize">{o.payment_method.replace("_", " ")}</span></div>
            {o.notes && <div className="text-sm mt-2 text-muted-foreground italic">"{o.notes}"</div>}
          </AdminCard>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold text-base pt-1" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
