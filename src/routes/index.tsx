import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Leaf, ShieldCheck, Sparkles, Truck, Headphones, Package, Mountain } from "lucide-react";
import { categories } from "@/data/categories";
import { bestSellers, dealsProducts, featured, newArrivals, products } from "@/data/products";
import { toListItems, toListItem } from "@/lib/product-adapter";
import { CategoryCard } from "@/components/common/CategoryCard";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SectionHeading, ViewAll } from "@/components/common/SectionHeading";
import { useRecentlyViewed } from "@/context/RecentlyViewedContext";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BachatAtBazaar.pk — Shop Smart. Save More. Live Better." },
      { name: "description", content: "Pakistan's smart shopping marketplace. Premium Himalayan superfoods, wellness, electronics and home essentials with nationwide delivery." },
    ],
  }),
  component: Home,
});

function Home() {
  const recent = useRecentlyViewed();
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-surface border-b border-border">
        <div className="container-page grid gap-10 py-12 md:py-20 lg:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Pakistan's Smart Shopping Marketplace
            </div>
            <h1 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] text-foreground">
              Quality products.<br />
              <span className="text-primary">Smarter prices.</span><br />
              Everyday savings.
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-xl">
              BachatAtBazaar.pk brings you carefully selected quality products from across Pakistan and beyond — starting with premium Himalayan superfoods and growing into your everyday marketplace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-dark transition-colors">
                Shop Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/category/$slug" params={{ slug: "himalayan-buckwheat" }} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-6 py-3 text-sm font-semibold hover:bg-accent transition-colors">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-3">
                <div className="aspect-[4/5] rounded-lg overflow-hidden bg-muted"><img src="https://picsum.photos/seed/hero-buckwheat/700/900" alt="Himalayan buckwheat" className="h-full w-full object-cover" /></div>
                <div className="aspect-square rounded-lg overflow-hidden bg-muted"><img src="https://picsum.photos/seed/hero-tea/700/700" alt="Buckwheat tea" className="h-full w-full object-cover" /></div>
              </div>
              <div className="space-y-3 pt-8">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted"><img src="https://picsum.photos/seed/hero-mountains/700/700" alt="Gilgit-Baltistan mountains" className="h-full w-full object-cover" /></div>
                <div className="aspect-[4/5] rounded-lg overflow-hidden bg-muted"><img src="https://picsum.photos/seed/hero-seabuckthorn/700/900" alt="Sea buckthorn" className="h-full w-full object-cover" /></div>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 hidden md:block rounded-lg bg-card border border-border shadow-lg p-4 max-w-[220px]">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wide"><Mountain className="h-4 w-4" /> Launch collection</div>
              <div className="mt-1 text-sm font-medium">From Gilgit-Baltistan to your home</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-12 md:py-16">
        <SectionHeading eyebrow="Marketplace" title="Shop by category" description="From premium Himalayan superfoods to everyday essentials — carefully organised for smart shopping." action={<ViewAll to="/shop" />} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((c) => <CategoryCard key={c.slug} category={c} />)}
        </div>
      </section>

      {/* Featured */}
      <section className="container-page py-8 md:py-12">
        <SectionHeading eyebrow="Handpicked" title="Featured products" description="Our current favourites — trusted quality at smart prices." action={<ViewAll to="/shop" />} />
        <ProductGrid products={featured()} />
      </section>

      {/* Promo banner */}
      <section className="container-page py-8 md:py-12">
        <div className="relative overflow-hidden rounded-xl bg-primary text-primary-foreground">
          <div className="grid lg:grid-cols-2 gap-8 p-8 md:p-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs uppercase tracking-wide"><Mountain className="h-3.5 w-3.5" /> Launch collection</div>
              <h2 className="mt-4 font-display text-3xl md:text-4xl font-bold leading-tight">From the mountains of Gilgit-Baltistan to your home</h2>
              <p className="mt-3 text-primary-foreground/85 max-w-lg">Stone-milled Himalayan buckwheat and wild-harvested sea buckthorn — sourced with care, packed for freshness, delivered across Pakistan.</p>
              <Link to="/category/$slug" params={{ slug: "himalayan-buckwheat" }} className="mt-6 inline-flex items-center gap-2 rounded-md bg-savings text-savings-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity">
                Explore the collection <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="hidden lg:block relative">
              <img src="https://picsum.photos/seed/promo-collection/900/600" alt="Launch collection" className="rounded-lg w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Why shop with us */}
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

      {/* Best sellers */}
      <section className="container-page py-8 md:py-12">
        <SectionHeading eyebrow="Customers love" title="Best sellers" action={<ViewAll to="/shop" />} />
        <ProductGrid products={bestSellers()} />
      </section>

      {/* Brand story */}
      <section className="bg-surface border-y border-border py-12 md:py-16">
        <div className="container-page grid lg:grid-cols-2 gap-10 items-center">
          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted">
            <img src="https://picsum.photos/seed/story/900/700" alt="Gilgit-Baltistan story" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-primary font-semibold">Our story</div>
            <h2 className="mt-2 font-display text-3xl md:text-4xl font-bold">A marketplace built for smart Pakistani shoppers</h2>
            <p className="mt-4 text-muted-foreground">Our journey begins in the pristine valleys of Gilgit-Baltistan with premium Himalayan buckwheat and sea buckthorn. The long-term vision is bigger — a trusted multi-category marketplace where every purchase feels like a smart purchase.</p>
            <Link to="/about" className="mt-6 inline-flex items-center gap-2 text-primary font-medium hover:text-primary-dark">Read our story <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      {/* New arrivals */}
      <section className="container-page py-12 md:py-16">
        <SectionHeading eyebrow="Fresh in" title="New arrivals" action={<ViewAll to="/shop" />} />
        <ProductGrid products={newArrivals().length ? newArrivals() : products.slice(0, 4)} />
      </section>

      {/* Deals */}
      <section className="container-page pb-12 md:pb-16">
        <div className="rounded-xl border border-savings/30 bg-gradient-to-br from-savings/10 via-background to-background p-6 md:p-8">
          <SectionHeading eyebrow="Savings" title="Today's smart deals" description="Handpicked discounts on the products we love — while stocks last." action={<ViewAll to="/shop" label="See all deals" />} />
          <ProductGrid products={dealsProducts()} />
        </div>
      </section>

      {/* Newsletter */}
      <section className="container-page pb-12 md:pb-16">
        <div className="rounded-xl bg-primary text-primary-foreground p-8 md:p-12 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold">Smart deals, straight to your inbox</h2>
          <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto">Subscribe for launches, offers and savings tips — no spam, ever.</p>
          <form onSubmit={(e) => e.preventDefault()} className="mt-6 flex max-w-md mx-auto gap-2">
            <input type="email" required placeholder="Your email address" className="flex-1 h-12 rounded-md px-4 text-foreground bg-background border-0 focus:outline-none focus:ring-2 focus:ring-savings" />
            <button className="h-12 rounded-md bg-savings text-savings-foreground px-6 font-semibold hover:opacity-90">Subscribe</button>
          </form>
        </div>
      </section>

      {/* Recently viewed */}
      {recent.items.length > 0 && (
        <section className="container-page pb-16">
          <SectionHeading eyebrow="Just for you" title="Recently viewed" />
          <ProductGrid products={recent.items} />
        </section>
      )}
    </div>
  );
}
