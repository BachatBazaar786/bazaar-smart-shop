import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTagsAdmin, upsertTagAdmin, deleteTagAdmin } from "@/lib/admin.functions";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/tags")({ component: TagsPage });
type Tag = { id: string; name: string; slug: string };
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function TagsPage() {
  const list = useServerFn(listTagsAdmin);
  const save = useServerFn(upsertTagAdmin);
  const del = useServerFn(deleteTagAdmin);
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-tags"], queryFn: () => list() as Promise<Tag[]> });
  const [editing, setEditing] = useState<Partial<Tag> | null>(null);

  const saveMut = useMutation({
    mutationFn: (v: Partial<Tag>) => save({ data: v as never }),
    onSuccess: () => { toast.success("Saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-tags"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-tags"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AdminPageHeader title="Tags" subtitle={`${data.length} tags`}
        actions={<button onClick={() => setEditing({ name: "", slug: "" })} className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary-dark"><Plus className="h-4 w-4" /> New tag</button>} />

      <div className="bg-background border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground bg-muted/50">
            <tr><th className="px-3 py-2.5">Name</th><th className="px-3 py-2.5">Slug</th><th className="px-3 py-2.5 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.id} className="border-t border-border/50">
                <td className="px-3 py-2.5 font-medium">{t.name}</td>
                <td className="px-3 py-2.5 text-muted-foreground">/{t.slug}</td>
                <td className="px-3 py-2.5 text-right">
                  <button onClick={() => setEditing(t)} className="p-1.5 rounded hover:bg-accent"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm(`Delete ${t.name}?`)) delMut.mutate(t.id); }} className="p-1.5 rounded text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No tags yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background rounded-lg max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold mb-4">{editing.id ? "Edit tag" : "New tag"}</h3>
            <div className="space-y-3">
              <label className="block"><span className="text-xs uppercase text-muted-foreground">Name</span>
                <input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.slug || slugify(e.target.value) })} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" /></label>
              <label className="block"><span className="text-xs uppercase text-muted-foreground">Slug</span>
                <input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" /></label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-3 py-2 text-sm rounded-md border border-border">Cancel</button>
              <button onClick={() => saveMut.mutate(editing)} disabled={saveMut.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-60">{saveMut.isPending ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
