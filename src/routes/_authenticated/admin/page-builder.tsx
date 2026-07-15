import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  listPageBlocksAdmin,
  upsertPageBlockAdmin,
  deletePageBlockAdmin,
} from "@/lib/phase6.functions";
import { AdminPageHeader, AdminCard } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/page-builder")({ component: PageBuilder });

type BlockType = "hero" | "banner" | "category_grid" | "product_grid" | "promo" | "text" | "features";

const blockLabels: Record<BlockType, string> = {
  hero: "Hero", banner: "Banner", category_grid: "Category grid",
  product_grid: "Product grid", promo: "Promo strip", text: "Text section", features: "Feature icons",
};

function PageBuilder() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPageBlocksAdmin);
  const upFn = useServerFn(upsertPageBlockAdmin);
  const delFn = useServerFn(deletePageBlockAdmin);

  const [pageKey, setPageKey] = useState("home");
  const blocks = useQuery({
    queryKey: ["admin", "page-blocks", pageKey],
    queryFn: () => listFn({ data: { page_key: pageKey } }),
  });

  const [type, setType] = useState<BlockType>("hero");
  const [dataJson, setDataJson] = useState('{\n  "title": "Welcome",\n  "subtitle": "Save more at bazaar prices"\n}');

  const add = useMutation({
    mutationFn: () => {
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(dataJson); } catch { throw new Error("Invalid JSON"); }
      const next = (blocks.data?.length ?? 0) * 10 + 10;
      return upFn({
        data: {
          page_key: pageKey,
          block_type: type,
          data: parsed,
          sort_order: next,
          active: true,
        },
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "page-blocks", pageKey] }); toast.success("Block added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "page-blocks", pageKey] }),
  });

  const move = useMutation({
    mutationFn: async ({ id, sort_order, block_type, data, active }: { id: string; sort_order: number; block_type: string; data: unknown; active: boolean }) =>
      upFn({ data: { id, page_key: pageKey, block_type: block_type as BlockType, data: data as Record<string, unknown>, sort_order, active } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "page-blocks", pageKey] }),
  });

  const toggleActive = useMutation({
    mutationFn: (b: { id: string; sort_order: number; block_type: string; data: unknown; active: boolean }) =>
      upFn({ data: { id: b.id, page_key: pageKey, block_type: b.block_type as BlockType, data: b.data as Record<string, unknown>, sort_order: b.sort_order, active: !b.active } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "page-blocks", pageKey] }),
  });

  const items = useMemo(() => blocks.data ?? [], [blocks.data]);

  const swap = (idx: number, dir: -1 | 1) => {
    const target = items[idx + dir];
    const src = items[idx];
    if (!target || !src) return;
    move.mutate({ id: src.id, sort_order: target.sort_order, block_type: src.block_type, data: src.data, active: !!src.active });
    move.mutate({ id: target.id, sort_order: src.sort_order, block_type: target.block_type, data: target.data, active: !!target.active });
  };

  const templates: Record<BlockType, string> = {
    hero: '{\n  "title": "Winter savings up to 40%",\n  "subtitle": "Everyday essentials at bazaar prices",\n  "cta_label": "Shop now",\n  "cta_href": "/shop",\n  "image": "https://..."\n}',
    banner: '{\n  "image": "https://...",\n  "href": "/shop",\n  "alt": "Deal banner"\n}',
    category_grid: '{\n  "title": "Shop by category",\n  "slugs": ["superfoods", "spices", "grocery"]\n}',
    product_grid: '{\n  "title": "Featured",\n  "filter": "featured",\n  "limit": 8\n}',
    promo: '{\n  "text": "Free delivery over Rs. 3000"\n}',
    text: '{\n  "title": "About Bachat At Bazaar",\n  "body": "Some intro text..."\n}',
    features: '{\n  "items": [\n    {"icon":"truck","label":"Free delivery"},\n    {"icon":"shield","label":"Secure checkout"}\n  ]\n}',
  };

  return (
    <div>
      <AdminPageHeader title="Visual page builder" subtitle="Compose the homepage from ordered content blocks" />

      <div className="mb-4 flex items-center gap-3">
        <Label className="!m-0">Page</Label>
        <select className="border border-border rounded-md px-2 py-1.5 text-sm" value={pageKey} onChange={(e) => setPageKey(e.target.value)}>
          <option value="home">Home</option>
          <option value="shop">Shop landing</option>
          <option value="about">About</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
        <AdminCard title={`Blocks — ${pageKey}`}>
          {blocks.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !items.length ? (
            <p className="text-sm text-muted-foreground">No blocks yet. Add one on the right.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((b, i) => (
                <li key={b.id} className={`border border-border rounded-md p-3 ${b.active ? "" : "opacity-60"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{blockLabels[b.block_type as BlockType] ?? b.block_type}</span>
                      <span className="text-xs text-muted-foreground">order {b.sort_order}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="p-1 hover:bg-accent rounded" disabled={i === 0} onClick={() => swap(i, -1)}><ArrowUp className="h-4 w-4" /></button>
                      <button className="p-1 hover:bg-accent rounded" disabled={i === items.length - 1} onClick={() => swap(i, 1)}><ArrowDown className="h-4 w-4" /></button>
                      <button className="text-xs px-2 py-1 hover:bg-accent rounded" onClick={() => toggleActive.mutate({ id: b.id, sort_order: b.sort_order, block_type: b.block_type, data: b.data, active: !!b.active })}>
                        {b.active ? "Hide" : "Show"}
                      </button>
                      <button className="p-1 text-destructive hover:bg-destructive/10 rounded" onClick={() => { if (confirm("Delete block?")) del.mutate(b.id); }}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <pre className="mt-2 text-xs bg-muted/50 rounded p-2 overflow-x-auto">{JSON.stringify(b.data, null, 2)}</pre>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard title="Add block">
          <div className="space-y-3 text-sm">
            <div>
              <Label>Type</Label>
              <select className="w-full border border-border rounded-md px-2 py-2 mt-1" value={type} onChange={(e) => { const t = e.target.value as BlockType; setType(t); setDataJson(templates[t]); }}>
                {(Object.keys(blockLabels) as BlockType[]).map((k) => <option key={k} value={k}>{blockLabels[k]}</option>)}
              </select>
            </div>
            <div>
              <Label>Data (JSON)</Label>
              <Textarea rows={14} className="font-mono text-xs" value={dataJson} onChange={(e) => setDataJson(e.target.value)} />
            </div>
            <Button onClick={() => add.mutate()} disabled={add.isPending} className="w-full gap-1">
              <Plus className="h-4 w-4" /> Add block
            </Button>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
