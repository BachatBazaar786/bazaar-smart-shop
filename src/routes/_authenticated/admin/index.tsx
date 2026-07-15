import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@/lib/admin.functions";
import { StatCard, AdminCard, AdminPageHeader } from "@/components/admin/AdminUI";
import { formatPKR } from "@/lib/format";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

const PIE_COLORS = ["#0a5548", "#d97706", "#0ea5e9", "#8b5cf6", "#ec4899", "#22c55e", "#ef4444"];

function DashboardPage() {
  const fn = useServerFn(getDashboardStats);
  const { data, isLoading } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => fn(), staleTime: 30_000 });

  if (isLoading || !data) {
    return (
      <div>
        <AdminPageHeader title="Dashboard" subtitle="Store overview & real-time performance" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const r = data.revenue;
  const c = data.counts;
  const cu = data.customers;
  const inv = data.inventory;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Dashboard" subtitle="Store overview & real-time performance" />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Today revenue" value={formatPKR(r.today_revenue)} accent="primary" />
        <StatCard label="Last 7 days" value={formatPKR(r.week_revenue)} accent="primary" />
        <StatCard label="Last 30 days" value={formatPKR(r.month_revenue)} accent="primary" />
        <StatCard label="This year" value={formatPKR(r.year_revenue)} accent="savings" />
        <StatCard label="Total orders" value={c.orders_total} />
        <StatCard label="Customers" value={cu.total_customers} hint={`+${cu.new_customers} new / 30d`} />
        <StatCard label="Products" value={c.products_total} hint={`${inv.low_stock} low · ${inv.out_of_stock} out`} accent={inv.low_stock ? "savings" : "muted"} />
        <StatCard label="Inventory value" value={formatPKR(Number(inv.inventory_value))} />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <AdminCard title="Revenue — last 30 days">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.daily_revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatPKR(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke="#0a5548" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        <AdminCard title="Orders by status">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.orders_by_status} dataKey="count" nameKey="status" outerRadius={90} label>
                  {data.orders_by_status.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        <AdminCard title="Revenue by category">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenue_by_category} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatPKR(Number(v))} />
                <Bar dataKey="revenue" fill="#0a5548" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AdminCard title="Recent orders" action={<Link to="/admin/orders" className="text-sm text-primary">View all</Link>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                <tr><th className="py-2">Order</th><th>Status</th><th>Payment</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody>
                {data.recent_orders.map((o) => (
                  <tr key={o.id} className="border-b border-border/50">
                    <td className="py-2">
                      <div className="font-medium">{o.order_number}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[220px]">{o.email}</div>
                    </td>
                    <td><span className="text-xs px-2 py-1 rounded-full bg-muted">{o.status}</span></td>
                    <td><span className="text-xs px-2 py-1 rounded-full bg-muted">{o.payment_status}</span></td>
                    <td className="text-right font-medium">{formatPKR(Number(o.total))}</td>
                  </tr>
                ))}
                {data.recent_orders.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminCard title="Top products (units sold)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                <tr><th className="py-2">Product</th><th className="text-right">Units</th><th className="text-right">Revenue</th></tr>
              </thead>
              <tbody>
                {data.top_products.map((p, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 truncate max-w-[280px]">{p.name}</td>
                    <td className="text-right">{p.units}</td>
                    <td className="text-right">{formatPKR(Number(p.revenue))}</td>
                  </tr>
                ))}
                {data.top_products.length === 0 && (
                  <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No sales yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
