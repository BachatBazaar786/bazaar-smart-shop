import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listBlogPostsAdmin,
  deleteBlogPostAdmin,
  listBlogCategoriesAdmin,
  upsertBlogCategoryAdmin,
  deleteBlogCategoryAdmin,
} from "@/lib/phase6.functions";
import { AdminPageHeader, AdminCard } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/blog/")({ component: BlogAdmin });

function BlogAdmin() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBlogPostsAdmin);
  const delFn = useServerFn(deleteBlogPostAdmin);
  const catsFn = useServerFn(listBlogCategoriesAdmin);
  const catUpFn = useServerFn(upsertBlogCategoryAdmin);
  const catDelFn = useServerFn(deleteBlogCategoryAdmin);

  const posts = useQuery({ queryKey: ["admin", "blog"], queryFn: () => listFn() });
  const cats = useQuery({ queryKey: ["admin", "blog-cats"], queryFn: () => catsFn() });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "blog"] }); toast.success("Post deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [newCat, setNewCat] = useState({ name: "", slug: "" });
  const addCat = useMutation({
    mutationFn: () => catUpFn({ data: { name: newCat.name.trim(), slug: newCat.slug.trim().toLowerCase() } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "blog-cats"] });
      setNewCat({ name: "", slug: "" });
      toast.success("Category added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delCat = useMutation({
    mutationFn: (id: string) => catDelFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "blog-cats"] }),
  });

  return (
    <div>
      <AdminPageHeader
        title="Blog"
        subtitle="Manage posts and categories"
        actions={
          <Button asChild size="sm" className="gap-1">
            <Link to="/admin/blog/$id" params={{ id: "new" }}><Plus className="h-4 w-4" /> New post</Link>
          </Button>
        }
      />

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <AdminCard title="Posts">
          {posts.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !posts.data?.length ? (
            <p className="text-sm text-muted-foreground">No posts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2">Title</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Views</th>
                    <th className="py-2 text-right">Updated</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {posts.data.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2">
                        <Link to="/admin/blog/$id" params={{ id: p.id }} className="font-medium hover:text-primary">{p.title}</Link>
                        <div className="text-xs text-muted-foreground">/{p.slug}</div>
                      </td>
                      <td className="py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${
                          p.status === "published" ? "bg-primary/10 text-primary" :
                          p.status === "draft" ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive"
                        }`}>{p.status}</span>
                      </td>
                      <td className="py-2 text-right">{p.view_count ?? 0}</td>
                      <td className="py-2 text-right text-xs text-muted-foreground">
                        {new Date(p.updated_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 text-right">
                        <div className="inline-flex gap-1">
                          {p.status === "published" && (
                            <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-accent rounded" aria-label="View">
                              <Eye className="h-4 w-4" />
                            </a>
                          )}
                          <button onClick={() => { if (confirm("Delete this post?")) del.mutate(p.id); }} className="p-1.5 hover:bg-destructive/10 text-destructive rounded" aria-label="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        <AdminCard title="Categories">
          <div className="space-y-2 mb-4">
            {cats.data?.map((c) => (
              <div key={c.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">/{c.slug}</div>
                </div>
                <button onClick={() => delCat.mutate(c.id)} className="text-destructive hover:bg-destructive/10 rounded p-1">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {!cats.data?.length && <p className="text-xs text-muted-foreground">No categories yet.</p>}
          </div>
          <div className="space-y-2 pt-3 border-t border-border">
            <Input placeholder="Name" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value, slug: newCat.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })} />
            <Input placeholder="slug" value={newCat.slug} onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })} />
            <Button size="sm" disabled={!newCat.name.trim() || !newCat.slug.trim() || addCat.isPending} onClick={() => addCat.mutate()} className="w-full">
              Add category
            </Button>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
