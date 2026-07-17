import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import Papa from "papaparse";
import { bulkImportProductsAdmin } from "@/lib/admin.functions";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminUI";
import { Upload, Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/products/import")({
  component: ImportProductsPage,
});

const TEMPLATE_HEADERS = [
  "name",
  "slug",
  "sku",
  "short_description",
  "description",
  "price",
  "sale_price",
  "stock",
  "category_slug",
  "brand_slug",
  "status",
  "featured",
  "image_url",
];

const TEMPLATE_SAMPLE = [
  {
    name: "Sample Product",
    slug: "sample-product",
    sku: "SKU-001",
    short_description: "A short pitch",
    description: "Full description here",
    price: "1499",
    sale_price: "1299",
    stock: "50",
    category_slug: "grocery",
    brand_slug: "",
    status: "active",
    featured: "false",
    image_url: "https://example.com/image.jpg",
  },
];

type ParsedRow = Record<string, unknown>;

function ImportProductsPage() {
  const nav = useNavigate();
  const importFn = useServerFn(bulkImportProductsAdmin);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ created: number; failed: number; errors: { row: number; error: string }[] } | null>(null);

  const onFile = (file: File) => {
    setFileName(file.name);
    setResult(null);
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const cleaned = (res.data as ParsedRow[]).filter((r) => r && Object.values(r).some((v) => String(v ?? "").trim() !== ""));
        setRows(cleaned);
      },
      error: (err) => toast.error(`CSV parse failed: ${err.message}`),
    });
  };

  const importMut = useMutation({
    mutationFn: () => importFn({ data: { rows } }),
    onSuccess: (r) => {
      setResult(r);
      if (r.failed === 0) toast.success(`Imported ${r.created} products`);
      else toast.warning(`Imported ${r.created} · ${r.failed} failed`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadTemplate = () => {
    const csv = Papa.unparse({ fields: TEMPLATE_HEADERS, data: TEMPLATE_SAMPLE });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "products-template.csv";
    a.click();
  };

  return (
    <div>
      <AdminPageHeader
        title="Bulk import products"
        subtitle="Upload a CSV to create many products at once"
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
              <Download className="h-4 w-4" /> Download template
            </button>
            <Link to="/admin/products" className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
              <ArrowLeft className="h-4 w-4" /> Back to products
            </Link>
          </div>
        }
      />

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <AdminCard title="1. Upload CSV">
            <label className="block border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-accent/40">
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <div className="mt-2 font-medium">{fileName || "Choose a CSV file"}</div>
              <div className="text-xs text-muted-foreground mt-1">First row must contain column headers</div>
            </label>
          </AdminCard>

          {rows.length > 0 && (
            <AdminCard title={`2. Preview (${rows.length} row${rows.length === 1 ? "" : "s"})`}>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-xs">
                  <thead className="text-left uppercase text-muted-foreground bg-muted/50">
                    <tr>
                      {Object.keys(rows[0] ?? {}).map((h) => (
                        <th key={h} className="px-2 py-2 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((r, i) => (
                      <tr key={i} className="border-t border-border/50">
                        {Object.keys(rows[0] ?? {}).map((h) => (
                          <td key={h} className="px-2 py-1.5 whitespace-nowrap max-w-[200px] truncate">{String(r[h] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 20 && (
                  <div className="text-center text-xs text-muted-foreground py-2">…and {rows.length - 20} more</div>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => { setRows([]); setFileName(""); setResult(null); }} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Clear</button>
                <button
                  onClick={() => importMut.mutate()}
                  disabled={importMut.isPending}
                  className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
                >
                  {importMut.isPending ? "Importing…" : `Import ${rows.length} product${rows.length === 1 ? "" : "s"}`}
                </button>
              </div>
            </AdminCard>
          )}

          {result && (
            <AdminCard title="3. Results">
              <div className="flex gap-4 mb-3">
                <div className="text-sm"><span className="font-semibold text-emerald-700">{result.created}</span> created</div>
                <div className="text-sm"><span className="font-semibold text-rose-700">{result.failed}</span> failed</div>
              </div>
              {result.errors.length > 0 && (
                <div className="border border-border rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-left uppercase text-muted-foreground">
                      <tr><th className="px-2 py-2 w-20">Row</th><th className="px-2 py-2">Error</th></tr>
                    </thead>
                    <tbody>
                      {result.errors.map((e, i) => (
                        <tr key={i} className="border-t border-border/50">
                          <td className="px-2 py-1.5">{e.row}</td>
                          <td className="px-2 py-1.5 text-rose-700">{e.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {result.created > 0 && (
                <div className="mt-4">
                  <button onClick={() => nav({ to: "/admin/products" })} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary-dark">
                    View products
                  </button>
                </div>
              )}
            </AdminCard>
          )}
        </div>

        <div>
          <AdminCard title="CSV format">
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">name</strong> — required</li>
              <li><strong className="text-foreground">price</strong> — required, number</li>
              <li><strong className="text-foreground">slug, sku</strong> — auto-generated if empty</li>
              <li><strong className="text-foreground">stock</strong> — integer, default 0</li>
              <li><strong className="text-foreground">status</strong> — draft / active / archived (default active)</li>
              <li><strong className="text-foreground">featured</strong> — true / false</li>
              <li><strong className="text-foreground">category_slug, brand_slug</strong> — must match an existing slug or leave blank</li>
              <li><strong className="text-foreground">image_url</strong> — public URL used as the first product image</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-4">Download the template above for a working starter.</p>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
