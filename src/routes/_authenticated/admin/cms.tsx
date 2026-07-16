import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSiteContentAdmin, upsertSiteContentAdmin } from "@/lib/admin.functions";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminUI";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/cms")({ component: CmsPage });

const SECTIONS: { key: string; label: string; description: string; fields: { key: string; label: string; type: "text" | "textarea" | "url" }[] }[] = [
  {
    key: "hero",
    label: "Homepage hero",
    description: "The banner shown at the top of the home page.",
    fields: [
      { key: "eyebrow", label: "Eyebrow (small tag)", type: "text" },
      { key: "title", label: "Headline", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "cta_label", label: "CTA button label", type: "text" },
      { key: "cta_href", label: "CTA button link", type: "text" },
      { key: "image_url", label: "Hero image URL", type: "url" },
    ],
  },
  {
    key: "announcement",
    label: "Announcement bar",
    description: "Top strip messages (one per line).",
    fields: [{ key: "messages", label: "Messages (one per line)", type: "textarea" }],
  },
  {
    key: "footer",
    label: "Footer content",
    description: "About text and contact info shown in the footer.",
    fields: [
      { key: "description", label: "About / description", type: "textarea" },
      { key: "email", label: "Contact email", type: "text" },
      { key: "phone", label: "Contact phone", type: "text" },
      { key: "address", label: "Address", type: "textarea" },
    ],
  },
  {
    key: "about_page",
    label: "About page",
    description: "About Us content.",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Body (markdown)", type: "textarea" },
    ],
  },
  {
    key: "contact_page",
    label: "Contact page",
    description: "Contact info shown on Contact page.",
    fields: [
      { key: "email", label: "Support email", type: "text" },
      { key: "phone", label: "Support phone", type: "text" },
      { key: "whatsapp", label: "WhatsApp number", type: "text" },
      { key: "address", label: "Address", type: "textarea" },
    ],
  },
  {
    key: "privacy_policy",
    label: "Privacy policy",
    description: "Full page content.",
    fields: [{ key: "body", label: "Body (markdown)", type: "textarea" }],
  },
  {
    key: "terms_of_service",
    label: "Terms of service",
    description: "Full page content.",
    fields: [{ key: "body", label: "Body (markdown)", type: "textarea" }],
  },
  {
    key: "shipping_policy",
    label: "Shipping policy",
    description: "Full page content.",
    fields: [{ key: "body", label: "Body (markdown)", type: "textarea" }],
  },
  {
    key: "return_policy",
    label: "Return & refund policy",
    description: "Full page content.",
    fields: [{ key: "body", label: "Body (markdown)", type: "textarea" }],
  },
];

function CmsPage() {
  const listFn = useServerFn(listSiteContentAdmin);
  const saveFn = useServerFn(upsertSiteContentAdmin);
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["site-content"],
    queryFn: () => listFn() as Promise<{ section_key: string; data: Record<string, unknown> }[]>,
  });

  return (
    <div>
      <AdminPageHeader title="Content management" subtitle="Edit site content — no code required." />
      <div className="grid grid-cols-1 gap-4">
        <NavigationEditor
          initial={(data.find((d) => d.section_key === "navigation")?.data ?? {}) as { items?: { label: string; href: string }[] }}
          onSave={(payload) => saveFn({ data: { section_key: "navigation", data: payload } })}
          onSaved={() => qc.invalidateQueries({ queryKey: ["site-content"] })}
        />
        {SECTIONS.map((s) => (
          <SectionEditor
            key={s.key}
            section={s}
            initial={(data.find((d) => d.section_key === s.key)?.data ?? {}) as Record<string, string>}
            onSave={(payload) => saveFn({ data: { section_key: s.key, data: payload } })}
            onSaved={() => qc.invalidateQueries({ queryKey: ["site-content"] })}
          />
        ))}
      </div>
    </div>
  );
}

function NavigationEditor({
  initial,
  onSave,
  onSaved,
}: {
  initial: { items?: { label: string; href: string }[] };
  onSave: (data: { items: { label: string; href: string }[] }) => Promise<unknown>;
  onSaved: () => void;
}) {
  const [items, setItems] = useState<{ label: string; href: string }[]>(initial.items ?? []);
  useEffect(() => { setItems(initial.items ?? []); }, [initial]);
  const mut = useMutation({
    mutationFn: () => onSave({ items }),
    onSuccess: () => { toast.success("Navigation saved"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminCard
      title="Header navigation"
      action={
        <button onClick={() => mut.mutate()} disabled={mut.isPending} className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm hover:bg-primary-dark disabled:opacity-60">
          {mut.isPending ? "Saving…" : "Save"}
        </button>
      }
    >
      <p className="text-sm text-muted-foreground mb-3">Menu links shown in the top header. Leave empty to use defaults.</p>
      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-center">
            <input value={it.label} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, label: e.target.value } : x))} placeholder="Label" className="rounded-md border border-border px-3 py-2 text-sm" />
            <input value={it.href} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, href: e.target.value } : x))} placeholder="/shop or https://…" className="rounded-md border border-border px-3 py-2 text-sm" />
            <button type="button" onClick={() => setItems(items.map((x, i) => i === idx - 1 ? items[idx] : i === idx ? items[idx - 1] : x))} disabled={idx === 0} className="px-2 py-1 text-xs rounded border border-border disabled:opacity-40">↑</button>
            <button type="button" onClick={() => setItems(items.map((x, i) => i === idx + 1 ? items[idx] : i === idx ? items[idx + 1] : x))} disabled={idx === items.length - 1} className="px-2 py-1 text-xs rounded border border-border disabled:opacity-40">↓</button>
            <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="px-2 py-1 text-xs rounded border border-border text-destructive">Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => setItems([...items, { label: "", href: "" }])} className="mt-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">+ Add link</button>
      </div>
    </AdminCard>
  );
}


function SectionEditor({
  section,
  initial,
  onSave,
  onSaved,
}: {
  section: (typeof SECTIONS)[number];
  initial: Record<string, string>;
  onSave: (data: Record<string, string>) => Promise<unknown>;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  useEffect(() => { setValues(initial); }, [initial]);

  const mut = useMutation({
    mutationFn: () => onSave(values),
    onSuccess: () => { toast.success(`${section.label} saved`); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminCard title={section.label} action={<button onClick={() => mut.mutate()} disabled={mut.isPending} className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm hover:bg-primary-dark disabled:opacity-60">{mut.isPending ? "Saving…" : "Save"}</button>}>
      <p className="text-sm text-muted-foreground mb-3">{section.description}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {section.fields.map((f) => (
          <label key={f.key} className={`block ${f.type === "textarea" ? "md:col-span-2" : ""}`}>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</span>
            {f.type === "textarea" ? (
              <textarea value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} rows={5} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
            ) : (
              <input type={f.type === "url" ? "url" : "text"} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
            )}
          </label>
        ))}
      </div>
    </AdminCard>
  );
}
