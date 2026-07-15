import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { MediaPicker } from "@/components/admin/MediaPicker";

export const Route = createFileRoute("/_authenticated/admin/media")({ component: MediaPage });

function MediaPage() {
  const [bucket, setBucket] = useState<"media" | "product-images">("media");
  return (
    <div>
      <AdminPageHeader title="Media library" subtitle="Upload images for the site & product galleries" />

      <div className="flex gap-2 mb-4 text-sm">
        <button onClick={() => setBucket("media")} className={`px-3 py-1.5 rounded-md ${bucket === "media" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>Site media</button>
        <button onClick={() => setBucket("product-images")} className={`px-3 py-1.5 rounded-md ${bucket === "product-images" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>Product images</button>
      </div>

      <MediaPicker bucket={bucket} />
    </div>
  );
}
