import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Puck } from "@measured/puck";
import "@/styles/puck.css";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getPageLayoutPublic, savePageLayoutAdmin } from "@/lib/page-layouts.functions";
import { puckConfig, type PuckData } from "@/lib/puck.config";

export const Route = createFileRoute("/_authenticated/admin/visual-editor")({
  ssr: false,
  component: VisualEditor,
});

const PAGES: { value: string; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "shop", label: "Shop landing" },
  { value: "about", label: "About" },
  { value: "contact", label: "Contact" },
];

const EMPTY: PuckData = { content: [], root: {} } as PuckData;

function VisualEditor() {
  const [pageKey, setPageKey] = useState("home");
  const getFn = useServerFn(getPageLayoutPublic);
  const saveFn = useServerFn(savePageLayoutAdmin);

  const layoutQ = useQuery({
    queryKey: ["admin-page-layout", pageKey],
    queryFn: () => getFn({ data: { page_key: pageKey } }),
  });

  const [initialData, setInitialData] = useState<PuckData>(EMPTY);
  useEffect(() => {
    const d = (layoutQ.data?.data as PuckData | undefined) ?? EMPTY;
    setInitialData(d);
  }, [layoutQ.data, pageKey]);

  const handleSave = async (data: PuckData) => {
    try {
      await saveFn({ data: { page_key: pageKey, data: data as unknown as Record<string, unknown> } });
      toast.success("Saved. Visit the page to see it live.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Visual page editor"
        subtitle="Drag blocks to design the announcement bar, hero and body of every page. Uploads live in Media."
      />

      <div className="mb-4 flex items-center gap-3">
        <Label className="!m-0">Page</Label>
        <select
          className="border border-border rounded-md px-2 py-1.5 text-sm"
          value={pageKey}
          onChange={(e) => setPageKey(e.target.value)}
        >
          {PAGES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <a
          href={`/admin/media`}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-primary underline underline-offset-2"
        >
          Open Media library ↗
        </a>
      </div>

      {layoutQ.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading editor…</div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden bg-background" style={{ height: "calc(100vh - 220px)" }}>
          <Puck
            key={pageKey}
            config={puckConfig}
            data={initialData}
            onPublish={handleSave}
          />
        </div>
      )}
    </div>
  );
}
