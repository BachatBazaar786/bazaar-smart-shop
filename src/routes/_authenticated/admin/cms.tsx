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
