import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCustomerAdmin, addCustomerNoteAdmin, setCustomerRoleAdmin } from "@/lib/admin.functions";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminUI";
import { formatPKR } from "@/lib/format";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/customers/$id")({ component: CustomerDetail });

function CustomerDetail() {
  const { id } = Route.useParams();
  const get = useServerFn(getCustomerAdmin);
  const addNote = useServerFn(addCustomerNoteAdmin);
  const setRole = useServerFn(setCustomerRoleAdmin);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-customer", id], queryFn: () => get({ data: { id } }) });
  const [note, setNote] = useState("");

  const noteMut = useMutation({
    mutationFn: () => addNote({ data: { user_id: id, note } }),
    onSuccess: () => { toast.success("Note added"); setNote(""); qc.invalidateQueries({ queryKey: ["admin-customer", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const roleMut = useMutation({
    mutationFn: (role: "admin" | "customer") => setRole({ data: { user_id: id, role } }),
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["admin-customer", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <div className="text-muted-foreground">Loading…</div>;
  const d = data as {
    profile: { id: string; full_name: string | null; phone: string | null; avatar_url: string | null; created_at: string } | null;
    orders: { id: string; order_number: string; status: string; payment_status: string; total: number; created_at: string }[];
    notes: { id: string; note: string; created_at: string }[];
    addresses: { id: string; full_name: string; line1: string; city: string; province: string; phone: string }[];
    roles: string[];
  };
  if (!d.profile) return <div>Customer not found.</div>;

  const totalSpent = d.orders.filter((o) => o.payment_status === "paid").reduce((s, o) => s + Number(o.total), 0);
  const isAdmin = d.roles.includes("admin") || d.roles.includes("super_admin");
  const isSuper = d.roles.includes("super_admin");

  return (
    <div>
      <AdminPageHeader
        title={d.profile.full_name || "Customer"}
        subtitle={`Member since ${new Date(d.profile.created_at).toLocaleDateString()}`}
        actions={<Link to="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <AdminCard title="Orders">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground text-left">
                  <tr><th className="py-2">Order</th><th>Status</th><th>Payment</th><th className="text-right">Total</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {d.orders.map((o) => (
                    <tr key={o.id} className="border-t border-border/50">
                      <td className="py-2"><Link to="/admin/orders/$id" params={{ id: o.order_number }} className="text-primary hover:underline">{o.order_number}</Link></td>
                      <td className="text-xs"><span className="px-2 py-1 rounded-full bg-muted capitalize">{o.status}</span></td>
                      <td className="text-xs"><span className="px-2 py-1 rounded-full bg-muted capitalize">{o.payment_status}</span></td>
                      <td className="text-right font-medium">{formatPKR(Number(o.total))}</td>
                      <td className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {d.orders.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No orders.</td></tr>}
                </tbody>
              </table>
            </div>
          </AdminCard>

          <AdminCard title="Saved addresses">
            {d.addresses.length === 0 ? <div className="text-sm text-muted-foreground">No addresses saved.</div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {d.addresses.map((a) => (
                  <div key={a.id} className="p-3 border border-border rounded-md text-sm">
                    <div className="font-medium">{a.full_name}</div>
                    <div className="text-muted-foreground">{a.line1}</div>
                    <div className="text-muted-foreground">{a.city}, {a.province}</div>
                    <div className="text-xs text-muted-foreground mt-1">{a.phone}</div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          <AdminCard title="Internal notes">
            <div className="flex gap-2 mb-3">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add note…" className="flex-1 rounded-md border border-border px-3 py-2 text-sm" />
              <button onClick={() => note.trim() && noteMut.mutate()} disabled={noteMut.isPending || !note.trim()} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-60">Add</button>
            </div>
            <ul className="space-y-2">
              {d.notes.map((n) => (
                <li key={n.id} className="p-3 border border-border rounded-md text-sm">
                  <div>{n.note}</div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                </li>
              ))}
              {d.notes.length === 0 && <li className="text-sm text-muted-foreground">No notes yet.</li>}
            </ul>
          </AdminCard>
        </div>

        <div className="space-y-4">
          <AdminCard title="Summary">
            <div className="text-sm space-y-2">
              <div>Total orders: <span className="font-medium">{d.orders.length}</span></div>
              <div>Lifetime spend: <span className="font-medium">{formatPKR(totalSpent)}</span></div>
              <div>Roles: <span className="font-medium capitalize">{d.roles.join(", ") || "customer"}</span></div>
              <div className="text-muted-foreground pt-2">Phone: {d.profile.phone || "—"}</div>
            </div>
          </AdminCard>
          <AdminCard title="Access">
            {isSuper ? <div className="text-sm text-muted-foreground">Super admin — role cannot be changed here.</div> : (
              <div className="space-y-2">
                <button disabled={isAdmin || roleMut.isPending} onClick={() => roleMut.mutate("admin")} className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm disabled:opacity-40">Make admin</button>
                <button disabled={!isAdmin || roleMut.isPending} onClick={() => roleMut.mutate("customer")} className="w-full rounded-md border border-border py-2 text-sm disabled:opacity-40">Revoke admin</button>
                <div className="text-xs text-muted-foreground">Only the super admin can change customer roles.</div>
              </div>
            )}
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
