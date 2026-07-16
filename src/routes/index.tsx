import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Leaf, ShieldCheck, Sparkles, Truck, Headphones, Package, Mountain } from "lucide-react";
import { listProducts, listCategories } from "@/lib/catalog.functions";
import { subscribeNewsletter } from "@/lib/contact.functions";
import { CategoryCard } from "@/components/common/CategoryCard";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SectionHeading, ViewAll } from "@/components/common/SectionHeading";
import { useRecentlyViewed } from "@/context/RecentlyViewedContext";
import { useSiteSection } from "@/context/SiteContext";
import { PuckPageRenderer } from "@/components/site/PuckPageRenderer";
import { useState } from "react";
import { toast } from "sonner";

const categoriesQO = queryOptions({
  queryKey: ["categories"],
  queryFn: () => listCategories(),
});
const featuredQO = queryOptions({
  queryKey: ["products", "featured"],
  queryFn: () => listProducts({ data: { featured: true, limit: 8 } }),
});
const bestSellersQO = queryOptions({
  queryKey: ["products", "bestSellers"],
  queryFn: () => listProducts({ data: { bestSeller: true, limit: 8 } }),
});
const newArrivalsQO = queryOptions({
  queryKey: ["products", "newArrivals"],
  queryFn: () => listProducts({ data: { newArrival: true, limit: 8 } }),
});
const dealsQO = queryOptions({
  queryKey: ["products", "deals"],
  queryFn: () => listProducts({ data: { onDeal: true, limit: 8 } }),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BachatAtBazaar.pk — Shop Smart. Save More. Live Better." },
      { name: "description", content: "Shop premium Himalayan buckwheat, sea buckthorn and wellness essentials. Nationwide delivery across Pakistan with cash on delivery and digital wallets." },
      { property: "og:title", content: "BachatAtBazaar.pk — Pakistan's Smart Marketplace" },
      { property: "og:description", content: "Premium Himalayan superfoods, wellness and everyday essentials — carefully selected, smartly priced and delivered nationwide." },
      { property: "og:url", content: "https://bazaar-smart-shop.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://bazaar-smart-shop.lovable.app/" },
      { rel: "preload", as: "image", href: "https://picsum.photos/seed/hero-buckwheat/700/900", fetchpriority: "high" },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQO),
      context.queryClient.ensureQueryData(featuredQO),
      context.queryClient.ensureQueryData(bestSellersQO),
      context.queryClient.ensureQueryData(newArrivalsQO),
      context.queryClient.ensureQueryData(dealsQO),
    ]);
  },
  errorComponent: ({ error }) => (
    <div className="container-page py-16 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  component: Home,
});


function Home() {
  const recent = useRecentlyViewed();
  const hero = useSiteSection("hero");
  const gallery = useSiteSection("hero_gallery");
  const promo = useSiteSection("home_promo");
  const { data: categories } = useSuspenseQuery(categoriesQO);
  const { data: featured } = useSuspenseQuery(featuredQO);
  const { data: bestSellers } = useSuspenseQuery(bestSellersQO);
  const { data: newArrivals } = useSuspenseQuery(newArrivalsQO);
  const { data: deals } = useSuspenseQuery(dealsQO);
  const firstCat = categories[0]?.slug ?? "himalayan-buckwheat";

  const heroEyebrow = (hero.eyebrow as string | undefined)?.trim() || "Pakistan's Smart Shopping Marketplace";
  const heroTitle = (hero.title as string | undefined)?.trim();
  const heroSubtitle = (hero.subtitle as string | undefined)?.trim() ||
    "BachatAtBazaar.pk brings you carefully selected quality products from across Pakistan and beyond — starting with premium Himalayan superfoods and growing into your everyday marketplace.";
  const heroCtaLabel = (hero.cta_label as string | undefined)?.trim() || "Shop Now";
  const heroCtaHref = (hero.cta_href as string | undefined)?.trim() || "/shop";
  const heroImage = (hero.image_url as string | undefined)?.trim();
  const g1 = (gallery.image_1 as string | undefined)?.trim() || "https://picsum.photos/seed/hero-buckwheat/700/900";
  const g2 = (gallery.image_2 as string | undefined)?.trim() || "https://picsum.photos/seed/hero-tea/700/700";
  const g3 = (gallery.image_3 as string | undefined)?.trim() || "https://picsum.photos/seed/hero-mountains/700/700";
  const g4 = (gallery.image_4 as string | undefined)?.trim() || "https://picsum.photos/seed/hero-seabuckthorn/700/900";
  const promoImage = (promo.image_url as string | undefined)?.trim() || "https://picsum.photos/seed/promo-collection/900/600";
  const promoTitle = (promo.title as string | undefined)?.trim() || "From the mountains of Gilgit-Baltistan to your home";
  const promoSubtitle = (promo.subtitle as string | undefined)?.trim() || "Stone-milled Himalayan buckwheat and wild-harvested sea buckthorn — sourced with care, packed for freshness, delivered across Pakistan.";

  return (
    <div>
      <PuckPageRenderer pageKey="home" />

      <section className="relative overflow-hidden bg-surface border-b border-border">
        <div className="container-page grid gap-10 py-12 md:py-20 lg:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> {heroEyebrow}
            </div>
            {heroTitle ? (
              <h1 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] text-foreground">
                {heroTitle}
              </h1>
            ) : (
              <h1 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] text-foreground">
                Quality products.<br />
                <span className="text-primary">Smarter prices.</span><br />
                Everyday savings.
              </h1>
            )}
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-xl">
              {heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={heroCtaHref} className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-dark transition-colors">
                {heroCtaLabel} <ArrowRight className="h-4 w-4" />
              </a>
              <Link to="/category/$slug" params={{ slug: firstCat }} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-6 py-3 text-sm font-semibold hover:bg-accent transition-colors">
                Explore Himalayan Superfoods
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                { icon: Truck, label: "Nationwide delivery" },
                { icon: ShieldCheck, label: "Secure shopping" },
                { icon: Leaf, label: "Carefully sourced" },
              ].map((f) => (
                <div key={f.label} className="flex flex-col items-start gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><f.icon className="h-4 w-4" /></div>
                  <div className="text-xs font-medium text-muted-foreground">{f.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            {heroImage ? (
              <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                <img src={heroImage} alt="Hero" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-3">
                  <div className="aspect-[4/5] rounded-lg overflow-hidden bg-muted"><img src={g1} alt="Hero 1" width={700} height={900} fetchPriority="high" decoding="async" className="h-full w-full object-cover" /></div>
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted"><img src={g2} alt="Hero 2" className="h-full w-full object-cover" /></div>
                </div>
                <div className="space-y-3 pt-8">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted"><img src={g3} alt="Hero 3" className="h-full w-full object-cover" /></div>
                  <div className="aspect-[4/5] rounded-lg overflow-hidden bg-muted"><img src={g4} alt="Hero 4" className="h-full w-full object-cover" /></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>


      <section className="container-page py-12 md:py-16">
        <SectionHeading eyebrow="Marketplace" title="Shop by category" description="From premium Himalayan superfoods to everyday essentials." action={<ViewAll to="/shop" />} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((c) => (
            <CategoryCard key={c.slug} category={{ slug: c.slug, name: c.name, description: c.description ?? "", image: c.image_url ?? `https://picsum.photos/seed/${c.slug}/800/600`, color: "bg-muted" }} />
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="container-page py-8 md:py-12">
          <SectionHeading eyebrow="Handpicked" title="Featured products" description="Our current favourites — trusted quality at smart prices." action={<ViewAll to="/shop" />} />
          <ProductGrid products={featured} />
        </section>
      )}

      <section className="container-page py-8 md:py-12">
        <div className="relative overflow-hidden rounded-xl bg-primary text-primary-foreground">
          <div className="grid lg:grid-cols-2 gap-8 p-8 md:p-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs uppercase tracking-wide"><Mountain className="h-3.5 w-3.5" /> Launch collection</div>
              <h2 className="mt-4 font-display text-3xl md:text-4xl font-bold leading-tight">{promoTitle}</h2>
              <p className="mt-3 text-primary-foreground/85 max-w-lg">{promoSubtitle}</p>
              <Link to="/category/$slug" params={{ slug: firstCat }} className="mt-6 inline-flex items-center gap-2 rounded-md bg-savings text-savings-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity">
                Explore the collection <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="hidden lg:block relative">
              <img src={promoImage} alt="Launch collection" className="rounded-lg w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-12 md:py-16">
        <SectionHeading eyebrow="Why us" title="Why shop with BachatAtBazaar" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Sparkles, title: "Premium quality", desc: "Every product is carefully checked for quality and authenticity." },
            { icon: Package, title: "Smart prices", desc: "Real savings on products you actually use every day." },
            { icon: Leaf, title: "Carefully selected", desc: "We choose products worth putting our name behind." },
            { icon: ShieldCheck, title: "Secure shopping", desc: "Safe, protected checkout with clear policies." },
            { icon: Truck, title: "Nationwide delivery", desc: "Delivered to your door across Pakistan." },
            { icon: Headphones, title: "Responsive support", desc: "A friendly team that's genuinely here to help." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-card p-5">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary"><f.icon className="h-5 w-5" /></div>
              <div className="mt-3 font-semibold">{f.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {bestSellers.length > 0 && (
        <section className="container-page py-8 md:py-12">
          <SectionHeading eyebrow="Customers love" title="Best sellers" action={<ViewAll to="/shop" />} />
          <ProductGrid products={bestSellers} />
        </section>
      )}

      {newArrivals.length > 0 && (
        <section className="container-page py-12 md:py-16">
          <SectionHeading eyebrow="Fresh in" title="New arrivals" action={<ViewAll to="/shop" />} />
          <ProductGrid products={newArrivals} />
        </section>
      )}

      {deals.length > 0 && (
        <section className="container-page pb-12 md:pb-16">
          <div className="rounded-xl border border-savings/30 bg-gradient-to-br from-savings/10 via-background to-background p-6 md:p-8">
            <SectionHeading eyebrow="Savings" title="Today's smart deals" description="Handpicked discounts on the products we love — while stocks last." action={<ViewAll to="/shop" label="See all deals" />} />
            <ProductGrid products={deals} />
          </div>
        </section>
      )}

      <NewsletterSection />

      {recent.items.length > 0 && (
        <section className="container-page pb-16">
          <SectionHeading eyebrow="Just for you" title="Recently viewed" />
          <ProductGrid products={recent.items} />
        </section>
      )}
    </div>
  );
}

function NewsletterSection() {
  const [busy, setBusy] = useState(false);
  return (
    <section className="container-page pb-12 md:pb-16">
      <div className="rounded-xl bg-primary text-primary-foreground p-8 md:p-12 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold">Smart deals, straight to your inbox</h2>
        <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto">Subscribe for launches, offers and savings tips — no spam, ever.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const fd = new FormData(e.currentTarget);
            try {
              await subscribeNewsletter({ data: { email: String(fd.get("email")) } });
              (e.target as HTMLFormElement).reset();
              toast.success("Subscribed! Thanks for joining.");
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="mt-6 flex max-w-md mx-auto gap-2"
        >
          <input name="email" type="email" required placeholder="Your email address" className="flex-1 h-12 rounded-md px-4 text-foreground bg-background border-0 focus:outline-none focus:ring-2 focus:ring-savings" />
          <button disabled={busy} className="h-12 rounded-md bg-savings text-savings-foreground px-6 font-semibold hover:opacity-90 disabled:opacity-50">Subscribe</button>
        </form>
      </div>
    </section>
  );
}
