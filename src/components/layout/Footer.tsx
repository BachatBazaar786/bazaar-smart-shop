import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Youtube, ShieldCheck, Truck, Sparkles, Headphones, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

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
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      {/* Trust strip */}
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
          <p className="mt-4 text-sm text-muted-foreground max-w-sm">
            Pakistan's smart shopping marketplace — bringing carefully selected quality products
            to your doorstep, from Gilgit-Baltistan's finest to everyday essentials.
          </p>
          <div className="mt-5">
            <div className="text-sm font-semibold mb-2">Get in touch</div>
            <address className="not-italic text-sm text-muted-foreground space-y-1">
              <div>Email: hello@bachatatbazaar.pk</div>
              <div>Phone: +92 300 0000000</div>
              <div>Karachi, Pakistan</div>
            </address>
          </div>
          <div className="mt-5 flex gap-2">
            {[Facebook, Instagram, Youtube].map((I, i) => (
              <a
                key={i}
                href="#"
                aria-label="Social"
                className="h-9 w-9 grid place-items-center rounded-md border border-border hover:bg-accent"
              >
                <I className="h-4 w-4" />
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
          <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="email" required placeholder="Your email address" className="pl-10 h-11" />
            </div>
            <Button type="submit" className="h-11 px-6 bg-primary hover:bg-primary-dark text-primary-foreground">
              Subscribe
            </Button>
          </form>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container-page py-5 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} BachatAtBazaar.pk — All rights reserved.</div>
          <div>Shop Smart. Save More. Live Better.</div>
        </div>
      </div>
    </footer>
  );
}
