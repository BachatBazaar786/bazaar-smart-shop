import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { categories } from "@/data/categories";
import { products } from "@/data/products";
import { toListItems } from "@/lib/product-adapter";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { SectionHeading } from "@/components/common/SectionHeading";

export const Route = createFileRoute("/category/$slug")({
  loader: ({ params }) => {
    const category = categories.find((c) => c.slug === params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.category.name} — BachatAtBazaar.pk` },
          { name: "description", content: loaderData.category.description },
          { property: "og:title", content: loaderData.category.name },
          { property: "og:description", content: loaderData.category.description },
          { property: "og:image", content: loaderData.category.image },
        ]
      : [{ title: "Category not found" }, { name: "robots", content: "noindex" }],
  }),
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
  const { category } = Route.useLoaderData();
  const items = products.filter((p) => p.categorySlug === category.slug);

  return (
    <div>
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <img src={category.image} alt="" className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
        </div>
        <div className="container-page relative py-14 md:py-20">
          <Breadcrumbs items={[{ label: "Shop", to: "/shop" }, { label: category.name }]} />
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">{category.name}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{category.description}</p>
        </div>
      </div>

      <div className="container-page py-10">
        <SectionHeading title={`${items.length} product${items.length !== 1 ? "s" : ""} in ${category.name}`} />
        {items.length > 0 ? (
          <ProductGrid products={toListItems(items)} />
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
