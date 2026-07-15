import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBrandsAdmin, upsertBrandAdmin, deleteBrandAdmin } from "@/lib/admin.functions";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/brands")({ component: BrandsPage });

type Brand = { id: string; name: string; slug: string; logo_url: string | null; banner_url: string | null; description: string | null; seo_title: string | null; seo_description: string | null };
const empty: Partial<Brand> = { name: "", slug: "" };
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function BrandsPage() {
  const list = useServerFn(listBrandsAdmin);
  const save = useServerFn(upsertBrandAdmin);
  const del = useServerFn(deleteBrandAdmin);
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-brands"], queryFn: () => list() as Promise<Brand[]> });
  const [editing, setEditing] = useState<Partial<Brand> | null>(null);
  const [picker, setPicker] = useState<"logo" | "banner" | null>(null);

  const saveMut = useMutation({
    mutationFn: (v: Partial<Brand>) => save({ data: v as never }),
    onSuccess: () => { toast.success("Saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-brands"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-brands"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AdminPageHeader title="Brands" subtitle={`${data.length} brands`}
        actions={<button onClick={() => setEditing(empty)} className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary-dark"><Plus className="h-4 w-4" /> New brand</button>} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {data.map((b) => (
          <div key={b.id} className="bg-background border border-border rounded-lg p-4 flex gap-3">
            <div className="h-14 w-14 rounded bg-muted overflow-hidden flex-shrink-0">
              {b.logo_url && <img src={b.logo_url} alt="" className="w-full h-full object-contain p-1" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{b.name}</div>
              <div className="text-xs text-muted-foreground">/{b.slug}</div>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => setEditing(b)} className="p-1.5 rounded hover:bg-accent"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => { if (confirm(`Delete ${b.name}?`)) delMut.mutate(b.id); }} className="p-1.5 rounded text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {data.length === 0 && <div className="col-span-full text-center text-muted-foreground py-8">No brands yet.</div>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">{editing.id ? "Edit brand" : "New brand"}</h3>
              <button onClick={() => setEditing(null)} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <F label="Name"><input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.slug || slugify(e.target.value) })} className="input" /></F>
              <F label="Slug"><input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} className="input" /></F>
              <F label="Description"><textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} className="input" /></F>
              <F label="Logo">
                {editing.logo_url ? (
                  <div className="flex items-center gap-2"><img src={editing.logo_url} alt="" className="h-14 w-14 object-contain rounded border border-border" /><button onClick={() => setEditing({ ...editing, logo_url: null })} className="text-xs text-destructive">Remove</button></div>
                ) : <button onClick={() => setPicker("logo")} className="text-sm border border-dashed rounded px-3 py-2">Choose from media</button>}
              </F>
              <F label="Banner">
                {editing.banner_url ? (
                  <div className="flex items-center gap-2"><img src={editing.banner_url} alt="" className="h-16 w-32 object-cover rounded" /><button onClick={() => setEditing({ ...editing, banner_url: null })} className="text-xs text-destructive">Remove</button></div>
                ) : <button onClick={() => setPicker("banner")} className="text-sm border border-dashed rounded px-3 py-2">Choose from media</button>}
              </F>
              {picker && (
                <div className="border border-border rounded p-3 bg-muted/30">
                  <MediaPicker bucket="media" onPick={(url) => {
                    setEditing({ ...editing, ...(picker === "logo" ? { logo_url: url } : { banner_url: url }) });
                    setPicker(null);
                  }} />
                </div>
              )}
              <F label="SEO title"><input value={editing.seo_title ?? ""} onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })} className="input" /></F>
              <F label="SEO description"><textarea value={editing.seo_description ?? ""} onChange={(e) => setEditing({ ...editing, seo_description: e.target.value })} rows={2} className="input" /></F>
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
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span><div className="mt-1">{children}</div></label>;
}
