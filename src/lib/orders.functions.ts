import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { OrderSummary } from "@/types/catalog";
import { safeError, escapePostgrestLiteral } from "./server-errors";
import { sendTemplateEmail } from "./email-templates/send-email";

const ADMIN_EMAIL = "bachatatbazaar.pk@gmail.com";
const SITE_URL = "https://bachatatbazaar.pk";
const SITE_NAME = "BachatAtBazaar.pk";

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

const shippingAddressSchema = z.object({
  full_name: z.string().min(1).max(120),
  phone: z.string().min(6).max(30),
  email: z.string().email(),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().default(""),
  city: z.string().min(1).max(100),
  province: z.string().min(1).max(100),
  postal_code: z.string().max(20).optional().default(""),
  country: z.string().default("Pakistan"),
});

const createOrderInput = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(30),
  shipping_address: shippingAddressSchema,
  payment_method: z.enum(["cod", "bank_transfer", "jazzcash", "easypaisa"]),
  notes: z.string().max(1000).optional().default(""),
  coupon_code: z.string().max(40).optional().nullable(),
});


export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createOrderInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const productIds = data.items.map((i) => i.product_id);
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select(
        "id, name, sku, price, sale_price, stock, status, product_images(url, sort_order)",
      )
      .in("id", productIds);
    if (prodErr) throw safeError("orders", prodErr);
    if (!products || products.length !== productIds.length)
      throw new Error("One or more products are unavailable.");

    const byId = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const lineItems = data.items.map((it) => {
      const p = byId.get(it.product_id)!;
      if (p.status !== "active")
        throw new Error(`${p.name} is not available.`);
      if (p.stock < it.quantity)
        throw new Error(`Not enough stock for ${p.name}.`);
      const unit = p.sale_price !== null ? Number(p.sale_price) : Number(p.price);
      const lineSub = unit * it.quantity;
      subtotal += lineSub;
      const images = [...(p.product_images ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      );
      return {
        product_id: p.id,
        name_snapshot: p.name,
        sku_snapshot: p.sku,
        image_url: images[0]?.url ?? null,
        unit_price: unit,
        quantity: it.quantity,
        subtotal: lineSub,
      };
    });

    const shipping = subtotal >= 3000 ? 0 : 250;

    // Apply coupon (via SECURITY DEFINER RPC that validates limits, dates, min_order)
    let discount = 0;
    let couponId: string | null = null;
    let couponCode: string | null = null;
    if (data.coupon_code && data.coupon_code.trim()) {
      const code = data.coupon_code.trim().toUpperCase();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: vrows, error: vErr } = await supabaseAdmin.rpc("validate_coupon", {
        _code: code,
        _subtotal: subtotal,
      });
      if (vErr) throw safeError("orders", vErr);
      const v = (Array.isArray(vrows) ? vrows[0] : vrows) as
        | { valid: boolean; message: string; discount: number | string; coupon_id: string | null }
        | null;
      if (!v?.valid) throw new Error(v?.message || "Coupon is not valid.");
      discount = Math.min(Number(v.discount) || 0, subtotal);
      couponId = v.coupon_id;
      couponCode = code;
    }

    const total = Math.max(0, subtotal - discount) + shipping;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        email: data.shipping_address.email,
        payment_method: data.payment_method,
        payment_status:
          data.payment_method === "bank_transfer"
            ? "awaiting_verification"
            : "unpaid",
        status: "pending",
        subtotal,
        shipping,
        discount,
        discount_total: discount,
        coupon_code: couponCode,
        tax: 0,
        total,
        shipping_address: data.shipping_address,
        notes: data.notes,
        order_number: "",
      } as never)
      .select("id, order_number")
      .single();

    if (orderErr || !order) throw safeError("orders", orderErr, "Failed to create order.");

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(lineItems.map((li) => ({ ...li, order_id: order.id })));
    if (itemsErr) {
      await supabase.from("orders").delete().eq("id", order.id);
      throw safeError("orders", itemsErr);
    }

    // Atomically decrement stock per line. Roll back the order if any line fails.
    const { supabaseAdmin: adminForStock } = await import("@/integrations/supabase/client.server");
    for (const li of lineItems) {
      const { data: ok, error: decErr } = await adminForStock.rpc(
        "decrement_product_stock",
        { _product_id: li.product_id, _qty: li.quantity },
      );
      if (decErr || ok !== true) {
        await supabase.from("orders").delete().eq("id", order.id);
        throw new Error(
          `Sorry, "${li.name_snapshot}" just went out of stock. Please try again.`,
        );
      }
    }

    await supabase.from("order_status_history").insert({
      order_id: order.id,
      status: "pending",
      note: "Order placed by customer",
      created_by: userId,
    } as never);

    if (couponId) {
      await supabase.from("coupon_redemptions").insert({
        coupon_id: couponId,
        order_id: order.id,
        user_id: userId,
        discount,
      } as never);
    }

    // Fetch logo for branded email (best-effort; never blocks order success).
    let logoUrl: string | undefined
    try {
      const { data: settings } = await supabase
        .from("site_settings")
        .select("data")
        .eq("id", true as never)
        .maybeSingle();
      const d = (settings?.data ?? {}) as Record<string, any>;
      if (typeof d.logo_url === "string") logoUrl = d.logo_url;
    } catch {}

    const emailPayload = {
      logoUrl,
      siteName: SITE_NAME,
      siteUrl: SITE_URL,
      orderNumber: order.order_number,
      customerName: data.shipping_address.full_name,
      email: data.shipping_address.email,
      paymentMethod: data.payment_method,
      paymentStatus:
        data.payment_method === "bank_transfer" ? "awaiting_verification" : "unpaid",
      status: "pending",
      subtotal,
      shipping,
      discount,
      total,
      currency: "Rs",
      items: lineItems.map((li) => ({
        name: li.name_snapshot,
        sku: li.sku_snapshot,
        quantity: li.quantity,
        unit_price: li.unit_price,
        subtotal: li.subtotal,
      })),
      shippingAddress: data.shipping_address,
    };

    // Send customer + admin notifications (best-effort — never fail the order).
    try {
      await sendTemplateEmail("order-confirmation", data.shipping_address.email, {
        templateData: {
          ...emailPayload,
          isAdminCopy: false,
          orderUrl: `${SITE_URL}/order-confirmation?order=${encodeURIComponent(order.order_number)}`,
        },
        idempotencyKey: `order-customer-${order.id}`,
      });
    } catch (e) {
      console.error("[orders] customer email failed", e);
    }
    try {
      await sendTemplateEmail("order-confirmation", ADMIN_EMAIL, {
        templateData: {
          ...emailPayload,
          isAdminCopy: true,
          orderUrl: `${SITE_URL}/admin/orders/${order.id}`,
        },
        idempotencyKey: `order-admin-${order.id}`,
        replyTo: data.shipping_address.email,
      });
    } catch (e) {
      console.error("[orders] admin email failed", e);
    }

    return { id: order.id, order_number: order.order_number };
  });



export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, payment_status, payment_method, total, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw safeError("orders", error);
    return data ?? [];
  });

export const getMyOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ order_number: z.string() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<OrderSummary | null> => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, payment_status, payment_method, subtotal, shipping, total, email, shipping_address, created_at, order_items(id, name_snapshot, sku_snapshot, image_url, unit_price, quantity, subtotal)",
      )
      .eq("user_id", userId)
      .eq("order_number", data.order_number)
      .maybeSingle();
    if (error) throw safeError("orders", error);
    if (!order) return null;
    const o = order as unknown as {
      id: string;
      order_number: string;
      status: string;
      payment_status: string;
      payment_method: string;
      subtotal: string | number;
      shipping: string | number;
      total: string | number;
      email: string;
      shipping_address: OrderSummary["shipping_address"];
      created_at: string;
      order_items: OrderSummary["items"];
    };
    return {
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      payment_status: o.payment_status,
      payment_method: o.payment_method,
      subtotal: Number(o.subtotal),
      shipping: Number(o.shipping),
      total: Number(o.total),
      email: o.email,
      shipping_address: o.shipping_address,
      created_at: o.created_at,
      items: o.order_items ?? [],
    };
  });

export const trackOrderPublic = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        order_number: z.string().min(3).max(60),
        email: z.string().email(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("track_order_public", {
      _order_number: data.order_number,
      _email: data.email,
    });
    if (error) throw safeError("orders", error);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return { found: false as const };
    return {
      found: true as const,
      order: {
        order_number: row.order_number as string,
        status: row.status as string,
        payment_status: row.payment_status as string,
        created_at: row.created_at as string,
        total: Number(row.total),
      },
    };
  });

// ---------- Admin ----------

const orderStatusValues = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

const paymentStatusValues = [
  "unpaid",
  "awaiting_verification",
  "paid",
  "failed",
  "refunded",
] as const;

export type AdminOrderRow = {
  id: string;
  order_number: string;
  status: (typeof orderStatusValues)[number];
  payment_status: (typeof paymentStatusValues)[number];
  payment_method: string;
  total: number;
  email: string;
  customer_name: string;
  item_count: number;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_admin", { _user_id: userId });
  if (error) throw new Error("Authorization check failed");
  if (data !== true) throw new Error("Not authorized");
}


export const listOrdersAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        search: z.string().max(120).optional().default(""),
        status: z.enum(orderStatusValues).optional(),
        payment_status: z.enum(paymentStatusValues).optional(),
        limit: z.number().int().min(1).max(200).optional().default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<AdminOrderRow[]> => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    let query = supabase
      .from("orders")
      .select(
        "id, order_number, status, payment_status, payment_method, total, email, shipping_address, created_at, order_items(id)",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.status) query = query.eq("status", data.status);
    if (data.payment_status) query = query.eq("payment_status", data.payment_status);
    if (data.search) {
      const s = escapePostgrestLiteral(data.search);
      if (s) {
        query = query.or(`order_number.ilike.%${s}%,email.ilike.%${s}%`);
      }
    }

    const { data: rows, error } = await query;
    if (error) throw safeError("orders", error);

    return (rows ?? []).map((r) => {
      const addr = (r as { shipping_address: { full_name?: string } | null }).shipping_address;
      const items = (r as { order_items: unknown[] | null }).order_items ?? [];
      return {
        id: r.id,
        order_number: r.order_number,
        status: r.status as AdminOrderRow["status"],
        payment_status: r.payment_status as AdminOrderRow["payment_status"],
        payment_method: r.payment_method as string,
        total: Number(r.total),
        email: r.email,
        customer_name: addr?.full_name ?? "",
        item_count: items.length,
        created_at: r.created_at,
      };
    });
  });

export const getOrderAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ order_number: z.string() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<(OrderSummary & { notes: string | null; history: { id: string; status: string; note: string | null; created_at: string }[] }) | null> => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, payment_status, payment_method, subtotal, shipping, total, email, shipping_address, notes, created_at, order_items(id, name_snapshot, sku_snapshot, image_url, unit_price, quantity, subtotal), order_status_history(id, status, note, created_at)",
      )
      .eq("order_number", data.order_number)
      .maybeSingle();
    if (error) throw safeError("orders", error);
    if (!order) return null;

    const o = order as unknown as {
      id: string;
      order_number: string;
      status: string;
      payment_status: string;
      payment_method: string;
      subtotal: string | number;
      shipping: string | number;
      total: string | number;
      email: string;
      shipping_address: OrderSummary["shipping_address"];
      notes: string | null;
      created_at: string;
      order_items: OrderSummary["items"];
      order_status_history: { id: string; status: string; note: string | null; created_at: string }[];
    };

    return {
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      payment_status: o.payment_status,
      payment_method: o.payment_method,
      subtotal: Number(o.subtotal),
      shipping: Number(o.shipping),
      total: Number(o.total),
      email: o.email,
      shipping_address: o.shipping_address,
      notes: o.notes,
      created_at: o.created_at,
      items: o.order_items ?? [],
      history: (o.order_status_history ?? []).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    };
  });

export const updateOrderStatusAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        order_id: z.string().uuid(),
        status: z.enum(orderStatusValues),
        payment_status: z.enum(paymentStatusValues),
        note: z.string().max(500).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("admin_update_order_status", {
      _order_id: data.order_id,
      _status: data.status,
      _payment_status: data.payment_status,
      _note: data.note || "",
    });
    if (error) throw safeError("orders", error);
    return { ok: true };
  });

export const isCurrentUserAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    return data === true;
  });
