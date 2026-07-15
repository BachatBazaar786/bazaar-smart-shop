import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCategoryBySlug, listProducts } from "@/lib/catalog.functions";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { SectionHeading } from "@/components/common/SectionHeading";

const categoryQO = (slug: string) => queryOptions({
  queryKey: ["category", slug],
  queryFn: () => getCategoryBySlug({ data: { slug } }),
});
const categoryProductsQO = (slug: string) => queryOptions({
  queryKey: ["category", slug, "products"],
  queryFn: () => listProducts({ data: { categorySlug: slug } }),
});

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ params, context }) => {
    const category = await context.queryClient.ensureQueryData(categoryQO(params.slug));
    if (!category) throw notFound();
    context.queryClient.ensureQueryData(categoryProductsQO(params.slug));
    return { category };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Category not found" }, { name: "robots", content: "noindex" }] };
    }
    const c = loaderData.category;
    const url = `https://bazaar-smart-shop.lovable.app/category/${params.slug}`;
    const desc = c.description ?? `Shop ${c.name} at BachatAtBazaar.pk — carefully selected, smartly priced.`;
    return {
      meta: [
        { title: `${c.name} — BachatAtBazaar.pk` },
        { name: "description", content: desc },
        { property: "og:title", content: `${c.name} — BachatAtBazaar.pk` },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        ...(c.image_url ? [{ property: "og:image", content: c.image_url }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },

  notFoundComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="font-display text-3xl font-bold">Category not found</h1>
      <Link to="/shop" className="mt-6 inline-flex rounded-md bg-primary px-6 py-3 text-primary-foreground font-medium">Browse all products</Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="container-page py-24 text-center">
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm">Try again</button>
    </div>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data: category } = useSuspenseQuery(categoryQO(slug));
  const { data: items } = useSuspenseQuery(categoryProductsQO(slug));
  if (!category) return null;
  const image = category.image_url ?? `https://picsum.photos/seed/${category.slug}/1200/600`;

  return (
    <div>
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <img src={image} alt="" className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
        </div>
        <div className="container-page relative py-14 md:py-20">
          <Breadcrumbs items={[{ label: "Shop", to: "/shop" }, { label: category.name }]} />
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">{category.name}</h1>
          {category.description && <p className="mt-3 max-w-2xl text-muted-foreground">{category.description}</p>}
        </div>
      </div>

      <div className="container-page py-10">
        <SectionHeading title={`${items.length} product${items.length !== 1 ? "s" : ""} in ${category.name}`} />
        {items.length > 0 ? (
          <ProductGrid products={items} />
        ) : (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <h3 className="font-display text-xl font-semibold">Coming soon</h3>
            <p className="mt-2 text-sm text-muted-foreground">We're getting this category ready. Check back very soon.</p>
            <Link to="/shop" className="mt-6 inline-flex rounded-md bg-primary px-6 py-3 text-primary-foreground font-medium">Browse all products</Link>
          </div>
        )}
      </div>
    </div>
  );
}
