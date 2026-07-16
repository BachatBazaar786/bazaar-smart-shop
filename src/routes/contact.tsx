import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PuckPageRenderer } from "@/components/site/PuckPageRenderer";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact BachatAtBazaar.pk — Support & Partnerships" },
      { name: "description", content: "Get in touch with BachatAtBazaar.pk by email, phone or WhatsApp. Nationwide support across Pakistan for orders, products and partnerships." },
      { property: "og:title", content: "Contact BachatAtBazaar.pk" },
      { property: "og:description", content: "Reach us by email, phone or WhatsApp. Nationwide support across Pakistan." },
      { property: "og:url", content: "https://bazaar-smart-shop.lovable.app/contact" },
    ],
    links: [{ rel: "canonical", href: "https://bazaar-smart-shop.lovable.app/contact" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: "BachatAtBazaar.pk",
        url: "https://bazaar-smart-shop.lovable.app/contact",
        email: "support@bachatatbazaar.pk",
        telephone: "+92-312-1007009",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Rawalpindi",
          addressCountry: "PK",
        },
        openingHoursSpecification: [{
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          opens: "10:00",
          closes: "19:00",
        }],
      }),
    }],
  }),

  component: ContactPage,
});


function ContactPage() {
  const [sent, setSent] = useState(false);
  return (
    <div className="container-page py-12">
      <PuckPageRenderer pageKey="contact" />

      <div className="max-w-2xl">
        <h1 className="font-display text-4xl md:text-5xl font-bold">Get in touch</h1>
        <p className="mt-3 text-muted-foreground text-lg">Have a question about an order, a product, or a partnership idea? We'd love to hear from you.</p>
      </div>

      <div className="mt-10 grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
            toast.success("Message sent — we'll be in touch soon.");
            (e.target as HTMLFormElement).reset();
          }}
          className="rounded-lg border border-border bg-card p-6 space-y-5"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label htmlFor="cname">Name</Label><Input id="cname" required /></div>
            <div><Label htmlFor="cemail">Email</Label><Input id="cemail" type="email" required /></div>
          </div>
          <div><Label htmlFor="csubj">Subject</Label><Input id="csubj" required /></div>
          <div><Label htmlFor="cmsg">Message</Label><Textarea id="cmsg" rows={5} required /></div>
          <Button type="submit" className="bg-primary hover:bg-primary-dark">Send message</Button>
          {sent && <p className="text-sm text-primary">Thanks — we've received your message.</p>}
        </form>

        <aside className="space-y-4">
          {[
            { icon: Mail, label: "Email", value: "support@bachatatbazaar.pk" },
            { icon: Phone, label: "Phone", value: "+92 312 1007009" },
            { icon: MessageCircle, label: "WhatsApp", value: "+92 312 1007009" },
            { icon: MapPin, label: "Address", value: "Rawalpindi, Pakistan" },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary shrink-0"><c.icon className="h-5 w-5" /></div>
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
                <div className="font-medium truncate">{c.value}</div>
              </div>
            </div>
          ))}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Support hours</div>
            <div className="mt-1 text-sm">Monday – Saturday · 10am – 7pm (PKT)</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
