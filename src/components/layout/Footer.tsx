import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Youtube, ShieldCheck, Truck, Sparkles, Headphones, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { useSiteSettings, useSiteSection } from "@/context/SiteContext";
import { subscribeNewsletter } from "@/lib/contact.functions";
import { toast } from "sonner";
import { useState } from "react";

const cols = [
  {
    heading: "About",
    links: [
      { label: "About Us", to: "/about" },
      { label: "Our Story", to: "/about" },
      { label: "Why Shop With Us", to: "/about" },
    ],
  },
  {
    heading: "Customer Service",
    links: [
      { label: "Contact Us", to: "/contact" },
      { label: "FAQs", to: "/faq" },
      { label: "Shipping Information", to: "/shipping" },
      { label: "Returns & Refunds", to: "/returns" },
      { label: "Order Tracking", to: "/track-order" },
    ],
  },
  {
    heading: "Policies",
    links: [
      { label: "Privacy Policy", to: "/privacy-policy" },
      { label: "Terms & Conditions", to: "/terms" },
      { label: "Refund Policy", to: "/refund-policy" },
    ],
  },
  {
    heading: "My Account",
    links: [
      { label: "Login", to: "/login" },
      { label: "Register", to: "/register" },
      { label: "My Orders", to: "/account/orders" },
      { label: "Wishlist", to: "/wishlist" },
    ],
  },
] as const;

export function Footer() {
  const settings = useSiteSettings();
  const footer = useSiteSection("footer");
  const [busy, setBusy] = useState(false);

  const brand = (settings.site_name?.trim() || "BachatAtBazaar.pk").replace(/\.[^.]+$/, "");
  const tagline = settings.tagline?.trim() || "Shop Smart. Save More. Live Better.";
  const description =
    (footer.description as string | undefined)?.trim() ||
    "Pakistan's smart shopping marketplace — bringing carefully selected quality products to your doorstep, from Gilgit-Baltistan's finest to everyday essentials.";
  const email = (footer.email as string | undefined)?.trim() || settings.notification_email?.trim() || "support@bachatatbazaar.pk";
  const phone = (footer.phone as string | undefined)?.trim() || settings.whatsapp_number?.trim() || "+92 312 1007009";
  const address = (footer.address as string | undefined)?.trim() || "Rawalpindi, Pakistan";

  const socials: { icon: typeof Facebook; url?: string }[] = [
    { icon: Facebook, url: settings.social_facebook },
    { icon: Instagram, url: settings.social_instagram },
    { icon: Youtube, url: settings.social_youtube },
  ];

  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="border-b border-border">
        <div className="container-page grid grid-cols-2 md:grid-cols-4 gap-6 py-8">
          {[
            { icon: ShieldCheck, title: "Secure Shopping", sub: "Safe & protected checkout" },
            { icon: Truck, title: "Nationwide Delivery", sub: "Across Pakistan" },
            { icon: Sparkles, title: "Quality Products", sub: "Carefully selected" },
            { icon: Headphones, title: "Customer Support", sub: "We're here to help" },
          ].map((t) => (
            <div key={t.title} className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <t.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{t.title}</div>
                <div className="text-xs text-muted-foreground">{t.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 text-sm text-muted-foreground max-w-sm">{description}</p>
          <div className="mt-5">
            <div className="text-sm font-semibold mb-2">Get in touch</div>
            <address className="not-italic text-sm text-muted-foreground space-y-1">
              <div>Email: {email}</div>
              <div>Phone: {phone}</div>
              <div className="whitespace-pre-line">{address}</div>
            </address>
          </div>
          <div className="mt-5 flex gap-2">
            {socials.map((s, i) => (
              <a
                key={i}
                href={s.url || "#"}
                target={s.url ? "_blank" : undefined}
                rel={s.url ? "noopener noreferrer" : undefined}
                aria-label="Social"
                className="h-9 w-9 grid place-items-center rounded-md border border-border hover:bg-accent"
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.heading}>
            <h3 className="text-sm font-semibold text-foreground mb-3">{c.heading}</h3>
            <ul className="space-y-2 text-sm">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-muted-foreground hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="container-page py-8 grid gap-6 md:grid-cols-2 items-center">
          <div>
            <h3 className="font-display text-lg font-semibold">Smart Deals, Straight to Your Inbox</h3>
            <p className="text-sm text-muted-foreground">Subscribe for offers, launches and savings tips.</p>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setBusy(true);
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
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input name="email" type="email" required placeholder="Your email address" className="pl-10 h-11" />
            </div>
            <Button type="submit" disabled={busy} className="h-11 px-6 bg-primary hover:bg-primary-dark text-primary-foreground">
              Subscribe
            </Button>
          </form>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container-page py-5 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} {brand} — All rights reserved.</div>
          <div>{tagline}</div>
        </div>
      </div>
    </footer>
  );
}
