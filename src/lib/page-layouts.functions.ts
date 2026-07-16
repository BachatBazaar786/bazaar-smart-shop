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

const pageKeySchema = z.object({ page_key: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/) });

export const getPageLayoutPublic = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => pageKeySchema.parse(i))
  .handler(async ({ data }) => {
    const s = getPublicClient();
    const { data: row, error } = await s
      .from("page_layouts")
      .select("data, updated_at")
      .eq("page_key", data.page_key)
      .maybeSingle();
    if (error) throw safeError("page_layout_get", error);
    return row ?? null;
  });

export const savePageLayoutAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      page_key: pageKeySchema.shape.page_key,
      // Puck data is arbitrary but bounded
      data: z.record(z.unknown()),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: rpcErr } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (rpcErr) throw safeError("admin_check", rpcErr);
    if (isAdmin !== true) throw new Error("Not authorized");

    const { error } = await context.supabase
      .from("page_layouts")
      .upsert(
        { page_key: data.page_key, data: data.data as never, updated_by: context.userId },
        { onConflict: "page_key" },
      );
    if (error) throw safeError("page_layout_save", error);
    return { ok: true };
  });
