import { createFileRoute, Link } from "@tanstack/react-router";
import { Mountain, Sparkles, Leaf, ShieldCheck, Package, Heart } from "lucide-react";
import { PuckPageRenderer } from "@/components/site/PuckPageRenderer";
import { useSiteSection } from "@/context/SiteContext";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About BachatAtBazaar.pk — Our Story" },
      { name: "description", content: "Learn how BachatAtBazaar.pk brings premium Himalayan superfoods and smart everyday shopping to Pakistan from the valleys of Gilgit-Baltistan." },
      { property: "og:title", content: "About BachatAtBazaar.pk — Our Story" },
      { property: "og:description", content: "Pakistan's smart shopping marketplace, starting in the valleys of Gilgit-Baltistan." },
      { property: "og:url", content: "https://bazaar-smart-shop.lovable.app/about" },
    ],
    links: [{ rel: "canonical", href: "https://bazaar-smart-shop.lovable.app/about" }],
  }),
  component: About,
});


function About() {
  const about = useSiteSection("about_page");
  const heroImg = (about.hero_image as string | undefined)?.trim() || "https://picsum.photos/seed/about-hero/1000/750";
  const missionImg = (about.mission_image as string | undefined)?.trim() || "https://picsum.photos/seed/about-mission/900/700";
  return (
    <div>
      <PuckPageRenderer pageKey="about" />
      <section className="bg-surface border-b border-border">

        <div className="container-page py-16 md:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><Mountain className="h-3.5 w-3.5" /> Our Story</div>
            <h1 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">A smart marketplace, built for Pakistan.</h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">BachatAtBazaar.pk began with a simple idea — that everyday shopping should feel smart, honest and genuinely valuable. We start in the valleys of Gilgit-Baltistan and grow from there.</p>
          </div>
          <div className="aspect-[4/3] rounded-xl overflow-hidden"><img src={heroImg} alt="Gilgit-Baltistan" className="h-full w-full object-cover" /></div>
        </div>
      </section>

      <section className="container-page py-16 grid lg:grid-cols-2 gap-10 items-center">
        <div className="aspect-[4/3] rounded-xl overflow-hidden order-2 lg:order-1"><img src={missionImg} alt="Mission" className="h-full w-full object-cover" /></div>
        <div className="order-1 lg:order-2">
          <div className="text-xs uppercase tracking-[0.15em] text-primary font-semibold">Our Mission</div>
          <h2 className="mt-2 font-display text-3xl md:text-4xl font-bold">Quality products at smart prices — with genuine care.</h2>
          <p className="mt-4 text-muted-foreground">We carefully select every product, work directly with growers and makers, and make sure our prices reflect real value. Whether it's stone-milled Himalayan buckwheat or the tech you use every day — we want each purchase to feel worth it.</p>
        </div>
      </section>

      <section className="bg-surface border-y border-border py-16">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-xs uppercase tracking-[0.15em] text-primary font-semibold">Our Values</div>
            <h2 className="mt-2 font-display text-3xl md:text-4xl font-bold">What we stand for</h2>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {[
              { icon: Sparkles, title: "Quality first", desc: "We only sell products we would happily use ourselves." },
              { icon: Leaf, title: "Rooted in Pakistan", desc: "We start close to home — from the growers of Gilgit-Baltistan." },
              { icon: ShieldCheck, title: "Honest & transparent", desc: "Clear pricing, clear policies, no fine print." },
              { icon: Package, title: "Real savings", desc: "Smart prices without cutting corners on quality." },
              { icon: Heart, title: "Customer care", desc: "A friendly team that treats every question like it matters." },
              { icon: Mountain, title: "Big vision", desc: "From superfoods today to a full marketplace for tomorrow." },
            ].map((v) => (
              <div key={v.title} className="rounded-lg border border-border bg-card p-5">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary"><v.icon className="h-5 w-5" /></div>
                <div className="mt-3 font-semibold">{v.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold">Ready to shop smart?</h2>
        <p className="mt-3 text-muted-foreground">Discover our carefully curated launch collection.</p>
        <Link to="/shop" className="mt-6 inline-flex rounded-md bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-dark">Shop Now</Link>
      </section>
    </div>
  );
}
