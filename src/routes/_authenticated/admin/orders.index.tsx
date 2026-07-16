import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listOrdersAdmin } from "@/lib/orders.functions";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { formatPKR } from "@/lib/format";
import { Search, Download } from "lucide-react";
import Papa from "papaparse";

export const Route = createFileRoute("/_authenticated/admin/orders")({ component: OrdersPage });

const STATUS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"] as const;
const PAY = ["unpaid", "awaiting_verification", "paid", "failed", "refunded"] as const;

function OrdersPage() {
  const fn = useServerFn(listOrdersAdmin);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [pay, setPay] = useState<string>("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-orders", search, status, pay],
    queryFn: () => fn({ data: { search, status: (status || undefined) as never, payment_status: (pay || undefined) as never, limit: 200 } }),
  });

  const exportCSV = () => {
    const csv = Papa.unparse(data.map((o) => ({
      order_number: o.order_number, customer: o.customer_name, email: o.email,
      status: o.status, payment_status: o.payment_status, payment_method: o.payment_method,
      total: o.total, items: o.item_count, created_at: o.created_at,
    })));
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div>
      <AdminPageHeader
        title="Orders"
        subtitle={`${data.length} order${data.length === 1 ? "" : "s"}`}
        actions={<button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"><Download className="h-4 w-4" /> Export CSV</button>}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order # or email" className="w-full rounded-md border border-border pl-9 pr-3 py-2 text-sm" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-border px-3 py-2 text-sm">
          <option value="">All status</option>
          {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={pay} onChange={(e) => setPay(e.target.value)} className="rounded-md border border-border px-3 py-2 text-sm">
          <option value="">All payments</option>
          {PAY.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-background border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground bg-muted/50">
              <tr>
                <th className="px-3 py-2.5">Order</th>
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Payment</th>
                <th className="px-3 py-2.5">Items</th>
                <th className="px-3 py-2.5 text-right">Total</th>
                <th className="px-3 py-2.5">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && data.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No orders found.</td></tr>}
              {data.map((o) => (
                <tr key={o.id} className="border-t border-border/50 hover:bg-muted/40">
                  <td className="px-3 py-2.5">
                    <Link to="/admin/orders/$id" params={{ id: o.order_number }} className="font-medium text-primary hover:underline">{o.order_number}</Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="truncate max-w-[200px]">{o.customer_name || "—"}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{o.email}</div>
                  </td>
                  <td className="px-3 py-2.5"><StatusChip value={o.status} /></td>
                  <td className="px-3 py-2.5"><PayChip value={o.payment_status} /></td>
                  <td className="px-3 py-2.5">{o.item_count}</td>
                  <td className="px-3 py-2.5 text-right font-medium">{formatPKR(o.total)}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ value }: { value: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-sky-100 text-sky-800",
    processing: "bg-blue-100 text-blue-800",
    shipped: "bg-indigo-100 text-indigo-800",
    delivered: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-rose-100 text-rose-800",
    refunded: "bg-neutral-200 text-neutral-800",
  };
  return <span className={`text-xs px-2 py-1 rounded-full ${map[value] ?? "bg-muted"}`}>{value}</span>;
}
function PayChip({ value }: { value: string }) {
  const map: Record<string, string> = {
    unpaid: "bg-rose-100 text-rose-800",
    awaiting_verification: "bg-amber-100 text-amber-800",
    paid: "bg-emerald-100 text-emerald-800",
    failed: "bg-neutral-200 text-neutral-800",
    refunded: "bg-neutral-200 text-neutral-800",
  };
  return <span className={`text-xs px-2 py-1 rounded-full ${map[value] ?? "bg-muted"}`}>{value}</span>;
}
