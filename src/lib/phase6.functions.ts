import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { safeError } from "./server-errors";

function getPublicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_admin", { _user_id: userId });
  if (error) throw new Error("Authorization check failed");
  if (data !== true) throw new Error("Not authorized");
}

// ================================================================
// BLOG — admin
// ================================================================
const blogPostSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, "Lowercase, numbers, hyphens"),
  excerpt: z.string().max(500).nullable().optional(),
  body: z.string().max(200_000).default(""),
  cover_image: z.string().url().max(2000).nullable().optional(),
  status: z.enum(["draft", "published", "archived"]),
  published_at: z.string().datetime().nullable().optional(),
  seo_title: z.string().max(200).nullable().optional(),
  seo_description: z.string().max(500).nullable().optional(),
  reading_minutes: z.number().int().min(0).max(999).nullable().optional(),
  category_ids: z.array(z.string().uuid()).max(20).default([]),
});

export const listBlogPostsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("blog_posts")
      .select("id, title, slug, status, cover_image, published_at, view_count, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) throw safeError("blog_list", error);
    return data ?? [];
  });

export const getBlogPostAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: p, error } = await context.supabase
      .from("blog_posts")
      .select("*, blog_post_categories(category_id)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw safeError("blog_get", error);
    return p;
  });

export const upsertBlogPostAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => blogPostSchema.parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { category_ids, id, ...rest } = data;
    const row = {
      ...rest,
      published_at:
        rest.status === "published" && !rest.published_at
          ? new Date().toISOString()
          : rest.published_at ?? null,
      author_id: context.userId,
    };
    let postId = id;
    if (postId) {
      const { error } = await context.supabase.from("blog_posts").update(row).eq("id", postId);
      if (error) throw safeError("blog_update", error);
    } else {
      const { data: ins, error } = await context.supabase.from("blog_posts").insert(row).select("id").single();
      if (error) throw safeError("blog_insert", error);
      postId = (ins as { id: string }).id;
    }
    await context.supabase.from("blog_post_categories").delete().eq("post_id", postId);
    if (category_ids.length) {
      await context.supabase
        .from("blog_post_categories")
        .insert(category_ids.map((c) => ({ post_id: postId, category_id: c })));
    }
    return { id: postId };
  });

export const deleteBlogPostAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("blog_posts").delete().eq("id", data.id);
    if (error) throw safeError("blog_delete", error);
    return { ok: true };
  });

const blogCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).nullable().optional(),
});

export const listBlogCategoriesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("blog_categories").select("*").order("name");
    if (error) throw safeError("blog_cat", error);
    return data ?? [];
  });

export const upsertBlogCategoryAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => blogCategorySchema.parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.id) {
      const { error } = await context.supabase.from("blog_categories").update(data).eq("id", data.id);
      if (error) throw safeError("blog_cat_upd", error);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase.from("blog_categories").insert(data).select("id").single();
    if (error) throw safeError("blog_cat_ins", error);
    return { id: (ins as { id: string }).id };
  });

export const deleteBlogCategoryAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("blog_categories").delete().eq("id", data.id);
    if (error) throw safeError("blog_cat_del", error);
    return { ok: true };
  });

// ================================================================
// BLOG — public
// ================================================================
export const listBlogPostsPublic = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) =>
    z.object({ limit: z.number().int().min(1).max(50).optional().default(20) }).parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    const s = getPublicClient();
    const { data: rows, error } = await s
      .from("blog_posts")
      .select("id, title, slug, excerpt, cover_image, published_at, reading_minutes")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(data.limit);
    if (error) throw safeError("blog_pub", error);
    return rows ?? [];
  });

export const getBlogPostPublic = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ slug: z.string() }).parse(i))
  .handler(async ({ data }) => {
    const s = getPublicClient();
    const { data: post, error } = await s
      .from("blog_posts")
      .select(
        "id, title, slug, excerpt, body, cover_image, published_at, reading_minutes, seo_title, seo_description, view_count, blog_post_categories(blog_categories(id, name, slug))",
      )
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw safeError("blog_pub_get", error);
    return post;
  });

// ================================================================
// COUPONS — admin
// ================================================================
const couponSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(2).max(40).regex(/^[A-Z0-9_-]+$/i),
  description: z.string().max(300).nullable().optional(),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.number().positive().max(1_000_000),
  min_order: z.number().min(0).max(1_000_000).default(0),
  max_discount: z.number().positive().max(1_000_000).nullable().optional(),
  starts_at: z.string().datetime().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  usage_limit: z.number().int().min(1).max(1_000_000).nullable().optional(),
  per_user_limit: z.number().int().min(1).max(1000).nullable().optional(),
  active: z.boolean().default(true),
});

export const listCouponsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("coupons").select("*").order("created_at", { ascending: false });
    if (error) throw safeError("coupons", error);
    return data ?? [];
  });

export const upsertCouponAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => couponSchema.parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const row = { ...data, code: data.code.toUpperCase() };
    if (row.id) {
      const { error } = await context.supabase.from("coupons").update(row).eq("id", row.id);
      if (error) throw safeError("coupon_upd", error);
      return { id: row.id };
    }
    const { data: ins, error } = await context.supabase.from("coupons").insert(row).select("id").single();
    if (error) throw safeError("coupon_ins", error);
    return { id: (ins as { id: string }).id };
  });

export const deleteCouponAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("coupons").delete().eq("id", data.id);
    if (error) throw safeError("coupon_del", error);
    return { ok: true };
  });

// ================================================================
// COUPONS — customer validate
// ================================================================
export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ code: z.string().min(2).max(40), subtotal: z.number().nonnegative() }).parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("validate_coupon", {
      _code: data.code,
      _subtotal: data.subtotal,
    });
    if (error) throw safeError("coupon_validate", error);
    const row = Array.isArray(rows) ? rows[0] : rows;
    return row as { valid: boolean; message: string; discount: number; coupon_id: string | null };
  });

// ================================================================
// PRODUCT VARIANTS
// ================================================================
const variantSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  sku: z.string().max(80).nullable().optional(),
  price: z.number().nonnegative().max(10_000_000),
  sale_price: z.number().nonnegative().max(10_000_000).nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000),
  attributes: z.record(z.string(), z.string()).default({}),
  sort_order: z.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true),
});

export const listVariantsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ product_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", data.product_id)
      .order("sort_order")
      .order("name");
    if (error) throw safeError("variants", error);
    return rows ?? [];
  });

export const upsertVariantAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => variantSchema.parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.id) {
      const { error } = await context.supabase.from("product_variants").update(data).eq("id", data.id);
      if (error) throw safeError("variant_upd", error);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase.from("product_variants").insert(data).select("id").single();
    if (error) throw safeError("variant_ins", error);
    return { id: (ins as { id: string }).id };
  });

export const deleteVariantAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("product_variants").delete().eq("id", data.id);
    if (error) throw safeError("variant_del", error);
    return { ok: true };
  });

// Public read of active variants for a product
export const getProductVariantsPublic = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ product_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const s = getPublicClient();
    const { data: rows, error } = await s
      .from("product_variants")
      .select("id, name, price, sale_price, stock, attributes, sort_order")
      .eq("product_id", data.product_id)
      .eq("active", true)
      .order("sort_order");
    if (error) throw safeError("variants_pub", error);
    return rows ?? [];
  });

// ================================================================
// VIEW TRACKING (anonymous or user)
// ================================================================
export const trackProductView = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ product_id: z.string().uuid(), session_id: z.string().max(80).optional() }).parse(i),
  )
  .handler(async ({ data }) => {
    const s = getPublicClient();
    const { error } = await s.from("product_views").insert({
      product_id: data.product_id,
      session_id: data.session_id ?? null,
    });
    if (error) throw safeError("track_view", error);
    return { ok: true };
  });

// ================================================================
// PAGE BLOCKS (visual page builder)
// ================================================================
const blockSchema = z.object({
  id: z.string().uuid().optional(),
  page_key: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/),
  block_type: z.enum([
    "hero",
    "banner",
    "category_grid",
    "product_grid",
    "promo",
    "text",
    "features",
  ]),
  data: z.record(z.string(), z.unknown()).default({}),
  sort_order: z.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true),
});

export const listPageBlocksAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ page_key: z.string().min(1).max(60) }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("page_blocks")
      .select("*")
      .eq("page_key", data.page_key)
      .order("sort_order");
    if (error) throw safeError("blocks", error);
    return rows ?? [];
  });

export const upsertPageBlockAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => blockSchema.parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const row = { ...data, data: data.data as never };
    if (data.id) {
      const { error } = await context.supabase.from("page_blocks").update(row).eq("id", data.id);
      if (error) throw safeError("block_upd", error);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase.from("page_blocks").insert(row).select("id").single();
    if (error) throw safeError("block_ins", error);
    return { id: (ins as { id: string }).id };
  });


export const deletePageBlockAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("page_blocks").delete().eq("id", data.id);
    if (error) throw safeError("block_del", error);
    return { ok: true };
  });

export const listPageBlocksPublic = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ page_key: z.string().min(1).max(60) }).parse(i))
  .handler(async ({ data }) => {
    const s = getPublicClient();
    const { data: rows, error } = await s
      .from("page_blocks")
      .select("id, block_type, data, sort_order")
      .eq("page_key", data.page_key)
      .eq("active", true)
      .order("sort_order");
    if (error) throw safeError("blocks_pub", error);
    return rows ?? [];
  });

// ================================================================
// SITE CONTENT — public (single section)
// ================================================================
export const getSiteContentPublic = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ section_key: z.string().min(1).max(80) }).parse(i))
  .handler(async ({ data }) => {
    const s = getPublicClient();
    const { data: row, error } = await s
      .from("site_content")
      .select("data")
      .eq("section_key", data.section_key)
      .maybeSingle();
    if (error) throw safeError("cms_pub", error);
    return (row?.data ?? null) as unknown as Record<string, string | number | boolean | null> | null;
  });


// ================================================================
// ANALYTICS EXTRAS
// ================================================================
export const getAnalyticsExtras = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: json, error } = await context.supabase.rpc("admin_analytics_extras", { _days: data.days });
    if (error) throw safeError("analytics_extras", error);
    return json as {
      most_viewed: { id: string; name: string; slug: string; views: number }[];
      coupons: { code: string; used_count: number; total_discount: number }[];
      blog: { total: number; published: number; views: number };
    };
  });
