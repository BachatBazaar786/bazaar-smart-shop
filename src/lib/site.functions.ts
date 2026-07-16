import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { safeError } from "./server-errors";

function getPublicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export type NavItem = { label: string; href: string };
export type SiteSettings = {
  site_name?: string;
  tagline?: string;
  logo_url?: string;
  favicon_url?: string;
  whatsapp_number?: string;
  whatsapp_message?: string;
  notification_email?: string;
  currency_symbol?: string;
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

export type SiteBootstrap = {
  settings: SiteSettings;
  sections: Record<string, Record<string, unknown>>;
  navigation: NavItem[];
};

export const getSiteBootstrap = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteBootstrap> => {
    const s = getPublicClient();
    const [settingsRes, contentRes] = await Promise.all([
      s.from("site_settings").select("data").maybeSingle(),
      s.from("site_content").select("section_key, data"),
    ]);
    if (settingsRes.error) throw safeError("site_settings_pub", settingsRes.error);
    if (contentRes.error) throw safeError("site_content_pub", contentRes.error);

    const sections: Record<string, Record<string, unknown>> = {};
    for (const row of contentRes.data ?? []) {
      sections[row.section_key as string] = (row.data ?? {}) as Record<string, unknown>;
    }

    const navRaw = sections["navigation"]?.items;
    const navigation: NavItem[] = Array.isArray(navRaw)
      ? (navRaw as unknown[])
          .filter((n): n is NavItem => !!n && typeof n === "object" && typeof (n as NavItem).label === "string" && typeof (n as NavItem).href === "string")
          .slice(0, 20)
      : [];

    return {
      settings: ((settingsRes.data?.data ?? {}) as SiteSettings) ?? {},
      sections,
      navigation,
    };
  },
);
