import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  getBlogPostAdmin,
  upsertBlogPostAdmin,
  listBlogCategoriesAdmin,
} from "@/lib/phase6.functions";
import { AdminPageHeader, AdminCard } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/blog/$id")({ component: BlogEditor });

type Status = "draft" | "published" | "archived";
type PostForm = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover_image: string;
  status: Status;
  seo_title: string;
  seo_description: string;
  reading_minutes: string;
  category_ids: string[];
};

const empty: PostForm = {
  title: "", slug: "", excerpt: "", body: "", cover_image: "",
  status: "draft", seo_title: "", seo_description: "", reading_minutes: "", category_ids: [],
};

function slugify(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function BlogEditor() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getBlogPostAdmin);
  const upFn = useServerFn(upsertBlogPostAdmin);
  const catsFn = useServerFn(listBlogCategoriesAdmin);

  const cats = useQuery({ queryKey: ["admin", "blog-cats"], queryFn: () => catsFn() });
  const existing = useQuery({
    queryKey: ["admin", "blog", id],
    queryFn: () => getFn({ data: { id } }),
    enabled: !isNew,
  });

  const [form, setForm] = useState<PostForm>(empty);

  useEffect(() => {
    if (!isNew && existing.data) {
      const p = existing.data as unknown as {
        id: string; title: string; slug: string; excerpt: string | null; body: string;
        cover_image: string | null; status: Status; seo_title: string | null; seo_description: string | null;
        reading_minutes: number | null; blog_post_categories: { category_id: string }[] | null;
      };
      setForm({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt ?? "",
        body: p.body ?? "",
        cover_image: p.cover_image ?? "",
        status: p.status,
        seo_title: p.seo_title ?? "",
        seo_description: p.seo_description ?? "",
        reading_minutes: p.reading_minutes ? String(p.reading_minutes) : "",
        category_ids: (p.blog_post_categories ?? []).map((c) => c.category_id),
      });
    }
  }, [isNew, existing.data]);

  const save = useMutation({
    mutationFn: () => upFn({
      data: {
        id: form.id,
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim() || null,
        body: form.body,
        cover_image: form.cover_image.trim() || null,
        status: form.status,
        seo_title: form.seo_title.trim() || null,
        seo_description: form.seo_description.trim() || null,
        reading_minutes: form.reading_minutes ? Number(form.reading_minutes) : null,
        category_ids: form.category_ids,
      },
    }),
    onSuccess: (res) => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin", "blog"] });
      if (isNew && res?.id) navigate({ to: "/admin/blog/$id", params: { id: res.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AdminPageHeader
        title={isNew ? "New post" : "Edit post"}
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link to="/admin/blog"><ArrowLeft className="h-4 w-4" /> Back</Link>
            </Button>
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || !form.title || !form.slug} className="gap-1">
              <Save className="h-4 w-4" /> {save.isPending ? "Saving…" : "Save"}
            </Button>
          </>
        }
      />

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <AdminCard title="Content">
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Excerpt</Label>
                <Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
              </div>
              <div>
                <Label>Body</Label>
                <Textarea rows={18} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write your post — plain text with blank lines for paragraphs." />
                <p className="text-xs text-muted-foreground mt-1">Plain text with blank-line paragraphs. HTML is not rendered.</p>
              </div>
            </div>
          </AdminCard>

          <AdminCard title="SEO">
            <div className="space-y-4">
              <div>
                <Label>SEO title</Label>
                <Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} />
              </div>
              <div>
                <Label>SEO description</Label>
                <Textarea rows={2} value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} />
              </div>
            </div>
          </AdminCard>
        </div>

        <div className="space-y-6">
          <AdminCard title="Publish">
            <div className="space-y-3 text-sm">
              <div>
                <Label>Status</Label>
                <select className="w-full border border-border rounded-md px-2 py-2 mt-1" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <Label>Reading time (min)</Label>
                <Input type="number" min={0} value={form.reading_minutes} onChange={(e) => setForm({ ...form, reading_minutes: e.target.value })} />
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Cover image">
            <Input placeholder="https://..." value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} />
            {form.cover_image && (
              <div className="mt-3 aspect-video rounded-md overflow-hidden bg-muted border border-border">
                <img src={form.cover_image} alt="" className="h-full w-full object-cover" />
              </div>
            )}
          </AdminCard>

          <AdminCard title="Categories">
            <div className="space-y-1.5 text-sm">
              {cats.data?.map((c) => {
                const on = form.category_ids.includes(c.id);
                return (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setForm({
                        ...form,
                        category_ids: on ? form.category_ids.filter((x) => x !== c.id) : [...form.category_ids, c.id],
                      })}
                    />
                    <span>{c.name}</span>
                  </label>
                );
              })}
              {!cats.data?.length && <p className="text-xs text-muted-foreground">No categories yet — add from the blog list page.</p>}
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
