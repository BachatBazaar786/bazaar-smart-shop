import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { OrderSummary } from "@/types/catalog";

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
    if (prodErr) throw new Error(prodErr.message);
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
    const total = subtotal + shipping;

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
        discount: 0,
        tax: 0,
        total,
        shipping_address: data.shipping_address,
        notes: data.notes,
        order_number: "",
      } as never)
      .select("id, order_number")
      .single();
    if (orderErr || !order) throw new Error(orderErr?.message ?? "Failed to create order.");

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(lineItems.map((li) => ({ ...li, order_id: order.id })));
    if (itemsErr) {
      await supabase.from("orders").delete().eq("id", order.id);
      throw new Error(itemsErr.message);
    }

    // Atomically decrement stock per line. Roll back the order if any line fails.
    for (const li of lineItems) {
      const { data: ok, error: decErr } = await supabase.rpc(
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
      changed_by: userId,
    } as never);


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
    if (error) throw new Error(error.message);
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
    if (error) throw new Error(error.message);
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
    const supabase = getPublicClient();
    const { data: order } = await supabase
      .from("orders")
      .select("order_number, status, payment_status, created_at, total, email")
      .eq("order_number", data.order_number)
      .maybeSingle();
    if (
      !order ||
      order.email?.toLowerCase() !== data.email.toLowerCase()
    ) {
      return { found: false as const };
    }
    return {
      found: true as const,
      order: {
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        created_at: order.created_at,
        total: Number(order.total),
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

async function requireAdmin(supabase: {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
}, userId: string) {
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
      const s = data.search.trim();
      query = query.or(
        `order_number.ilike.%${s}%,email.ilike.%${s}%`,
      );
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

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
    if (error) throw new Error(error.message);
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
    const { error } = await supabase.rpc("admin_update_order_status", {
      _order_id: data.order_id,
      _status: data.status,
      _payment_status: data.payment_status,
      _note: data.note || null,
    });
    if (error) throw new Error(error.message);
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
