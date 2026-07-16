import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCustomersAdmin } from "@/lib/admin.functions";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { formatPKR } from "@/lib/format";
import { Search, Download } from "lucide-react";
import Papa from "papaparse";

export const Route = createFileRoute("/_authenticated/admin/customers/")({ component: CustomersPage });

function CustomersPage() {
  const fn = useServerFn(listCustomersAdmin);
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-customers", search],
    queryFn: () => fn({ data: { search } }),
  });

  const exportCSV = () => {
    const csv = Papa.unparse(data.map((c) => ({
      name: c.full_name, email: c.email, phone: c.phone, role: c.role,
      orders: c.order_count, total_spent: c.total_spent, created_at: c.created_at,
    })));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div>
      <AdminPageHeader title="Customers" subtitle={`${data.length} customers`}
        actions={<button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"><Download className="h-4 w-4" /> Export</button>} />

      <div className="relative mb-4 max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className="w-full rounded-md border border-border pl-9 pr-3 py-2 text-sm" />
      </div>

      <div className="bg-background border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground bg-muted/50">
              <tr>
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5">Phone</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5 text-right">Orders</th>
                <th className="px-3 py-2.5 text-right">Spent</th>
                <th className="px-3 py-2.5">Joined</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && data.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No customers.</td></tr>}
              {data.map((c) => (
                <tr key={c.id} className="border-t border-border/50 hover:bg-muted/40">
                  <td className="px-3 py-2.5">
                    <Link to="/admin/customers/$id" params={{ id: c.id }} className="font-medium text-primary hover:underline">{c.full_name || "—"}</Link>
                    <div className="text-xs text-muted-foreground truncate max-w-[220px]">{c.email}</div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{c.phone || "—"}</td>
                  <td className="px-3 py-2.5"><span className="text-xs px-2 py-1 rounded-full bg-muted capitalize">{c.role ?? "customer"}</span></td>
                  <td className="px-3 py-2.5 text-right">{c.order_count}</td>
                  <td className="px-3 py-2.5 text-right font-medium">{formatPKR(Number(c.total_spent))}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
