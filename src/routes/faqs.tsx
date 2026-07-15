import { createFileRoute } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqCategories } from "@/data/faqs";

export const Route = createFileRoute("/faqs")({
  head: () => {
    const url = "https://bazaar-smart-shop.lovable.app/faqs";
    return {
      meta: [
        { title: "FAQs — BachatAtBazaar.pk" },
        { name: "description", content: "Answers to common questions about ordering, payments, shipping and returns at BachatAtBazaar.pk." },
        { property: "og:title", content: "Frequently Asked Questions — BachatAtBazaar.pk" },
        { property: "og:description", content: "How ordering, payments, shipping and returns work at BachatAtBazaar.pk." },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqCategories.flatMap((c) =>
              c.items.map((i) => ({
                "@type": "Question",
                name: i.q,
                acceptedAnswer: { "@type": "Answer", text: i.a },
              })),
            ),
          }),
        },
      ],
    };
  },
  component: FaqsPage,
});


function FaqsPage() {
  return (
    <div className="container-page py-12 max-w-4xl">
      <h1 className="font-display text-4xl md:text-5xl font-bold">Frequently asked questions</h1>
      <p className="mt-3 text-muted-foreground text-lg">Answers to the questions we hear most often. Can't find yours? <a href="/contact" className="text-primary font-medium">Get in touch</a>.</p>

      <div className="mt-10 space-y-8">
        {faqCategories.map((cat) => (
          <section key={cat.name}>
            <h2 className="font-display text-2xl font-bold mb-3">{cat.name}</h2>
            <Accordion type="single" collapsible className="rounded-lg border border-border bg-card">
              {cat.items.map((item, i) => (
                <AccordionItem key={i} value={`${cat.name}-${i}`}>
                  <AccordionTrigger className="px-4 text-left">{item.q}</AccordionTrigger>
                  <AccordionContent className="px-4 text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>
    </div>
  );
}
