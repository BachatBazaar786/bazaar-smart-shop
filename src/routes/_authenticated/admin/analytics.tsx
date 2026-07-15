import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getAnalyticsExtras } from "@/lib/phase6.functions";
import { AdminPageHeader, AdminCard, StatCard } from "@/components/admin/AdminUI";
import { formatPKR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  const fn = useServerFn(getAnalyticsExtras);
  const [days, setDays] = useState(30);
  const q = useQuery({
    queryKey: ["admin", "analytics-extras", days],
    queryFn: () => fn({ data: { days } }),
  });

  const d = q.data;

  return (
    <div>
      <AdminPageHeader
        title="Advanced analytics"
        subtitle="Product views, coupon performance, blog engagement"
        actions={
          <select className="border border-border rounded-md px-2 py-1.5 text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        }
      />

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : q.isError ? (
        <p className="text-sm text-destructive">Failed to load analytics.</p>
      ) : d ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="Blog posts" value={d.blog.total} hint={`${d.blog.published} published`} />
            <StatCard label="Blog views" value={d.blog.views.toLocaleString()} accent="primary" />
            <StatCard label="Active coupons used" value={d.coupons.length} />
            <StatCard label="Tracked products" value={d.most_viewed.length} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <AdminCard title="Most viewed products">
              {!d.most_viewed.length ? (
                <p className="text-sm text-muted-foreground">No views yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                    <tr><th className="py-2">Product</th><th className="py-2 text-right">Views</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {d.most_viewed.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2">
                          <a href={`/product/${p.slug}`} className="hover:text-primary">{p.name}</a>
                        </td>
                        <td className="py-2 text-right font-medium">{p.views.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </AdminCard>

            <AdminCard title="Coupon usage">
              {!d.coupons.length ? (
                <p className="text-sm text-muted-foreground">No coupon redemptions yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                    <tr><th className="py-2">Code</th><th className="py-2 text-right">Uses</th><th className="py-2 text-right">Discount given</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {d.coupons.map((c) => (
                      <tr key={c.code}>
                        <td className="py-2 font-mono">{c.code}</td>
                        <td className="py-2 text-right">{c.used_count}</td>
                        <td className="py-2 text-right">{formatPKR(Number(c.total_discount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </AdminCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
