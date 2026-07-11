import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { products, relatedProducts } from "@/data/products";
import { categories } from "@/data/categories";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Price } from "@/components/product/Price";
import { Rating } from "@/components/product/Rating";
import { QuantitySelector } from "@/components/product/QuantitySelector";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Heart, ShieldCheck, Truck, RotateCcw, Check, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useRecentlyViewed } from "@/context/RecentlyViewedContext";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = products.find((p) => p.slug === params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.product.name} — BachatAtBazaar.pk` },
      { name: "description", content: loaderData.product.shortDescription },
      { property: "og:title", content: loaderData.product.name },
      { property: "og:description", content: loaderData.product.shortDescription },
      { property: "og:image", content: loaderData.product.images[0] },
    ] : [{ title: "Product not found" }, { name: "robots", content: "noindex" }],
  }),
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
  const { product } = Route.useLoaderData();
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const cart = useCart();
  const wishlist = useWishlist();
  const recent = useRecentlyViewed();
  const category = categories.find((c) => c.slug === product.categorySlug);
  const related = relatedProducts(product.slug);
  const inWishlist = wishlist.has(product.id);

  useEffect(() => { recent.add(product); }, [product.id]);

  const addToCart = () => {
    cart.add(product, qty);
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
          <div className="aspect-square rounded-xl overflow-hidden bg-muted border border-border">
            <img src={product.images[activeImage]} alt={product.name} className="h-full w-full object-cover" />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.images.map((img: string, i: number) => (
                <button key={i} onClick={() => setActiveImage(i)} className={`aspect-square rounded-md overflow-hidden border-2 ${i === activeImage ? "border-primary" : "border-transparent"}`}>
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {category && <Link to="/category/$slug" params={{ slug: category.slug }} className="text-xs uppercase tracking-wide text-primary font-semibold">{category.name}</Link>}
          <h1 className="mt-1 font-display text-3xl md:text-4xl font-bold text-foreground">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <Rating value={product.rating} />
            <span className="text-sm text-muted-foreground">({product.reviewCount} reviews)</span>
          </div>
          <div className="mt-5"><Price price={product.price} salePrice={product.salePrice} size="lg" /></div>
          <p className="mt-4 text-muted-foreground">{product.shortDescription}</p>

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
            {product.stock > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
                <span className="h-2 w-2 rounded-full bg-primary" /> In stock ({product.stock} available)
              </span>
            ) : (
              <span className="text-sm text-destructive font-medium">Out of stock</span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <QuantitySelector value={qty} onChange={setQty} max={product.stock} />
            <Button onClick={addToCart} disabled={product.stock === 0} size="lg" className="gap-2 bg-primary hover:bg-primary-dark">
              <ShoppingBag className="h-4 w-4" /> Add to cart
            </Button>
            <Button variant="outline" size="lg" onClick={() => wishlist.toggle(product)} className="gap-2">
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
            <TabsTrigger value="usage">How to use</TabsTrigger>
            <TabsTrigger value="shipping">Shipping & Returns</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="max-w-3xl text-muted-foreground leading-relaxed">
            <p className="whitespace-pre-line">{product.description}</p>
          </TabsContent>
          <TabsContent value="specs">
            <dl className="divide-y divide-border border border-border rounded-lg overflow-hidden max-w-2xl">
              {product.specifications.map((s: { label: string; value: string }) => (
                <div key={s.label} className="grid grid-cols-3 py-3 px-4 text-sm">
                  <dt className="font-medium">{s.label}</dt>
                  <dd className="col-span-2 text-muted-foreground">{s.value}</dd>
                </div>
              ))}
            </dl>
          </TabsContent>
          <TabsContent value="usage" className="max-w-3xl text-muted-foreground">
            <p>{product.usage}</p>
          </TabsContent>
          <TabsContent value="shipping" className="text-sm text-muted-foreground space-y-3 max-w-3xl">
            <p><strong className="text-foreground">Delivery:</strong> We deliver across Pakistan within 2–5 working days depending on your city. Same-day delivery available in select areas of Karachi, Lahore and Islamabad.</p>
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
