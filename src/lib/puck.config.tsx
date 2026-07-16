import type { Config, Data } from "@measured/puck";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listProducts, listCategories } from "@/lib/catalog.functions";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SectionHeading } from "@/components/common/SectionHeading";


/** Puck blocks — mirror the site design system so drag-and-drop pages match the rest of the site. */

type HeroProps = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  align: "left" | "center";
};

type BannerProps = { image: string; href: string; alt: string; height: "sm" | "md" | "lg" };
type TextProps = { title?: string; body: string; align: "left" | "center" };
type ImageProps = { src: string; alt: string; rounded: boolean };
type PromoProps = { text: string; href?: string };
type ProductGridBlockProps = {
  title: string;
  filter: "featured" | "bestSeller" | "newArrival" | "onDeal" | "all";
  limit: number;
};
type CategoryGridProps = { title: string; slugs: string };
type FeaturesProps = { items: { icon: string; label: string; sub?: string }[] };
type SpacerProps = { size: "sm" | "md" | "lg" | "xl" };

type Blocks = {
  Hero: HeroProps;
  Banner: BannerProps;
  Text: TextProps;
  Image: ImageProps;
  Promo: PromoProps;
  ProductGrid: ProductGridBlockProps;
  CategoryGrid: CategoryGridProps;
  Features: FeaturesProps;
  Spacer: SpacerProps;
};

/** Simple image field — text URL plus quick "Upload/pick" hint (uses the Media Library at /admin/media). */
const imageField = {
  type: "text" as const,
  label: "Image URL (upload in Media library, then paste URL here)",
};

export const puckConfig: Config<Blocks> = {
  components: {
    Hero: {
      label: "Hero section",
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        ctaLabel: { type: "text", label: "Button label" },
        ctaHref: { type: "text", label: "Button link" },
        image: imageField,
        align: { type: "radio", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }] },
      },
      defaultProps: {
        title: "Premium products. Smarter prices.",
        subtitle: "Shop carefully curated essentials, delivered across Pakistan.",
        ctaLabel: "Shop now",
        ctaHref: "/shop",
        image: "https://picsum.photos/seed/hero/1200/800",
        align: "left",
      },
      render: ({ title, subtitle, ctaLabel, ctaHref, image, align }) => (
        <section className="container-page py-10 md:py-16">
          <div className={`grid gap-8 md:grid-cols-2 items-center ${align === "center" ? "text-center md:text-left" : ""}`}>
            <div>
              <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-4 text-muted-foreground text-base md:text-lg max-w-xl">{subtitle}</p>
              {ctaLabel && (
                <Link to={ctaHref} className="inline-flex mt-6 items-center rounded-md bg-primary text-primary-foreground px-5 py-3 font-medium hover:bg-primary-dark">
                  {ctaLabel}
                </Link>
              )}
            </div>
            {image && (
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                <img src={image} alt={title} className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </section>
      ),
    },
    Banner: {
      label: "Banner",
      fields: {
        image: imageField,
        href: { type: "text", label: "Link" },
        alt: { type: "text", label: "Alt text" },
        height: { type: "select", options: [{ label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }] },
      },
      defaultProps: { image: "https://picsum.photos/seed/banner/1600/500", href: "/shop", alt: "Deal banner", height: "md" },
      render: ({ image, href, alt, height }) => {
        const h = height === "sm" ? "h-32 md:h-40" : height === "lg" ? "h-64 md:h-96" : "h-48 md:h-64";
        const inner = (
          <div className={`${h} w-full overflow-hidden rounded-xl bg-muted`}>
            <img src={image} alt={alt} className="w-full h-full object-cover" />
          </div>
        );
        return (
          <div className="container-page py-4">
            {href ? <Link to={href}>{inner}</Link> : inner}
          </div>
        );
      },
    },
    Text: {
      label: "Text section",
      fields: {
        title: { type: "text", label: "Title (optional)" },
        body: { type: "textarea", label: "Body" },
        align: { type: "radio", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }] },
      },
      defaultProps: { title: "About us", body: "Write a short introduction here.", align: "left" },
      render: ({ title, body, align }) => (
        <section className="container-page py-8">
          <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
            {title && <h2 className="font-display text-2xl md:text-3xl font-semibold mb-3">{title}</h2>}
            <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{body}</p>
          </div>
        </section>
      ),
    },
    Image: {
      label: "Image",
      fields: {
        src: imageField,
        alt: { type: "text", label: "Alt text" },
        rounded: { type: "radio", options: [{ label: "Rounded", value: true as unknown as string }, { label: "Square", value: false as unknown as string }] },
      },
      defaultProps: { src: "https://picsum.photos/seed/img/1200/700", alt: "", rounded: true },
      render: ({ src, alt, rounded }) => (
        <div className="container-page py-4">
          <img src={src} alt={alt} className={`w-full h-auto ${rounded ? "rounded-xl" : ""}`} />
        </div>
      ),
    },
    Promo: {
      label: "Promo strip",
      fields: { text: { type: "text", label: "Text" }, href: { type: "text", label: "Link (optional)" } },
      defaultProps: { text: "Free delivery on orders over Rs. 3000", href: "/shop" },
      render: ({ text, href }) => (
        <div className="bg-primary/10 text-primary text-center text-sm py-2.5">
          {href ? <Link to={href} className="underline underline-offset-2">{text}</Link> : text}
        </div>
      ),
    },
    ProductGrid: {
      label: "Product grid",
      fields: {
        title: { type: "text", label: "Section title" },
        filter: {
          type: "select",
          options: [
            { label: "Featured", value: "featured" },
            { label: "Best sellers", value: "bestSeller" },
            { label: "New arrivals", value: "newArrival" },
            { label: "On deal", value: "onDeal" },
            { label: "All products", value: "all" },
          ],
        },
        limit: { type: "number", label: "How many products", min: 1, max: 24 },
      },
      defaultProps: { title: "Featured products", filter: "featured", limit: 8 },
      render: ({ title, filter, limit }) => <ProductGridBlock title={title} filter={filter} limit={limit} />,
    },
    CategoryGrid: {
      label: "Category grid",
      fields: {
        title: { type: "text", label: "Section title" },
        slugs: { type: "text", label: "Category slugs (comma separated, empty = all)" },
      },
      defaultProps: { title: "Shop by category", slugs: "" },
      render: ({ title, slugs }) => <CategoryGridBlock title={title} slugs={slugs} />,
    },
    Features: {
      label: "Feature icons",
      fields: {
        items: {
          type: "array",
          arrayFields: {
            icon: { type: "text", label: "Emoji or short label" },
            label: { type: "text", label: "Title" },
            sub: { type: "text", label: "Subtitle" },
          },
          getItemSummary: (i) => i.label || "Feature",
        },
      },
      defaultProps: {
        items: [
          { icon: "🚚", label: "Nationwide delivery", sub: "Across Pakistan" },
          { icon: "🛡️", label: "Secure checkout", sub: "Safe & protected" },
          { icon: "✨", label: "Quality products", sub: "Carefully selected" },
        ],
      },
      render: ({ items }) => (
        <section className="container-page py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items?.map((f, i) => (
              <div key={i} className="rounded-lg border border-border p-4 bg-card">
                <div className="text-2xl">{f.icon}</div>
                <div className="mt-2 font-medium">{f.label}</div>
                {f.sub && <div className="text-xs text-muted-foreground">{f.sub}</div>}
              </div>
            ))}
          </div>
        </section>
      ),
    },
    Spacer: {
      label: "Spacer",
      fields: { size: { type: "select", options: [{ label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }, { label: "XL", value: "xl" }] } },
      defaultProps: { size: "md" },
      render: ({ size }) => <div className={size === "sm" ? "h-4" : size === "lg" ? "h-16" : size === "xl" ? "h-24" : "h-8"} />,
    },
  },
};

function ProductGridBlock({ title, filter, limit }: ProductGridBlockProps) {
  const filters: Record<string, boolean> = {};
  if (filter === "featured") filters.featured = true;
  if (filter === "bestSeller") filters.bestSeller = true;
  if (filter === "newArrival") filters.newArrival = true;
  if (filter === "onDeal") filters.onDeal = true;
  const { data } = useQuery({
    queryKey: ["puck-products", filter, limit],
    queryFn: () => listProducts({ data: { ...filters, limit } }),
  });
  return (
    <section className="container-page py-8">
      {title && <SectionHeading title={title} />}
      <ProductGrid products={data ?? []} />
    </section>
  );
}

function CategoryGridBlock({ title, slugs }: CategoryGridProps) {
  const { data } = useQuery({ queryKey: ["puck-categories"], queryFn: () => listCategories() });
  const wanted = slugs.split(",").map((s) => s.trim()).filter(Boolean);
  const items = (data ?? []).filter((c) => (wanted.length ? wanted.includes(c.slug) : true));
  return (
    <section className="container-page py-8">
      {title && <SectionHeading title={title} />}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((c) => (
          <Link
            key={c.id}
            to="/category/$slug"
            params={{ slug: c.slug }}
            className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card hover:shadow-md transition"
          >
            <div className="aspect-[4/3] bg-muted overflow-hidden">
              {c.image_url && <img src={c.image_url} alt={c.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />}
            </div>
            <div className="p-3">
              <div className="font-medium text-sm">{c.name}</div>
              {c.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{c.description}</div>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}


export type PuckData = Data;
