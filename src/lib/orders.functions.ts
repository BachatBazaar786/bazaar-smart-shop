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
    if (itemsErr) throw new Error(itemsErr.message);

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
