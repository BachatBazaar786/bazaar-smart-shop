
-- 1. Fix product_views: replace always-true INSERT policy
DROP POLICY IF EXISTS "views insert anyone" ON public.product_views;
CREATE POLICY "product_views_insert_scoped" ON public.product_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 2. Fix page_layouts: add published flag and restrict public read
ALTER TABLE public.page_layouts
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "public read page layouts" ON public.page_layouts;
CREATE POLICY "public read published page layouts" ON public.page_layouts
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

-- 3. Allow signed-in users to read their own roles so SECURITY INVOKER helpers work
CREATE POLICY "user_roles_read_own" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 4. Convert has_role / is_admin to SECURITY INVOKER (no longer flagged as sec-definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path = 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path = 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin'));
$$;

-- 5. Remove in-function is_admin check from admin_* so they can be invoked via service_role only.
--    Server-side callers verify admin BEFORE invoking with supabaseAdmin.

CREATE OR REPLACE FUNCTION public.admin_update_order_status(_order_id uuid, _status order_status, _payment_status payment_status, _note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE prev_status order_status;
BEGIN
  SELECT status INTO prev_status FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF prev_status IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  UPDATE public.orders SET status = _status, payment_status = _payment_status WHERE id = _order_id;
  INSERT INTO public.order_status_history (order_id, status, note, created_by)
  VALUES (_order_id, _status, _note, NULL);
  IF _status = 'cancelled' AND prev_status <> 'cancelled' THEN
    PERFORM public.refund_order_stock(_order_id);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_adjust_stock(_product_id uuid, _delta integer, _reason text, _note text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_stock INT;
BEGIN
  IF _delta = 0 THEN RAISE EXCEPTION 'Delta must be non-zero'; END IF;
  UPDATE public.products SET stock = GREATEST(0, stock + _delta) WHERE id = _product_id RETURNING stock INTO new_stock;
  IF new_stock IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
  INSERT INTO public.stock_movements(product_id, delta, reason, note, created_by)
  VALUES (_product_id, _delta, _reason, _note, NULL);
  RETURN new_stock;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE result JSONB;
BEGIN
  WITH
    paid AS (SELECT total, created_at FROM public.orders WHERE payment_status = 'paid'),
    rev AS (
      SELECT
        COALESCE(SUM(total), 0) AS total_revenue,
        COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('day', now())), 0) AS today_revenue,
        COALESCE(SUM(total) FILTER (WHERE created_at >= now() - interval '7 days'), 0) AS week_revenue,
        COALESCE(SUM(total) FILTER (WHERE created_at >= now() - interval '30 days'), 0) AS month_revenue,
        COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('year', now())), 0) AS year_revenue
      FROM paid
    ),
    orders_by_status AS (SELECT status::text AS status, COUNT(*)::int AS count FROM public.orders GROUP BY status),
    daily_rev AS (
      SELECT to_char(d::date, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(p.total), 0) AS revenue,
        COUNT(p.total) AS orders
      FROM generate_series(now()::date - interval '29 days', now()::date, interval '1 day') d
      LEFT JOIN paid p ON p.created_at::date = d::date
      GROUP BY d ORDER BY d
    ),
    top_products AS (
      SELECT oi.product_id, oi.name_snapshot AS name,
        SUM(oi.quantity)::int AS units, SUM(oi.subtotal)::numeric AS revenue
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE o.payment_status = 'paid'
      GROUP BY oi.product_id, oi.name_snapshot
      ORDER BY units DESC LIMIT 10
    ),
    rev_by_category AS (
      SELECT COALESCE(c.name, 'Uncategorized') AS name, SUM(oi.subtotal)::numeric AS revenue
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id AND o.payment_status = 'paid'
      LEFT JOIN public.products p ON p.id = oi.product_id
      LEFT JOIN public.categories c ON c.id = p.category_id
      GROUP BY c.name ORDER BY revenue DESC LIMIT 10
    ),
    rev_by_brand AS (
      SELECT COALESCE(b.name, 'No brand') AS name, SUM(oi.subtotal)::numeric AS revenue
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id AND o.payment_status = 'paid'
      LEFT JOIN public.products p ON p.id = oi.product_id
      LEFT JOIN public.brands b ON b.id = p.brand_id
      GROUP BY b.name ORDER BY revenue DESC LIMIT 10
    ),
    customers AS (
      SELECT
        (SELECT COUNT(*) FROM public.profiles) AS total_customers,
        (SELECT COUNT(*) FROM public.profiles WHERE created_at >= now() - interval '30 days') AS new_customers,
        (SELECT COUNT(*) FROM (SELECT user_id FROM public.orders WHERE user_id IS NOT NULL GROUP BY user_id HAVING COUNT(*) > 1) t) AS returning_customers
    ),
    inventory AS (
      SELECT
        COALESCE(SUM(price * stock), 0) AS inventory_value,
        COUNT(*) FILTER (WHERE stock > 0 AND stock < 10) AS low_stock,
        COUNT(*) FILTER (WHERE stock <= 0) AS out_of_stock,
        COUNT(*) AS total_products
      FROM public.products WHERE status = 'active'
    ),
    counts AS (
      SELECT
        (SELECT COUNT(*) FROM public.products) AS products_total,
        (SELECT COUNT(*) FROM public.categories) AS categories_total,
        (SELECT COUNT(*) FROM public.brands) AS brands_total,
        (SELECT COUNT(*) FROM public.tags) AS tags_total,
        (SELECT COUNT(*) FROM public.orders) AS orders_total
    ),
    recent_orders AS (
      SELECT id, order_number, status::text, payment_status::text, total, email, created_at
      FROM public.orders ORDER BY created_at DESC LIMIT 10
    ),
    recent_customers AS (
      SELECT id, full_name, created_at FROM public.profiles ORDER BY created_at DESC LIMIT 10
    )
  SELECT jsonb_build_object(
    'revenue', (SELECT to_jsonb(rev) FROM rev),
    'counts', (SELECT to_jsonb(counts) FROM counts),
    'customers', (SELECT to_jsonb(customers) FROM customers),
    'inventory', (SELECT to_jsonb(inventory) FROM inventory),
    'orders_by_status', COALESCE((SELECT jsonb_agg(to_jsonb(orders_by_status)) FROM orders_by_status), '[]'::jsonb),
    'daily_revenue', COALESCE((SELECT jsonb_agg(to_jsonb(daily_rev)) FROM daily_rev), '[]'::jsonb),
    'top_products', COALESCE((SELECT jsonb_agg(to_jsonb(top_products)) FROM top_products), '[]'::jsonb),
    'revenue_by_category', COALESCE((SELECT jsonb_agg(to_jsonb(rev_by_category)) FROM rev_by_category), '[]'::jsonb),
    'revenue_by_brand', COALESCE((SELECT jsonb_agg(to_jsonb(rev_by_brand)) FROM rev_by_brand), '[]'::jsonb),
    'recent_orders', COALESCE((SELECT jsonb_agg(to_jsonb(recent_orders)) FROM recent_orders), '[]'::jsonb),
    'recent_customers', COALESCE((SELECT jsonb_agg(to_jsonb(recent_customers)) FROM recent_customers), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_customers(_search text DEFAULT ''::text, _limit integer DEFAULT 100, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, email text, full_name text, phone text, avatar_url text, created_at timestamp with time zone, role app_role, order_count integer, total_spent numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.id, u.email::text AS email, p.full_name, p.phone, p.avatar_url, p.created_at,
    (SELECT r.role FROM public.user_roles r WHERE r.user_id = p.id ORDER BY (r.role = 'super_admin') DESC, (r.role = 'admin') DESC LIMIT 1) AS role,
    (SELECT COUNT(*)::int FROM public.orders o WHERE o.user_id = p.id) AS order_count,
    (SELECT COALESCE(SUM(o.total), 0) FROM public.orders o WHERE o.user_id = p.id AND o.payment_status = 'paid') AS total_spent
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE (_search = '' OR p.full_name ILIKE '%' || _search || '%' OR u.email ILIKE '%' || _search || '%')
  ORDER BY p.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_analytics_extras(_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE result JSONB;
BEGIN
  WITH
    most_viewed AS (
      SELECT p.id, p.name, p.slug, COUNT(v.id)::int AS views
      FROM public.product_views v
      JOIN public.products p ON p.id = v.product_id
      WHERE v.created_at >= now() - (_days || ' days')::interval
      GROUP BY p.id, p.name, p.slug
      ORDER BY views DESC LIMIT 10
    ),
    coupon_stats AS (
      SELECT c.code, c.used_count, COALESCE(SUM(r.amount),0)::numeric AS total_discount
      FROM public.coupons c
      LEFT JOIN public.coupon_redemptions r ON r.coupon_id = c.id
      GROUP BY c.id, c.code, c.used_count
      ORDER BY c.used_count DESC LIMIT 10
    ),
    blog_stats AS (
      SELECT
        (SELECT COUNT(*) FROM public.blog_posts) AS total,
        (SELECT COUNT(*) FROM public.blog_posts WHERE status='published') AS published,
        (SELECT COALESCE(SUM(view_count),0) FROM public.blog_posts) AS views
    )
  SELECT jsonb_build_object(
    'most_viewed', COALESCE((SELECT jsonb_agg(to_jsonb(most_viewed)) FROM most_viewed), '[]'::jsonb),
    'coupons', COALESCE((SELECT jsonb_agg(to_jsonb(coupon_stats)) FROM coupon_stats), '[]'::jsonb),
    'blog', (SELECT to_jsonb(blog_stats) FROM blog_stats)
  ) INTO result;
  RETURN result;
END;
$function$;

-- 6. Revoke EXECUTE on privileged SECURITY DEFINER functions from PUBLIC/anon/authenticated.
--    Server code calls them via the service_role client only.
REVOKE EXECUTE ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_list_customers(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_stock(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_order_status(uuid, order_status, payment_status, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_analytics_extras(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.track_order_public(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_order_stock(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_customers(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_adjust_stock(uuid, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, order_status, payment_status, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_analytics_extras(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.track_order_public(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_order_stock(uuid) TO service_role;
