import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSiteBootstrap, type SiteBootstrap, type SiteSettings, type NavItem } from "@/lib/site.functions";

const DEFAULT_BOOTSTRAP: SiteBootstrap = { settings: {}, sections: {}, navigation: [] };

const SiteContext = createContext<SiteBootstrap>(DEFAULT_BOOTSTRAP);

export function SiteProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ["site-bootstrap"],
    queryFn: () => getSiteBootstrap(),
    staleTime: 5 * 60_000,
  });
  return <SiteContext.Provider value={data ?? DEFAULT_BOOTSTRAP}>{children}</SiteContext.Provider>;
}

export function useSite() {
  return useContext(SiteContext);
}
export function useSiteSettings(): SiteSettings {
  return useContext(SiteContext).settings ?? {};
}
export function useSiteSection(key: string): Record<string, unknown> {
  return useContext(SiteContext).sections[key] ?? {};
}
export function useSiteNav(): NavItem[] {
  return useContext(SiteContext).navigation ?? [];
}
