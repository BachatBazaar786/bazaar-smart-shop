import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listBlogPostsPublic } from "@/lib/phase6.functions";

const listQO = queryOptions({
  queryKey: ["blog", "public-list"],
  queryFn: () => listBlogPostsPublic({ data: { limit: 30 } }),
});

export const Route = createFileRoute("/blog")({
  loader: ({ context }) => { context.queryClient.ensureQueryData(listQO); },
  head: () => ({
    meta: [
      { title: "Blog — BachatAtBazaar.pk" },
      { name: "description", content: "Tips, guides and stories on superfoods, healthy living and everyday savings from Bachat At Bazaar." },
      { property: "og:title", content: "Blog — BachatAtBazaar.pk" },
      { property: "og:description", content: "Tips, guides and stories from Bachat At Bazaar." },
    ],
    links: [{ rel: "canonical", href: "https://bazaar-smart-shop.lovable.app/blog" }],
  }),
  component: BlogIndex,
  errorComponent: ({ error }) => <div className="container-page py-24 text-center"><p className="text-sm text-muted-foreground">{error.message}</p></div>,
  notFoundComponent: () => <div className="container-page py-24 text-center">Not found.</div>,
});

function BlogIndex() {
  const { data: posts } = useSuspenseQuery(listQO);
  return (
    <div className="container-page py-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold">From the Bazaar</h1>
        <p className="mt-2 text-muted-foreground">Superfood guides, recipes and money-saving tips.</p>
      </header>
      {!posts.length ? (
        <p className="text-muted-foreground">No posts published yet — check back soon!</p>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} className="group">
              <div className="aspect-video rounded-lg overflow-hidden bg-muted mb-4">
                {p.cover_image ? (
                  <img src={p.cover_image} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-muted-foreground text-xs">No image</div>
                )}
              </div>
              <h2 className="font-display text-lg font-bold group-hover:text-primary transition-colors">{p.title}</h2>
              {p.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>}
              <div className="mt-3 text-xs text-muted-foreground">
                {p.published_at ? new Date(p.published_at).toLocaleDateString() : ""}
                {p.reading_minutes ? ` · ${p.reading_minutes} min read` : ""}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
