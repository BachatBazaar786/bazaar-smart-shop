import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { listProducts, listCategories } from "@/lib/catalog.functions";

const BASE_URL = "https://bazaar-smart-shop.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/shop", changefreq: "daily", priority: "0.9" },
          { path: "/blog", changefreq: "weekly", priority: "0.6" },
          { path: "/about", changefreq: "monthly", priority: "0.6" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
          { path: "/faqs", changefreq: "monthly", priority: "0.5" },
          { path: "/track-order", changefreq: "yearly", priority: "0.3" },
        ];


        let dynamic: SitemapEntry[] = [];
        try {
          const [products, categories] = await Promise.all([
            listProducts({ data: {} }),
            listCategories(),
          ]);
          dynamic = [
            ...categories.map((c) => ({
              path: `/category/${c.slug}`,
              changefreq: "weekly" as const,
              priority: "0.7",
            })),
            ...products.map((p) => ({
              path: `/product/${p.slug}`,
              changefreq: "weekly" as const,
              priority: "0.8",
            })),
          ];
        } catch {
          // If the DB is unreachable at request time, still serve the static entries.
        }

        const entries = [...staticEntries, ...dynamic];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
