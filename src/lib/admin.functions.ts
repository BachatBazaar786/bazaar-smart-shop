import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { safeError, escapePostgrestLiteral } from "./server-errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_admin", { _user_id: userId });
  if (error) throw new Error("Authorization check failed");
  if (data !== true) throw new Error("Not authorized");
}

// =============== Dashboard ===============
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("admin_dashboard_stats");
    if (error) throw safeError("dashboard", error);
    return data as {
      revenue: { total_revenue: number; today_revenue: number; week_revenue: number; month_revenue: number; year_revenue: number };
      counts: { products_total: number; categories_total: number; brands_total: number; tags_total: number; orders_total: number };
      customers: { total_customers: number; new_customers: number; returning_customers: number };
      inventory: { inventory_value: number; low_stock: number; out_of_stock: number; total_products: number };
      orders_by_status: { status: string; count: number }[];
      daily_revenue: { date: string; revenue: number; orders: number }[];
      top_products: { product_id: string | null; name: string; units: number; revenue: number }[];
      revenue_by_category: { name: string; revenue: number }[];
      revenue_by_brand: { name: string; revenue: number }[];
      recent_orders: { id: string; order_number: string; status: string; payment_status: string; total: number; email: string; created_at: string }[];
      recent_customers: { id: string; full_name: string | null; created_at: string }[];
    };
  });

// =============== Products ===============
export const listProductsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      search: z.string().max(120).optional().default(""),
      status: z.enum(["draft", "active", "archived"]).optional(),
      category_id: z.string().uuid().optional(),
      brand_id: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(500).optional().default(200),
    }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    let q = supabase
      .from("products")
      .select("id, name, slug, sku, price, sale_price, stock, status, featured, best_seller, new_arrival, on_deal, created_at, updated_at, category_id, brand_id, categories(name), brands(name), product_images(url, sort_order)")
      .order("updated_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.category_id) q = q.eq("category_id", data.category_id);
    if (data.brand_id) q = q.eq("brand_id", data.brand_id);
    if (data.search) {
      const s = escapePostgrestLiteral(data.search);
      if (s) q = q.or(`name.ilike.%${s}%,sku.ilike.%${s}%,slug.ilike.%${s}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw safeError("products", error);
    return (rows ?? []).map((r) => {
      const imgs = ((r as { product_images: { url: string; sort_order: number }[] }).product_images ?? []).sort((a, b) => a.sort_order - b.sort_order);
      return {
        id: r.id as string,
        name: r.name as string,
        slug: r.slug as string,
        sku: r.sku as string,
        price: Number(r.price),
        sale_price: r.sale_price !== null ? Number(r.sale_price) : null,
        stock: r.stock as number,
        status: r.status as string,
        featured: r.featured as boolean,
        best_seller: r.best_seller as boolean,
        new_arrival: r.new_arrival as boolean,
        on_deal: r.on_deal as boolean,
        created_at: r.created_at as string,
        updated_at: r.updated_at as string,
        category_name: (r as { categories: { name: string } | null }).categories?.name ?? null,
        brand_name: (r as { brands: { name: string } | null }).brands?.name ?? null,
        image_url: imgs[0]?.url ?? null,
      };
    });
  });

export const getProductAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { data: p, error } = await supabase
      .from("products")
      .select("*, product_images(id, url, alt, sort_order), product_specifications(id, label, value, sort_order), product_tags(tag_id)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw safeError("products", error);
    return p;
  });

const productWriteSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, hyphens"),
  sku: z.string().min(1).max(80),
  description: z.string().max(20000).optional().nullable(),
  short_description: z.string().max(500).optional().nullable(),
  usage: z.string().max(5000).optional().nullable(),
  benefits: z.array(z.string().max(200)).max(30).optional().default([]),
  tags: z.array(z.string().max(60)).max(30).optional().default([]),
  price: z.number().nonnegative().max(10_000_000),
  sale_price: z.number().nonnegative().max(10_000_000).nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000),
  category_id: z.string().uuid().nullable().optional(),
  brand_id: z.string().uuid().nullable().optional(),
  status: z.enum(["draft", "active", "archived"]),
  featured: z.boolean().default(false),
  best_seller: z.boolean().default(false),
  new_arrival: z.boolean().default(false),
  on_deal: z.boolean().default(false),
  images: z.array(z.object({ url: z.string().url().max(2000), alt: z.string().max(200).default("") })).max(20).default([]),
  specifications: z.array(z.object({ label: z.string().min(1).max(80), value: z.string().min(1).max(400) })).max(50).default([]),
  tag_ids: z.array(z.string().uuid()).max(30).default([]),
});

export const upsertProductAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => productWriteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    const productRow = {
      name: data.name,
      slug: data.slug,
      sku: data.sku,
      description: data.description ?? null,
      short_description: data.short_description ?? null,
      usage: data.usage ?? null,
      benefits: data.benefits ?? [],
      tags: data.tags ?? [],
      price: data.price,
      sale_price: data.sale_price ?? null,
      stock: data.stock,
      category_id: data.category_id ?? null,
      brand_id: data.brand_id ?? null,
      status: data.status,
      featured: data.featured,
      best_seller: data.best_seller,
      new_arrival: data.new_arrival,
      on_deal: data.on_deal,
    };

    let productId = data.id;
    if (productId) {
      const { error } = await supabase.from("products").update(productRow).eq("id", productId);
      if (error) throw safeError("product_update", error);
    } else {
      const { data: inserted, error } = await supabase.from("products").insert(productRow).select("id").single();
      if (error) throw safeError("product_insert", error);
      productId = (inserted as { id: string }).id;
    }

    // Replace images
    await supabase.from("product_images").delete().eq("product_id", productId);
    if (data.images.length) {
      const rows = data.images.map((img, i) => ({ product_id: productId, url: img.url, alt: img.alt, sort_order: i }));
      const { error } = await supabase.from("product_images").insert(rows);
      if (error) throw safeError("product_images", error);
    }

    // Replace specs
    await supabase.from("product_specifications").delete().eq("product_id", productId);
    if (data.specifications.length) {
      const rows = data.specifications.map((s, i) => ({ product_id: productId, label: s.label, value: s.value, sort_order: i }));
      const { error } = await supabase.from("product_specifications").insert(rows);
      if (error) throw safeError("product_specs", error);
    }

    // Replace tag links
    await supabase.from("product_tags").delete().eq("product_id", productId);
    if (data.tag_ids.length) {
      const rows = data.tag_ids.map((t) => ({ product_id: productId, tag_id: t }));
      const { error } = await supabase.from("product_tags").insert(rows);
      if (error) throw safeError("product_tags", error);
    }

    return { id: productId };
  });

export const deleteProductAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { error } = await supabase.from("products").delete().eq("id", data.id);
    if (error) throw safeError("product_delete", error);
    return { ok: true };
  });

export const duplicateProductAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { data: src, error } = await supabase.from("products")
      .select("*, product_images(url, alt, sort_order), product_specifications(label, value, sort_order)")
      .eq("id", data.id).maybeSingle();
    if (error || !src) throw safeError("product_dup", error ?? new Error("Not found"));
    const p = src as {
      name: string; slug: string; sku: string;
      description: string | null; short_description: string | null; usage: string | null;
      benefits: string[]; tags: string[]; price: number; sale_price: number | null;
      category_id: string | null; brand_id: string | null;
      product_images: { url: string; alt: string | null; sort_order: number }[];
      product_specifications: { label: string; value: string; sort_order: number }[];
    };
    const suffix = Math.random().toString(36).slice(2, 6);
    const insertRow = {
      name: `${p.name} (Copy)`,
      slug: `${p.slug}-${suffix}`,
      sku: `${p.sku}-${suffix}`,
      description: p.description, short_description: p.short_description, usage: p.usage,
      benefits: p.benefits, tags: p.tags, price: p.price, sale_price: p.sale_price,
      stock: 0, category_id: p.category_id, brand_id: p.brand_id, status: "draft" as const,
      featured: false, best_seller: false, new_arrival: false, on_deal: false,
    };
    const { data: newP, error: e2 } = await supabase.from("products").insert(insertRow).select("id").single();
    if (e2) throw safeError("product_dup_insert", e2);
    const newId = (newP as { id: string }).id;
    if (p.product_images.length) {
      await supabase.from("product_images").insert(p.product_images.map((i) => ({ product_id: newId, url: i.url, alt: i.alt, sort_order: i.sort_order })));
    }
    if (p.product_specifications.length) {
      await supabase.from("product_specifications").insert(p.product_specifications.map((s) => ({ product_id: newId, label: s.label, value: s.value, sort_order: s.sort_order })));
    }
    return { id: newId };
  });

// =============== Bulk Import ===============
const bulkImportRow = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  sku: z.string().min(1).max(80).optional(),
  short_description: z.string().max(500).optional().nullable(),
  description: z.string().max(20000).optional().nullable(),
  price: z.number().nonnegative().max(10_000_000),
  sale_price: z.number().nonnegative().max(10_000_000).nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000).default(0),
  category_slug: z.string().max(200).optional().nullable(),
  brand_slug: z.string().max(200).optional().nullable(),
  status: z.enum(["draft", "active", "archived"]).default("active"),
  featured: z.boolean().optional().default(false),
  image_url: z.string().url().max(2000).optional().nullable(),
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 200) || "product";
}

export const bulkImportProductsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      rows: z.array(z.record(z.string(), z.unknown())).min(1).max(1000),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Preload categories & brands for slug lookup
    const [{ data: cats }, { data: brands }] = await Promise.all([
      supabaseAdmin.from("categories").select("id, slug"),
      supabaseAdmin.from("brands").select("id, slug"),
    ]);
    const catMap = new Map((cats ?? []).map((c: { id: string; slug: string }) => [c.slug, c.id]));
    const brandMap = new Map((brands ?? []).map((b: { id: string; slug: string }) => [b.slug, b.id]));

    let created = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < data.rows.length; i++) {
      const raw = data.rows[i] as Record<string, unknown>;
      // Coerce numeric fields
      const coerced = {
        ...raw,
        price: raw.price !== undefined && raw.price !== "" ? Number(raw.price) : undefined,
        sale_price: raw.sale_price !== undefined && raw.sale_price !== "" && raw.sale_price !== null ? Number(raw.sale_price) : null,
        stock: raw.stock !== undefined && raw.stock !== "" ? Number(raw.stock) : 0,
        featured: raw.featured === true || raw.featured === "true" || raw.featured === "1" || raw.featured === 1,
      };
      const parsed = bulkImportRow.safeParse(coerced);
      if (!parsed.success) {
        errors.push({ row: i + 2, error: parsed.error.issues[0]?.message ?? "Invalid row" });
        continue;
      }
      const r = parsed.data;
      const slug = r.slug ? slugify(r.slug) : slugify(r.name);
      const sku = r.sku ?? `SKU-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const category_id = r.category_slug ? (catMap.get(r.category_slug) ?? null) : null;
      const brand_id = r.brand_slug ? (brandMap.get(r.brand_slug) ?? null) : null;

      const { data: ins, error: insErr } = await supabaseAdmin
        .from("products")
        .insert({
          name: r.name,
          slug,
          sku,
          short_description: r.short_description ?? null,
          description: r.description ?? null,
          price: r.price,
          sale_price: r.sale_price ?? null,
          stock: r.stock,
          category_id,
          brand_id,
          status: r.status,
          featured: r.featured,
        } as never)
        .select("id")
        .single();
      if (insErr || !ins) {
        errors.push({ row: i + 2, error: insErr?.message ?? "Insert failed" });
        continue;
      }
      if (r.image_url) {
        await supabaseAdmin.from("product_images").insert({
          product_id: (ins as { id: string }).id,
          url: r.image_url,
          alt: r.name,
          sort_order: 0,
        } as never);
      }
      created++;
    }
    return { created, failed: errors.length, errors: errors.slice(0, 50) };
  });

// =============== Categories ===============
const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).nullable().optional(),
  image_url: z.string().url().max(2000).nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true),
  seo_title: z.string().max(200).nullable().optional(),
  seo_description: z.string().max(500).nullable().optional(),
});

export const listCategoriesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("categories").select("*").order("sort_order").order("name");
    if (error) throw safeError("categories", error);
    return data ?? [];
  });

export const upsertCategoryAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => categorySchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const row = { ...data };
    if (row.id) {
      const { error } = await context.supabase.from("categories").update(row).eq("id", row.id);
      if (error) throw safeError("category_update", error);
      return { id: row.id };
    }
    const { data: ins, error } = await context.supabase.from("categories").insert(row).select("id").single();
    if (error) throw safeError("category_insert", error);
    return { id: (ins as { id: string }).id };
  });

export const deleteCategoryAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw safeError("category_delete", error);
    return { ok: true };
  });

// =============== Brands ===============
const brandSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  logo_url: z.string().url().max(2000).nullable().optional(),
  banner_url: z.string().url().max(2000).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  seo_title: z.string().max(200).nullable().optional(),
  seo_description: z.string().max(500).nullable().optional(),
});

export const listBrandsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("brands").select("*").order("name");
    if (error) throw safeError("brands", error);
    return data ?? [];
  });

export const upsertBrandAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => brandSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.id) {
      const { error } = await context.supabase.from("brands").update(data).eq("id", data.id);
      if (error) throw safeError("brand_update", error);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase.from("brands").insert(data).select("id").single();
    if (error) throw safeError("brand_insert", error);
    return { id: (ins as { id: string }).id };
  });

export const deleteBrandAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("brands").delete().eq("id", data.id);
    if (error) throw safeError("brand_delete", error);
    return { ok: true };
  });

// =============== Tags ===============
export const listTagsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("tags").select("*").order("name");
    if (error) throw safeError("tags", error);
    return data ?? [];
  });

export const upsertTagAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(60),
      slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.id) {
      const { error } = await context.supabase.from("tags").update(data).eq("id", data.id);
      if (error) throw safeError("tag_update", error);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase.from("tags").insert(data).select("id").single();
    if (error) throw safeError("tag_insert", error);
    return { id: (ins as { id: string }).id };
  });

export const deleteTagAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("tags").delete().eq("id", data.id);
    if (error) throw safeError("tag_delete", error);
    return { ok: true };
  });

// =============== Customers ===============
export const listCustomersAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ search: z.string().max(120).optional().default(""), limit: z.number().int().min(1).max(500).optional().default(200) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("admin_list_customers", {
      _search: data.search,
      _limit: data.limit,
      _offset: 0,
    });
    if (error) throw safeError("customers", error);
    return (rows ?? []) as {
      id: string; email: string; full_name: string | null; phone: string | null; avatar_url: string | null;
      created_at: string; role: string; order_count: number; total_spent: number;
    }[];
  });

export const getCustomerAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const [{ data: profile }, { data: orders }, { data: notes }, { data: addresses }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", data.id).maybeSingle(),
      context.supabase.from("orders").select("id, order_number, status, payment_status, total, created_at").eq("user_id", data.id).order("created_at", { ascending: false }).limit(100),
      context.supabase.from("customer_notes").select("*").eq("user_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("addresses").select("*").eq("user_id", data.id),
      context.supabase.from("user_roles").select("role").eq("user_id", data.id),
    ]);
    return { profile, orders: orders ?? [], notes: notes ?? [], addresses: addresses ?? [], roles: (roles ?? []).map((r: { role: string }) => r.role) };
  });

export const addCustomerNoteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string().uuid(), note: z.string().min(1).max(2000) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("customer_notes").insert({ user_id: data.user_id, note: data.note, created_by: context.userId });
    if (error) throw safeError("customer_notes", error);
    return { ok: true };
  });

export const setCustomerRoleAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string().uuid(), role: z.enum(["customer", "admin"]) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    // Only super_admin can promote to admin
    const { data: isSuper } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
    if (!isSuper) throw new Error("Only super admin can change roles");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: deleteError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .in("role", ["admin", "customer"]);
    if (deleteError) throw safeError("role_update", deleteError);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    if (error) throw safeError("role_update", error);
    return { ok: true };
  });

async function assertTargetNotSuperAdmin(supabase: any, targetId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: targetId, _role: "super_admin" });
  if (data) throw new Error("Cannot modify a super admin account");
}

export const setCustomerActiveAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string().uuid(), active: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("You cannot deactivate your own account");
    await assertTargetNotSuperAdmin(context.supabase, data.user_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.active ? "none" : "876000h",
    } as any);
    if (error) throw safeError("customer_active", error);
    return { ok: true };
  });

export const deleteCustomerAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("You cannot delete your own account");
    await assertTargetNotSuperAdmin(context.supabase, data.user_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Detach orders so history is preserved (orders.user_id is nullable for guests)
    await supabaseAdmin.from("orders").update({ user_id: null }).eq("user_id", data.user_id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw safeError("customer_delete", error);
    return { ok: true };
  });

// =============== Inventory ===============
export const adjustStockAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      product_id: z.string().uuid(),
      delta: z.number().int().refine((v) => v !== 0, "Delta cannot be zero"),
      reason: z.enum(["restock", "manual", "correction", "damaged", "return"]),
      note: z.string().max(500).optional().default(""),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: stock, error } = await supabaseAdmin.rpc("admin_adjust_stock", {
      _product_id: data.product_id,
      _delta: data.delta,
      _reason: data.reason,
      _note: data.note || undefined,
    });
    if (error) throw safeError("adjust_stock", error);
    return { stock: stock as number };
  });

export const listStockMovementsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ product_id: z.string().uuid().optional(), limit: z.number().int().min(1).max(500).optional().default(200) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("stock_movements")
      .select("id, product_id, delta, reason, note, created_at, products(name, sku)")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.product_id) q = q.eq("product_id", data.product_id);
    const { data: rows, error } = await q;
    if (error) throw safeError("stock_movements", error);
    return (rows ?? []).map((r) => ({
      id: r.id as string,
      product_id: r.product_id as string,
      product_name: (r as { products: { name: string; sku: string } | null }).products?.name ?? "—",
      product_sku: (r as { products: { name: string; sku: string } | null }).products?.sku ?? "—",
      delta: r.delta as number,
      reason: r.reason as string,
      note: r.note as string | null,
      created_at: r.created_at as string,
    }));
  });

// =============== Media ===============
export const listMediaAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ bucket: z.enum(["media", "product-images"]).default("media") }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: files, error } = await context.supabase.storage.from(data.bucket).list("", { limit: 500, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw safeError("media_list", error);
    // Generate signed URLs (long-lived) since buckets are private
    const paths = (files ?? []).filter((f) => f.name && !f.name.endsWith("/")).map((f) => f.name);
    if (paths.length === 0) return [];
    const { data: signed } = await context.supabase.storage.from(data.bucket).createSignedUrls(paths, 60 * 60 * 24 * 365 * 5);
    return (files ?? []).map((f, i) => ({
      name: f.name,
      size: f.metadata?.size ?? 0,
      mime: (f.metadata?.mimetype as string | undefined) ?? "",
      created_at: f.created_at,
      url: signed?.[i]?.signedUrl ?? "",
    }));
  });

export const signMediaUploadAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      bucket: z.enum(["media", "product-images"]),
      filename: z.string().min(1).max(200).regex(/^[a-zA-Z0-9._-]+$/, "Filename can only include letters, numbers, dots, dashes, underscores"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const safeName = `${Date.now()}-${data.filename}`;
    const { data: signed, error } = await context.supabase.storage.from(data.bucket).createSignedUploadUrl(safeName);
    if (error) throw safeError("media_upload_sign", error);
    // Long-lived read URL for the eventual file
    const { data: read } = await context.supabase.storage.from(data.bucket).createSignedUrl(safeName, 60 * 60 * 24 * 365 * 5);
    return { path: safeName, signedUrl: signed.signedUrl, token: signed.token, readUrl: read?.signedUrl ?? "" };
  });

export const deleteMediaAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ bucket: z.enum(["media", "product-images"]), path: z.string().min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.storage.from(data.bucket).remove([data.path]);
    if (error) throw safeError("media_delete", error);
    return { ok: true };
  });

// =============== CMS ===============
export const listSiteContentAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("site_content").select("*").order("section_key");
    if (error) throw safeError("site_content", error);
    return data ?? [];
  });

export const upsertSiteContentAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ section_key: z.string().min(1).max(80).regex(/^[a-z0-9_]+$/), data: z.record(z.string(), z.unknown()) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("site_content").upsert({
      section_key: data.section_key,
      data: data.data as never,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    });
    if (error) throw safeError("site_content_write", error);
    return { ok: true };
  });

export const getSiteSettingsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("site_settings").select("*").maybeSingle();
    if (error) throw safeError("site_settings", error);
    return data;
  });

export const upsertSiteSettingsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ data: z.record(z.string(), z.unknown()) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("site_settings").upsert({ id: true, data: data.data as never, updated_by: context.userId, updated_at: new Date().toISOString() });
    if (error) throw safeError("site_settings_write", error);
    return { ok: true };
  });
