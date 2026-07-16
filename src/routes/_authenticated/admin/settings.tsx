import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSiteSettingsAdmin, upsertSiteSettingsAdmin } from "@/lib/admin.functions";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminUI";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({ component: SettingsPage });

type Settings = {
  site_name?: string;
  tagline?: string;
  logo_url?: string;
  currency?: string;
  currency_symbol?: string;
  shipping_flat?: string;
  free_shipping_min?: string;
  seo_title?: string;
  seo_description?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_youtube?: string;
  social_tiktok?: string;
  google_analytics_id?: string;
  meta_pixel_id?: string;
  bank_details?: string;
  jazzcash?: string;
  easypaisa?: string;
};

function SettingsPage() {
  const get = useServerFn(getSiteSettingsAdmin);
  const save = useServerFn(upsertSiteSettingsAdmin);
  const { data } = useQuery({ queryKey: ["site-settings"], queryFn: () => get() });
  const [v, setV] = useState<Settings>({});
  useEffect(() => {
    if (data) setV(((data as { data: Settings } | null)?.data ?? {}));
  }, [data]);

  const mut = useMutation({
    mutationFn: () => save({ data: { data: v as Record<string, unknown> } }),
    onSuccess: () => toast.success("Settings saved"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AdminPageHeader title="Settings" subtitle="Store-wide configuration"
        actions={<button onClick={() => mut.mutate()} disabled={mut.isPending} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-60">{mut.isPending ? "Saving…" : "Save all"}</button>} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdminCard title="General">
          <Field label="Site name"><input value={v.site_name ?? ""} onChange={(e) => setV({ ...v, site_name: e.target.value })} className="input" /></Field>
          <Field label="Tagline"><input value={v.tagline ?? ""} onChange={(e) => setV({ ...v, tagline: e.target.value })} className="input" /></Field>
          <Field label="Logo URL"><input value={v.logo_url ?? ""} onChange={(e) => setV({ ...v, logo_url: e.target.value })} className="input" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Currency"><input value={v.currency ?? "PKR"} onChange={(e) => setV({ ...v, currency: e.target.value })} className="input" /></Field>
            <Field label="Currency symbol"><input value={v.currency_symbol ?? "Rs"} onChange={(e) => setV({ ...v, currency_symbol: e.target.value })} className="input" /></Field>
          </div>
        </AdminCard>

        <AdminCard title="Shipping">
          <Field label="Flat shipping fee (PKR)"><input type="number" value={v.shipping_flat ?? ""} onChange={(e) => setV({ ...v, shipping_flat: e.target.value })} className="input" /></Field>
          <Field label="Free shipping over (PKR)"><input type="number" value={v.free_shipping_min ?? ""} onChange={(e) => setV({ ...v, free_shipping_min: e.target.value })} className="input" /></Field>
        </AdminCard>

        <AdminCard title="SEO defaults">
          <Field label="Default meta title"><input value={v.seo_title ?? ""} onChange={(e) => setV({ ...v, seo_title: e.target.value })} className="input" /></Field>
          <Field label="Default meta description"><textarea value={v.seo_description ?? ""} onChange={(e) => setV({ ...v, seo_description: e.target.value })} rows={3} className="input" /></Field>
        </AdminCard>

        <AdminCard title="Analytics">
          <Field label="Google Analytics ID"><input value={v.google_analytics_id ?? ""} onChange={(e) => setV({ ...v, google_analytics_id: e.target.value })} className="input" placeholder="G-XXXXXXXXXX" /></Field>
          <Field label="Meta Pixel ID"><input value={v.meta_pixel_id ?? ""} onChange={(e) => setV({ ...v, meta_pixel_id: e.target.value })} className="input" /></Field>
        </AdminCard>

        <AdminCard title="Social">
          <Field label="Facebook URL"><input value={v.social_facebook ?? ""} onChange={(e) => setV({ ...v, social_facebook: e.target.value })} className="input" /></Field>
          <Field label="Instagram URL"><input value={v.social_instagram ?? ""} onChange={(e) => setV({ ...v, social_instagram: e.target.value })} className="input" /></Field>
          <Field label="YouTube URL"><input value={v.social_youtube ?? ""} onChange={(e) => setV({ ...v, social_youtube: e.target.value })} className="input" /></Field>
          <Field label="TikTok URL"><input value={v.social_tiktok ?? ""} onChange={(e) => setV({ ...v, social_tiktok: e.target.value })} className="input" /></Field>
        </AdminCard>

        <AdminCard title="Payment info (shown at checkout)">
          <Field label="Bank details"><textarea value={v.bank_details ?? ""} onChange={(e) => setV({ ...v, bank_details: e.target.value })} rows={3} className="input" /></Field>
          <Field label="JazzCash number"><input value={v.jazzcash ?? ""} onChange={(e) => setV({ ...v, jazzcash: e.target.value })} className="input" /></Field>
          <Field label="EasyPaisa number"><input value={v.easypaisa ?? ""} onChange={(e) => setV({ ...v, easypaisa: e.target.value })} className="input" /></Field>
        </AdminCard>
      </div>
      <style>{`.input { width: 100%; border-radius: 0.375rem; border: 1px solid var(--border); padding: 0.5rem 0.75rem; font-size: 0.875rem; background: var(--background); margin-top: 0.25rem; }`}</style>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block mb-3"><span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>;
}
