import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import imageCompression from "browser-image-compression";
import { listMediaAdmin, signMediaUploadAdmin, deleteMediaAdmin } from "@/lib/admin.functions";
import { Upload, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

type Bucket = "media" | "product-images";

export function MediaPicker({
  bucket = "product-images",
  onPick,
  showDelete = true,
}: {
  bucket?: Bucket;
  onPick?: (url: string) => void;
  showDelete?: boolean;
}) {
  const qc = useQueryClient();
  const list = useServerFn(listMediaAdmin);
  const signUp = useServerFn(signMediaUploadAdmin);
  const del = useServerFn(deleteMediaAdmin);
  const [copied, setCopied] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["admin-media", bucket],
    queryFn: () => list({ data: { bucket } }),
  });

  const filtered = useMemo(
    () => (q ? files.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())) : files),
    [files, q],
  );

  const deleteMut = useMutation({
    mutationFn: (name: string) => del({ data: { bucket, path: name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-media", bucket] }),
  });

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || !fileList.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        try {
          const compressed = file.type.startsWith("image/")
            ? await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 2000, useWebWorker: true })
            : file;
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
          const signed = await signUp({ data: { bucket, filename: safeName } });
          const uploadRes = await fetch(signed.signedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type || "application/octet-stream" },
            body: compressed,
          });
          if (!uploadRes.ok) throw new Error("Upload failed");
        } catch (e) {
          console.error(e);
          toast.error(`Upload failed: ${file.name}`);
        }
      }
      toast.success("Upload complete");
      qc.invalidateQueries({ queryKey: ["admin-media", bucket] });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search files..."
          className="flex-1 min-w-[160px] rounded-md border border-border px-3 py-2 text-sm"
        />
        <label className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium cursor-pointer hover:bg-primary-dark">
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading..." : "Upload"}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-6">Loading media…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-md">
          No files yet — upload one to start.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((f) => (
            <div key={f.name} className="group relative border border-border rounded-md overflow-hidden bg-background">
              <button
                type="button"
                onClick={() => onPick?.(f.url)}
                className="block aspect-square w-full bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
              </button>
              <div className="p-2 text-[11px] flex items-center justify-between gap-1">
                <span className="truncate flex-1" title={f.name}>{f.name}</span>
                <button
                  type="button"
                  onClick={() => copy(f.url)}
                  className="p-1 rounded hover:bg-accent"
                  title="Copy URL"
                >
                  {copied === f.url ? <Check className="h-3.5 w-3.5 text-savings" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                {showDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete ${f.name}?`)) deleteMut.mutate(f.name);
                    }}
                    className="p-1 rounded hover:bg-destructive/10 text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
