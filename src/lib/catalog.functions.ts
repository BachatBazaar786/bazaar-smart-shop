import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type {
  CategoryItem,
  ProductDetail,
  ProductListItem,
} from "@/types/catalog";
import { safeError, escapePostgrestLiteral } from "./server-errors";

function getPublicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

type ProductRow = Database["public"]["Tables"]["products"]["Row"] & {
  categories: { slug: string; name: string } | null;
  product_images: { url: string; sort_order: number }[];
};

function mapListItem(p: ProductRow): ProductListItem {
  const images = [...(p.product_images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: Number(p.price),
    salePrice: p.sale_price !== null ? Number(p.sale_price) : null,
    stock: p.stock,
    rating: Number(p.rating),
    reviewCount: p.review_count,
    image: images[0]?.url ?? "https://picsum.photos/seed/placeholder/800/800",
    category: p.categories
      ? { slug: p.categories.slug, name: p.categories.name }
      : null,
    bestSeller: p.best_seller,
    newArrival: p.new_arrival,
    onDeal: p.on_deal,
    featured: p.featured,
  };
}

const listInput = z
  .object({
    categorySlug: z.string().optional(),
    featured: z.boolean().optional(),
    bestSeller: z.boolean().optional(),
    newArrival: z.boolean().optional(),
    onDeal: z.boolean().optional(),
    search: z.string().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    inStockOnly: z.boolean().optional(),
    minRating: z.number().optional(),
    sort: z
      .enum(["featured", "price-asc", "price-desc", "rating", "newest"])
      .optional(),
    limit: z.number().min(1).max(100).optional(),
  })
  .default({});

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => listInput.parse(input))
  .handler(async ({ data }): Promise<ProductListItem[]> => {
    const supabase = getPublicClient();
    let q = supabase
      .from("products")
      .select(
        "id, slug, name, price, sale_price, stock, rating, review_count, best_seller, new_arrival, on_deal, featured, categories(slug, name), product_images(url, sort_order)",
      )
      .eq("status", "active");

    if (data.featured) q = q.eq("featured", true);
    if (data.bestSeller) q = q.eq("best_seller", true);
    if (data.newArrival) q = q.eq("new_arrival", true);
    if (data.onDeal) q = q.eq("on_deal", true);
    if (data.inStockOnly) q = q.gt("stock", 0);
    if (typeof data.minPrice === "number") q = q.gte("price", data.minPrice);
    if (typeof data.maxPrice === "number") q = q.lte("price", data.maxPrice);
    if (typeof data.minRating === "number")
      q = q.gte("rating", data.minRating);
    if (data.search && data.search.trim()) {
      const s = escapePostgrestLiteral(data.search);
      if (s) q = q.or(`name.ilike.%${s}%,short_description.ilike.%${s}%`);
    }
    if (data.categorySlug) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", data.categorySlug)
        .maybeSingle();
      if (!cat) return [];
      q = q.eq("category_id", cat.id);
    }

    switch (data.sort) {
      case "price-asc":
        q = q.order("price", { ascending: true });
        break;
      case "price-desc":
        q = q.order("price", { ascending: false });
        break;
      case "rating":
        q = q.order("rating", { ascending: false });
        break;
      case "newest":
        q = q.order("created_at", { ascending: false });
        break;
      default:
        q = q
          .order("featured", { ascending: false })
          .order("best_seller", { ascending: false })
          .order("created_at", { ascending: false });
    }

    if (data.limit) q = q.limit(data.limit);

    const { data: rows, error } = await q;
    if (error) throw safeError("catalog", error);
    return (rows as unknown as ProductRow[]).map(mapListItem);
  });

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string() }).parse(input),
  )
  .handler(async ({ data }): Promise<ProductDetail | null> => {
    const supabase = getPublicClient();
    const { data: p, error } = await supabase
      .from("products")
      .select(
        "id, slug, name, sku, price, sale_price, stock, rating, review_count, best_seller, new_arrival, on_deal, featured, short_description, description, benefits, usage, tags, categories(slug, name), product_images(url, sort_order), product_specifications(label, value, sort_order)",
      )
      .eq("slug", data.slug)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw safeError("catalog", error);
    if (!p) return null;

    const row = p as unknown as ProductRow & {
      sku: string;
      short_description: string | null;
      description: string | null;
      benefits: string[];
      usage: string | null;
      tags: string[];
      product_specifications: {
        label: string;
        value: string;
        sort_order: number;
      }[];
    };
    const listItem = mapListItem(row);
    const images = [...(row.product_images ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const specs = [...(row.product_specifications ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    return {
      ...listItem,
      sku: row.sku,
      shortDescription: row.short_description ?? "",
      description: row.description ?? "",
      images: images.length
        ? images.map((i) => i.url)
        : ["https://picsum.photos/seed/placeholder/800/800"],
      benefits: row.benefits ?? [],
      usage: row.usage,
      tags: row.tags ?? [],
      specifications: specs.map((s) => ({ label: s.label, value: s.value })),
    };
  });

export const getRelatedProducts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string(), limit: z.number().default(4) }).parse(input),
  )
  .handler(async ({ data }): Promise<ProductListItem[]> => {
    const supabase = getPublicClient();
    const { data: p } = await supabase
      .from("products")
      .select("id, category_id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!p?.category_id) return [];
    const { data: rows, error } = await supabase
      .from("products")
      .select(
        "id, slug, name, price, sale_price, stock, rating, review_count, best_seller, new_arrival, on_deal, featured, categories(slug, name), product_images(url, sort_order)",
      )
      .eq("status", "active")
      .eq("category_id", p.category_id)
      .neq("id", p.id)
      .limit(data.limit);
    if (error) throw safeError("catalog", error);
    return (rows as unknown as ProductRow[]).map(mapListItem);
  });

export const listCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<CategoryItem[]> => {
    const supabase = getPublicClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, slug, name, description, image_url, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) throw safeError("catalog", error);
    return (data ?? []) as CategoryItem[];
  },
);

export const getCategoryBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string() }).parse(input),
  )
  .handler(async ({ data }): Promise<CategoryItem | null> => {
    const supabase = getPublicClient();
    const { data: row, error } = await supabase
      .from("categories")
      .select("id, slug, name, description, image_url, sort_order")
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (error) throw safeError("catalog", error);
    return row as CategoryItem | null;
  });

export const searchProducts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ q: z.string(), limit: z.number().default(6) }).parse(input),
  )
  .handler(async ({ data }): Promise<ProductListItem[]> => {
    if (!data.q.trim()) return [];
    const supabase = getPublicClient();
    const s = escapePostgrestLiteral(data.q);
    if (!s) return [];
    const { data: rows, error } = await supabase
      .from("products")
      .select(
        "id, slug, name, price, sale_price, stock, rating, review_count, best_seller, new_arrival, on_deal, featured, categories(slug, name), product_images(url, sort_order)",
      )
      .eq("status", "active")
      .or(`name.ilike.%${s}%,short_description.ilike.%${s}%`)
      .limit(data.limit);
    if (error) throw safeError("catalog", error);
    return (rows as unknown as ProductRow[]).map(mapListItem);
  });
