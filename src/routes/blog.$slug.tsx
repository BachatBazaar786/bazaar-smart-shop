import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getBlogPostPublic } from "@/lib/phase6.functions";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";

const postQO = (slug: string) => queryOptions({
  queryKey: ["blog", "public", slug],
  queryFn: () => getBlogPostPublic({ data: { slug } }),
});

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params, context }) => {
    const post = await context.queryClient.ensureQueryData(postQO(params.slug));
    if (!post) throw notFound();
    return { post };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Post not found" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.post as unknown as {
      title: string; excerpt: string | null; cover_image: string | null;
      seo_title: string | null; seo_description: string | null;
      published_at: string | null;
    };
    const url = `https://bazaar-smart-shop.lovable.app/blog/${params.slug}`;
    const title = p.seo_title || p.title;
    const desc = p.seo_description || p.excerpt || `${p.title} — Bachat At Bazaar blog`;
    return {
      meta: [
        { title: `${title} — BachatAtBazaar.pk` },
        { name: "description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        ...(p.cover_image ? [{ property: "og:image", content: p.cover_image }, { name: "twitter:image", content: p.cover_image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: p.title,
          description: desc,
          ...(p.cover_image ? { image: p.cover_image } : {}),
          ...(p.published_at ? { datePublished: p.published_at } : {}),
          mainEntityOfPage: url,
          publisher: {
            "@type": "Organization",
            name: "BachatAtBazaar.pk",
            logo: { "@type": "ImageObject", url: "https://bazaar-smart-shop.lovable.app/favicon.ico" },
          },
        }),
      }],
    };
  },

  notFoundComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="font-display text-3xl font-bold">Post not found</h1>
      <Link to="/blog" className="mt-6 inline-flex rounded-md bg-primary px-6 py-3 text-primary-foreground">Back to blog</Link>
    </div>
  ),
  errorComponent: ({ error }) => <div className="container-page py-24 text-center"><p className="text-sm text-muted-foreground">{error.message}</p></div>,
  component: PostPage,
});

function PostPage() {
  const { slug } = Route.useParams();
  const { data: post } = useSuspenseQuery(postQO(slug));
  if (!post) return null;
  const p = post as unknown as {
    title: string; excerpt: string | null; body: string; cover_image: string | null;
    published_at: string | null; reading_minutes: number | null;
    blog_post_categories: { blog_categories: { name: string; slug: string } | null }[] | null;
  };
  const cats = (p.blog_post_categories ?? []).flatMap((c) => c.blog_categories ? [c.blog_categories] : []);

  return (
    <div className="container-page py-8 max-w-3xl">
      <Breadcrumbs items={[{ label: "Blog", to: "/blog" }, { label: p.title }]} />

      <header className="mt-6">
        <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight">{p.title}</h1>
        <div className="mt-4 text-sm text-muted-foreground">
          {p.published_at ? new Date(p.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : ""}
          {p.reading_minutes ? ` · ${p.reading_minutes} min read` : ""}
          {cats.length > 0 && <> · {cats.map((c) => c.name).join(", ")}</>}
        </div>
      </header>

      {p.cover_image && (
        <div className="mt-6 aspect-video rounded-lg overflow-hidden bg-muted">
          <img src={p.cover_image} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      {p.excerpt && <p className="mt-6 text-lg text-muted-foreground italic">{p.excerpt}</p>}

      <article className="mt-8 prose prose-neutral max-w-none whitespace-pre-line text-base leading-relaxed">
        {p.body}
      </article>
    </div>
  );
}
