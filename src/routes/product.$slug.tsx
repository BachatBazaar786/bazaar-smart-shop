import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog.functions";
import { getProductVariantsPublic, trackProductView } from "@/lib/phase6.functions";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Price } from "@/components/product/Price";
import { Rating } from "@/components/product/Rating";
import { QuantitySelector } from "@/components/product/QuantitySelector";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductImageViewer } from "@/components/product/ProductImageViewer";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Heart, ShieldCheck, Truck, RotateCcw, Check, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useRecentlyViewed } from "@/context/RecentlyViewedContext";
import { toast } from "sonner";
import { sanitizeHtml } from "@/lib/sanitize";

function stripHtml(html: string): string {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}



const productQO = (slug: string) => queryOptions({
  queryKey: ["product", slug],
  queryFn: () => getProductBySlug({ data: { slug } }),
});
const relatedQO = (slug: string) => queryOptions({
  queryKey: ["product", slug, "related"],
  queryFn: () => getRelatedProducts({ data: { slug, limit: 4 } }),
});

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params, context }) => {
    const product = await context.queryClient.ensureQueryData(productQO(params.slug));
    if (!product) throw notFound();
    context.queryClient.ensureQueryData(relatedQO(params.slug));
    return { product };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Product not found" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.product;
    const url = `https://bazaar-smart-shop.lovable.app/product/${params.slug}`;
    const price = p.salePrice ?? p.price;
    return {
      meta: [
        { title: `${p.name} — BachatAtBazaar.pk` },
        { name: "description", content: stripHtml(p.shortDescription).slice(0, 160) },
        { property: "og:type", content: "product" },
        { property: "og:title", content: `${p.name} — BachatAtBazaar.pk` },
        { property: "og:description", content: stripHtml(p.shortDescription).slice(0, 160) },
        { property: "og:url", content: url },
        { property: "og:image", content: p.images[0] },
        { name: "twitter:image", content: p.images[0] },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            description: stripHtml(p.shortDescription),
            image: p.images,
            sku: p.sku || p.id,
            ...(p.category ? { category: p.category.name } : {}),
            aggregateRating: p.reviewCount > 0 ? {
              "@type": "AggregateRating",
              ratingValue: p.rating,
              reviewCount: p.reviewCount,
            } : undefined,
            offers: {
              "@type": "Offer",
              url,
              priceCurrency: "PKR",
              price: price,
              availability: p.stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
          }),
        },
      ],
    };
  },

  notFoundComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="font-display text-3xl font-bold">Product not found</h1>
      <p className="mt-2 text-muted-foreground">This product may have been removed or is no longer available.</p>
      <Link to="/shop" className="mt-6 inline-flex rounded-md bg-primary px-6 py-3 text-primary-foreground font-medium">Back to shop</Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="container-page py-24 text-center">
      <h1 className="font-display text-2xl font-bold">Couldn't load product</h1>
      <p className="mt-2 text-muted-foreground text-sm">{error.message}</p>
      <Button onClick={reset} className="mt-4">Try again</Button>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQO(slug));
  const { data: related } = useSuspenseQuery(relatedQO(slug));
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const cart = useCart();
  const wishlist = useWishlist();
  const recent = useRecentlyViewed();

  const variantsFn = useServerFn(getProductVariantsPublic);
  const trackFn = useServerFn(trackProductView);
  const variants = useQuery({
    queryKey: ["product-variants", product?.id],
    queryFn: () => variantsFn({ data: { product_id: product!.id } }),
    enabled: !!product?.id,
  });

  useEffect(() => {
    if (!product?.id) return;
    trackFn({ data: { product_id: product.id } }).catch(() => {});
  }, [product?.id, trackFn]);

  if (!product) return null;
  const category = product.category;
  const inWishlist = wishlist.has(product.id);

  useEffect(() => {
    recent.add({
      id: product.id, slug: product.slug, name: product.name, image: product.images[0],
      price: product.price, salePrice: product.salePrice, stock: product.stock, rating: product.rating,
      reviewCount: product.reviewCount, category: product.category,
      bestSeller: product.bestSeller, newArrival: product.newArrival, onDeal: product.onDeal, featured: product.featured,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const selectedVariant = variants.data?.find((v) => v.id === selectedVariantId) ?? null;
  const displayPrice = selectedVariant ? Number(selectedVariant.price) : product.price;
  const displaySale = selectedVariant
    ? selectedVariant.sale_price !== null && selectedVariant.sale_price !== undefined
      ? Number(selectedVariant.sale_price)
      : null
    : product.salePrice;
  const displayStock = selectedVariant ? Number(selectedVariant.stock) : product.stock;

  const addToCart = () => {
    cart.add({
      id: product.id,
      slug: product.slug,
      name: selectedVariant ? `${product.name} — ${selectedVariant.name}` : product.name,
      image: product.images[0],
      price: displayPrice,
      salePrice: displaySale,
      stock: displayStock,
    }, qty);
    toast.success(`Added ${qty} × ${product.name} to cart`);
  };



  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[
        { label: "Shop", to: "/shop" },
        ...(category ? [{ label: category.name, to: `/category/${category.slug}` }] : []),
        { label: product.name },
      ]} />

      <div className="grid lg:grid-cols-2 gap-10 mt-6">
        <div>
          <ProductImageViewer images={product.images} name={product.name} activeIndex={activeImage} onChange={setActiveImage} />
        </div>


        <div>
          {category && <Link to="/category/$slug" params={{ slug: category.slug }} className="text-xs uppercase tracking-wide text-primary font-semibold">{category.name}</Link>}
          <h1 className="mt-1 font-display text-3xl md:text-4xl font-bold text-foreground">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <Rating value={product.rating} />
            <span className="text-sm text-muted-foreground">({product.reviewCount} reviews)</span>
          </div>
          <div className="mt-5"><Price price={displayPrice} salePrice={displaySale ?? undefined} size="lg" /></div>
          <div className="mt-4 text-muted-foreground prose-content" dangerouslySetInnerHTML={{ __html: product.shortDescription || "" }} />

          {variants.data && variants.data.length > 0 && (
            <div className="mt-5">
              <div className="text-sm font-medium mb-2">Options</div>
              <div className="flex flex-wrap gap-2">
                {variants.data.map((v) => {
                  const active = v.id === selectedVariantId;
                  const outOfStock = Number(v.stock) <= 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(active ? null : v.id)}
                      disabled={outOfStock}
                      className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                        active
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-accent"
                      } ${outOfStock ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {v.name}
                      {outOfStock && <span className="ml-1 text-xs">(out)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {product.benefits.length > 0 && (
            <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {product.benefits.map((b: string) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex items-center gap-4">
            {displayStock > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
                <span className="h-2 w-2 rounded-full bg-primary" /> In stock ({displayStock} available)
              </span>
            ) : (
              <span className="text-sm text-destructive font-medium">Out of stock</span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <QuantitySelector value={qty} onChange={setQty} max={displayStock} />
            <Button onClick={addToCart} disabled={displayStock === 0} size="lg" className="gap-2 bg-primary hover:bg-primary-dark">
              <ShoppingBag className="h-4 w-4" /> Add to cart
            </Button>
            <Button variant="outline" size="lg" onClick={() => wishlist.toggle({ id: product.id, slug: product.slug, name: product.name, image: product.images[0], price: product.price, salePrice: product.salePrice })} className="gap-2">
              <Heart className={`h-4 w-4 ${inWishlist ? "fill-savings text-savings" : ""}`} />
              {inWishlist ? "Saved" : "Wishlist"}
            </Button>
          </div>


          <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-border">
            {[
              { icon: Truck, label: "Nationwide delivery" },
              { icon: ShieldCheck, label: "Secure checkout" },
              { icon: RotateCcw, label: "Easy returns" },
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-start gap-1.5">
                <f.icon className="h-5 w-5 text-primary" />
                <div className="text-xs text-muted-foreground">{f.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-14">
        <Tabs defaultValue="description">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            {product.usage && <TabsTrigger value="usage">How to use</TabsTrigger>}
            <TabsTrigger value="shipping">Shipping & Returns</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="max-w-3xl text-muted-foreground leading-relaxed">
            <div className="prose-content" dangerouslySetInnerHTML={{ __html: product.description || "" }} />
          </TabsContent>
          <TabsContent value="specs">
            {product.specifications.length > 0 ? (
              <dl className="divide-y divide-border border border-border rounded-lg overflow-hidden max-w-2xl">
                {product.specifications.map((s) => (
                  <div key={s.label} className="grid grid-cols-3 py-3 px-4 text-sm">
                    <dt className="font-medium">{s.label}</dt>
                    <dd className="col-span-2 text-muted-foreground">{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : <p className="text-sm text-muted-foreground">No specifications listed.</p>}
          </TabsContent>
          {product.usage && (
            <TabsContent value="usage" className="max-w-3xl text-muted-foreground">
              <div className="prose-content" dangerouslySetInnerHTML={{ __html: product.usage }} />
            </TabsContent>
          )}
          <TabsContent value="shipping" className="text-sm text-muted-foreground space-y-3 max-w-3xl">
            <p><strong className="text-foreground">Delivery:</strong> We deliver across Pakistan within 2–5 working days depending on your city.</p>
            <p><strong className="text-foreground">Returns:</strong> 7-day easy returns on unopened items. Perishable and food items are non-returnable once opened.</p>
            <p><strong className="text-foreground">Payment:</strong> Cash on Delivery, JazzCash, EasyPaisa and bank transfer accepted.</p>
          </TabsContent>
        </Tabs>
      </div>

      {related.length > 0 && (
        <div className="mt-16">
          <SectionHeading eyebrow="You may also like" title="Related products" />
          <ProductGrid products={related} />
        </div>
      )}
    </div>
  );
}
