import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getProductAdmin, upsertProductAdmin, listCategoriesAdmin, listBrandsAdmin, listTagsAdmin,
} from "@/lib/admin.functions";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminUI";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { ArrowLeft, Plus, Trash2, GripVertical, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { RichEditor, htmlToBenefits, benefitsToHtml } from "@/components/admin/RichEditor";

export const Route = createFileRoute("/_authenticated/admin/products/$id")({ component: ProductEditor });

type FormShape = {
  name: string; slug: string; sku: string;
  description: string; short_description: string; usage: string;
  benefits: string[]; tags: string[];
  price: number; sale_price: number | null; stock: number;
  category_id: string | null; brand_id: string | null;
  status: "draft" | "active" | "archived";
  featured: boolean; best_seller: boolean; new_arrival: boolean; on_deal: boolean;
  images: { url: string; alt: string }[];
  specifications: { label: string; value: string }[];
  tag_ids: string[];
};

const empty: FormShape = {
  name: "", slug: "", sku: "", description: "", short_description: "", usage: "",
  benefits: [], tags: [], price: 0, sale_price: null, stock: 0,
  category_id: null, brand_id: null, status: "draft",
  featured: false, best_seller: false, new_arrival: false, on_deal: false,
  images: [], specifications: [], tag_ids: [],
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function generateSku(name: string) {
  const base = slugify(name).toUpperCase().replace(/-/g, "").slice(0, 10) || "PROD";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BAB-${base}-${rand}`;
}

function ProductEditor() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const nav = useNavigate();
  const get = useServerFn(getProductAdmin);
  const save = useServerFn(upsertProductAdmin);
  const catsFn = useServerFn(listCategoriesAdmin);
  const brandsFn = useServerFn(listBrandsAdmin);
  const tagsFn = useServerFn(listTagsAdmin);

  const { data: existing } = useQuery({
    queryKey: ["admin-product", id],
    queryFn: () => get({ data: { id } }),
    enabled: !isNew,
  });
  const { data: cats = [] } = useQuery({ queryKey: ["admin-categories"], queryFn: () => catsFn() });
  const { data: brands = [] } = useQuery({ queryKey: ["admin-brands"], queryFn: () => brandsFn() });
  const { data: tagsList = [] } = useQuery({ queryKey: ["admin-tags"], queryFn: () => tagsFn() });

  const [f, setF] = useState<FormShape>(empty);
  const [pickerFor, setPickerFor] = useState<null | number>(null);

  useEffect(() => {
    if (isNew || !existing) return;
    const p = existing as unknown as {
      id: string; name: string; slug: string; sku: string;
      description: string | null; short_description: string | null; usage: string | null;
      benefits: string[]; tags: string[];
      price: number; sale_price: number | null; stock: number;
      category_id: string | null; brand_id: string | null;
      status: "draft" | "active" | "archived";
      featured: boolean; best_seller: boolean; new_arrival: boolean; on_deal: boolean;
      product_images: { url: string; alt: string | null; sort_order: number }[];
      product_specifications: { label: string; value: string; sort_order: number }[];
      product_tags: { tag_id: string }[];
    };
    setF({
      name: p.name, slug: p.slug, sku: p.sku,
      description: p.description ?? "", short_description: p.short_description ?? "", usage: p.usage ?? "",
      benefits: p.benefits ?? [], tags: p.tags ?? [],
      price: Number(p.price), sale_price: p.sale_price !== null ? Number(p.sale_price) : null,
      stock: p.stock, category_id: p.category_id, brand_id: p.brand_id,
      status: p.status, featured: p.featured, best_seller: p.best_seller, new_arrival: p.new_arrival, on_deal: p.on_deal,
      images: (p.product_images ?? []).sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ url: i.url, alt: i.alt ?? "" })),
      specifications: (p.product_specifications ?? []).sort((a, b) => a.sort_order - b.sort_order).map((s) => ({ label: s.label, value: s.value })),
      tag_ids: (p.product_tags ?? []).map((t) => t.tag_id),
    });
  }, [existing, isNew]);

  const mut = useMutation({
    mutationFn: () => save({ data: { ...(isNew ? {} : { id }), ...f } }),
    onSuccess: (r) => {
      toast.success(isNew ? "Product created" : "Saved");
      if (isNew) nav({ to: "/admin/products/$id", params: { id: r.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AdminPageHeader
        title={isNew ? "New product" : (f.name || "Edit product")}
        actions={
          <>
            <Link to="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
            <button onClick={() => mut.mutate()} disabled={mut.isPending} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-60">
              {mut.isPending ? "Saving…" : "Save product"}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <AdminCard title="Basics">
            <div className="space-y-3">
              <Field label="Name">
                <input
                  value={f.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setF({
                      ...f,
                      name,
                      slug: f.slug || slugify(name),
                      sku: f.sku || (name.trim() ? generateSku(name) : ""),
                    });
                  }}
                  className="input"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Slug"><input value={f.slug} onChange={(e) => setF({ ...f, slug: slugify(e.target.value) })} className="input" /></Field>
                <Field label="SKU">
                  <div className="flex gap-2">
                    <input value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} placeholder="Auto-generated" className="input flex-1" />
                    <button
                      type="button"
                      onClick={() => setF({ ...f, sku: generateSku(f.name || "product") })}
                      title="Generate new SKU"
                      className="inline-flex items-center justify-center px-2 rounded-md border border-border hover:bg-accent"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </Field>
              </div>
              <Field label="Short description">
                <RichEditor value={f.short_description} onChange={(v) => setF({ ...f, short_description: v })} minHeight={80} />
              </Field>
              <Field label="Full description">
                <RichEditor value={f.description} onChange={(v) => setF({ ...f, description: v })} minHeight={220} />
              </Field>
              <Field label="Usage / instructions">
                <RichEditor value={f.usage} onChange={(v) => setF({ ...f, usage: v })} minHeight={120} />
              </Field>
              <Field label="Benefits">
                <RichEditor
                  value={benefitsToHtml(f.benefits)}
                  onChange={(html) => setF({ ...f, benefits: htmlToBenefits(html) })}
                  minHeight={120}
                  placeholder="Add each benefit as a bullet or new line"
                />
                <p className="text-xs text-muted-foreground mt-1">Each bullet/line becomes a separate benefit chip.</p>
              </Field>
            </div>
          </AdminCard>

          <AdminCard title="Images">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              {f.images.map((img, i) => (
                <div key={i} className="relative border border-border rounded-md overflow-hidden">
                  <img src={img.url} alt={img.alt} className="w-full aspect-square object-cover" />
                  <input
                    value={img.alt}
                    onChange={(e) => {
                      const copy = [...f.images]; copy[i] = { ...copy[i], alt: e.target.value }; setF({ ...f, images: copy });
                    }}
                    placeholder="Alt text"
                    className="w-full text-xs px-2 py-1 border-t border-border"
                  />
                  <button type="button" onClick={() => setF({ ...f, images: f.images.filter((_, j) => j !== i) })} className="absolute top-1 right-1 p-1 rounded bg-background/80 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  {i > 0 && (
                    <button type="button" onClick={() => {
                      const copy = [...f.images]; [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]]; setF({ ...f, images: copy });
                    }} className="absolute top-1 left-1 p-1 rounded bg-background/80"><GripVertical className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setPickerFor(f.images.length)} className="border-2 border-dashed border-border rounded-md aspect-square flex items-center justify-center text-sm text-muted-foreground hover:bg-accent">
                <Plus className="h-5 w-5" />
              </button>
            </div>
            {pickerFor !== null && (
              <div className="border border-border rounded-md p-3 bg-muted/30">
                <MediaPicker bucket="product-images" onPick={(url) => {
                  setF({ ...f, images: [...f.images, { url, alt: f.name }] });
                  setPickerFor(null);
                }} />
                <button type="button" onClick={() => setPickerFor(null)} className="mt-2 text-sm text-muted-foreground">Close</button>
              </div>
            )}
          </AdminCard>

          <AdminCard title="Specifications">
            <div className="space-y-2">
              {f.specifications.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input value={s.label} onChange={(e) => { const c = [...f.specifications]; c[i] = { ...c[i], label: e.target.value }; setF({ ...f, specifications: c }); }} placeholder="Label" className="input flex-1" />
                  <input value={s.value} onChange={(e) => { const c = [...f.specifications]; c[i] = { ...c[i], value: e.target.value }; setF({ ...f, specifications: c }); }} placeholder="Value" className="input flex-1" />
                  <button type="button" onClick={() => setF({ ...f, specifications: f.specifications.filter((_, j) => j !== i) })} className="p-2 rounded text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => setF({ ...f, specifications: [...f.specifications, { label: "", value: "" }] })} className="inline-flex items-center gap-1 text-sm text-primary"><Plus className="h-4 w-4" /> Add spec</button>
            </div>
          </AdminCard>
        </div>

        <div className="space-y-4">
          <AdminCard title="Publishing">
            <Field label="Status">
              <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as FormShape["status"] })} className="input">
                <option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option>
              </select>
            </Field>
            <div className="space-y-1.5 mt-3">
              <Check label="Featured" checked={f.featured} onChange={(v) => setF({ ...f, featured: v })} />
              <Check label="Best seller" checked={f.best_seller} onChange={(v) => setF({ ...f, best_seller: v })} />
              <Check label="New arrival" checked={f.new_arrival} onChange={(v) => setF({ ...f, new_arrival: v })} />
              <Check label="On deal" checked={f.on_deal} onChange={(v) => setF({ ...f, on_deal: v })} />
            </div>
          </AdminCard>

          <AdminCard title="Pricing & inventory">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (PKR)"><input type="number" min="0" step="1" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} className="input" /></Field>
              <Field label="Sale price"><input type="number" min="0" step="1" value={f.sale_price ?? ""} onChange={(e) => setF({ ...f, sale_price: e.target.value === "" ? null : Number(e.target.value) })} className="input" /></Field>
              <Field label="Stock"><input type="number" min="0" step="1" value={f.stock} onChange={(e) => setF({ ...f, stock: Number(e.target.value) })} className="input" /></Field>
            </div>
          </AdminCard>

          <AdminCard title="Organization">
            <Field label="Category">
              <select value={f.category_id ?? ""} onChange={(e) => setF({ ...f, category_id: e.target.value || null })} className="input">
                <option value="">— none —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Brand">
              <select value={f.brand_id ?? ""} onChange={(e) => setF({ ...f, brand_id: e.target.value || null })} className="input">
                <option value="">— none —</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Tags">
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tagsList.map((t) => {
                  const on = f.tag_ids.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setF({ ...f, tag_ids: on ? f.tag_ids.filter((x) => x !== t.id) : [...f.tag_ids, t.id] })}
                      className={`text-xs px-2 py-1 rounded-full border ${on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
                    >
                      {t.name}
                    </button>
                  );
                })}
                {tagsList.length === 0 && <Link to="/admin/tags" className="text-xs text-primary">Create tags →</Link>}
              </div>
            </Field>
            <Field label="Search keywords (comma separated)">
              <input value={f.tags.join(", ")} onChange={(e) => setF({ ...f, tags: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} className="input" />
            </Field>
          </AdminCard>
        </div>
      </div>

      <style>{`.input { width: 100%; border-radius: 0.375rem; border: 1px solid var(--border); padding: 0.5rem 0.75rem; font-size: 0.875rem; background: var(--background); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
