import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCategoriesAdmin, upsertCategoryAdmin, deleteCategoryAdmin } from "@/lib/admin.functions";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminUI";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/categories")({ component: CategoriesPage });

type Cat = {
  id: string; name: string; slug: string; description: string | null; image_url: string | null;
  parent_id: string | null; sort_order: number; active: boolean;
  seo_title: string | null; seo_description: string | null;
};

const emptyCat: Partial<Cat> = { name: "", slug: "", sort_order: 0, active: true };

function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function CategoriesPage() {
  const list = useServerFn(listCategoriesAdmin);
  const save = useServerFn(upsertCategoryAdmin);
  const del = useServerFn(deleteCategoryAdmin);
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-categories"], queryFn: () => list() as Promise<Cat[]> });
  const [editing, setEditing] = useState<Partial<Cat> | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const saveMut = useMutation({
    mutationFn: (v: Partial<Cat>) => save({ data: v as never }),
    onSuccess: () => { toast.success("Saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-categories"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-categories"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AdminPageHeader
        title="Categories"
        subtitle={`${data.length} categories`}
        actions={<button onClick={() => setEditing(emptyCat)} className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary-dark"><Plus className="h-4 w-4" /> New category</button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {data.map((c) => (
          <div key={c.id} className="bg-background border border-border rounded-lg p-4 flex gap-3">
            <div className="h-16 w-16 rounded bg-muted overflow-hidden flex-shrink-0">
              {c.image_url && <img src={c.image_url} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{c.name}</div>
              <div className="text-xs text-muted-foreground">/{c.slug} · order {c.sort_order}</div>
              {!c.active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted mt-1 inline-block">inactive</span>}
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => setEditing(c)} className="p-1.5 rounded hover:bg-accent" title="Edit"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => { if (confirm(`Delete ${c.name}?`)) delMut.mutate(c.id); }} className="p-1.5 rounded text-destructive hover:bg-destructive/10" title="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {data.length === 0 && <div className="col-span-full text-center text-muted-foreground py-8">No categories yet.</div>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">{editing.id ? "Edit category" : "New category"}</h3>
              <button onClick={() => setEditing(null)} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <FormField label="Name">
                <input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.slug || slugify(e.target.value) })} className="input" />
              </FormField>
              <FormField label="Slug">
                <input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} className="input" />
              </FormField>
              <FormField label="Description">
                <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} className="input" />
              </FormField>
              <FormField label="Parent category">
                <select value={editing.parent_id ?? ""} onChange={(e) => setEditing({ ...editing, parent_id: e.target.value || null })} className="input">
                  <option value="">— top level —</option>
                  {data.filter((c) => c.id !== editing.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FormField>
              <FormField label="Image">
                {editing.image_url ? (
                  <div className="flex items-center gap-2">
                    <img src={editing.image_url} alt="" className="h-16 w-16 object-cover rounded" />
                    <button onClick={() => setEditing({ ...editing, image_url: null })} className="text-xs text-destructive">Remove</button>
                  </div>
                ) : (
                  <button onClick={() => setShowPicker(true)} className="text-sm border border-dashed border-border rounded px-3 py-2">Select from media</button>
                )}
                {showPicker && (
                  <div className="mt-2 border border-border rounded p-3 bg-muted/30">
                    <MediaPicker bucket="media" onPick={(url) => { setEditing({ ...editing, image_url: url }); setShowPicker(false); }} />
                  </div>
                )}
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Sort order"><input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} className="input" /></FormField>
                <FormField label="Active"><select value={String(editing.active ?? true)} onChange={(e) => setEditing({ ...editing, active: e.target.value === "true" })} className="input"><option value="true">Yes</option><option value="false">No</option></select></FormField>
              </div>
              <FormField label="SEO title"><input value={editing.seo_title ?? ""} onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })} className="input" /></FormField>
              <FormField label="SEO description"><textarea value={editing.seo_description ?? ""} onChange={(e) => setEditing({ ...editing, seo_description: e.target.value })} rows={2} className="input" /></FormField>
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-3 py-2 text-sm rounded-md border border-border hover:bg-accent">Cancel</button>
              <button onClick={() => saveMut.mutate(editing)} disabled={saveMut.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary-dark disabled:opacity-60">{saveMut.isPending ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
      <style>{`.input { width: 100%; border-radius: 0.375rem; border: 1px solid hsl(var(--border)); padding: 0.5rem 0.75rem; font-size: 0.875rem; background: hsl(var(--background)); }`}</style>
    </div>
  );

  function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="mt-1">{children}</div>
      </label>
    );
  }
}

// AdminCard imported but unused — keep for consistency; suppress unused
void AdminCard;
