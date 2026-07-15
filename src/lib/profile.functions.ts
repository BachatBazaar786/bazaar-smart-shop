import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { safeError } from "./server-errors";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, avatar_url, created_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw safeError("profile", error);
    return data;
  });

const updateProfileInput = z.object({
  full_name: z.string().min(1).max(120),
  phone: z.string().max(30).optional().default(""),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateProfileInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: data.full_name, phone: data.phone })
      .eq("id", userId);
    if (error) throw safeError("profile", error);
    return { ok: true };
  });

export const listMyAddresses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("addresses")
      .select(
        "id, full_name, phone, line1, line2, city, province, postal_code, country, is_default",
      )
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw safeError("profile", error);
    return data ?? [];
  });

const addressInput = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().min(1).max(120),
  phone: z.string().min(6).max(30),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().default(""),
  city: z.string().min(1).max(100),
  province: z.string().min(1).max(100),
  postal_code: z.string().max(20).optional().default(""),
  country: z.string().default("Pakistan"),
  is_default: z.boolean().default(false),
});

export const saveMyAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => addressInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.is_default) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", userId);
    }
    if (data.id) {
      const { error } = await supabase
        .from("addresses")
        .update({ ...data, user_id: userId })
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) throw safeError("profile", error);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("addresses")
      .insert({ ...data, user_id: userId })
      .select("id")
      .single();
    if (error) throw safeError("profile", error);
    return { id: row!.id };
  });

export const deleteMyAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw safeError("profile", error);
    return { ok: true };
  });
