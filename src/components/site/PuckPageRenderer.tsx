import { useQuery } from "@tanstack/react-query";
import { Render } from "@measured/puck";
import { getPageLayoutPublic } from "@/lib/page-layouts.functions";
import { puckConfig, type PuckData } from "@/lib/puck.config";

/** Renders a page's Puck layout. If empty, renders nothing so the route's default content shows. */
export function PuckPageRenderer({ pageKey }: { pageKey: string }) {
  const { data } = useQuery({
    queryKey: ["page-layout", pageKey],
    queryFn: () => getPageLayoutPublic({ data: { page_key: pageKey } }),
    staleTime: 60_000,
  });
  const layout = data?.data as PuckData | undefined;
  if (!layout || !Array.isArray(layout.content) || layout.content.length === 0) return null;
  return <Render config={puckConfig} data={layout} />;
}
