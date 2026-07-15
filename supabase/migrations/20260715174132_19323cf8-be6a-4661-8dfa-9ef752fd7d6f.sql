
-- =========================================================
-- Phase 5: Admin foundation
-- =========================================================

-- ----- Extend categories -----
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT;

-- ----- Extend brands -----
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT;

-- Add missing admin write policies for categories/brands (were public read only)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categories' AND policyname='categories_admin_write') THEN
    CREATE POLICY categories_admin_write ON public.categories
      FOR ALL TO authenticated
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='brands' AND policyname='brands_admin_write') THEN
    CREATE POLICY brands_admin_write ON public.brands
      FOR ALL TO authenticated
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='products' AND policyname='products_admin_write') THEN
    CREATE POLICY products_admin_write ON public.products
      FOR ALL TO authenticated
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_images' AND policyname='product_images_admin_write') THEN
    CREATE POLICY product_images_admin_write ON public.product_images
      FOR ALL TO authenticated
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_specifications' AND policyname='product_specifications_admin_write') THEN
    CREATE POLICY product_specifications_admin_write ON public.product_specifications
      FOR ALL TO authenticated
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- ----- tags -----
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tags TO anon, authenticated;
GRANT ALL ON public.tags TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.tags TO authenticated;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tags_public_read ON public.tags;
CREATE POLICY tags_public_read ON public.tags FOR SELECT USING (true);
DROP POLICY IF EXISTS tags_admin_write ON public.tags;
CREATE POLICY tags_admin_write ON public.tags FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.product_tags (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);
GRANT SELECT ON public.product_tags TO anon, authenticated;
GRANT ALL ON public.product_tags TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.product_tags TO authenticated;
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_tags_public_read ON public.product_tags;
CREATE POLICY product_tags_public_read ON public.product_tags FOR SELECT USING (true);
DROP POLICY IF EXISTS product_tags_admin_write ON public.product_tags;
CREATE POLICY product_tags_admin_write ON public.product_tags FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ----- stock_movements -----
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stock_movements_admin_all ON public.stock_movements;
CREATE POLICY stock_movements_admin_all ON public.stock_movements FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON public.stock_movements(product_id, created_at DESC);

-- ----- customer_notes -----
CREATE TABLE IF NOT EXISTS public.customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.customer_notes TO authenticated;
GRANT ALL ON public.customer_notes TO service_role;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_notes_admin_all ON public.customer_notes;
CREATE POLICY customer_notes_admin_all ON public.customer_notes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ----- site_content -----
CREATE TABLE IF NOT EXISTS public.site_content (
  section_key TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT ALL ON public.site_content TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS site_content_public_read ON public.site_content;
CREATE POLICY site_content_public_read ON public.site_content FOR SELECT USING (true);
DROP POLICY IF EXISTS site_content_admin_write ON public.site_content;
CREATE POLICY site_content_admin_write ON public.site_content FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS site_content_set_updated_at ON public.site_content;
CREATE TRIGGER site_content_set_updated_at BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----- site_settings (singleton) -----
CREATE TABLE IF NOT EXISTS public.site_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;
CREATE POLICY site_settings_public_read ON public.site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS site_settings_admin_write ON public.site_settings;
CREATE POLICY site_settings_admin_write ON public.site_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.site_settings (id, data) VALUES (TRUE, '{}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS site_settings_set_updated_at ON public.site_settings;
CREATE TRIGGER site_settings_set_updated_at BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----- Dashboard stats RPC -----
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

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
    orders_by_status AS (
      SELECT status::text AS status, COUNT(*)::int AS count FROM public.orders GROUP BY status
    ),
    daily_rev AS (
      SELECT to_char(d::date, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(p.total), 0) AS revenue,
        COUNT(p.total) AS orders
      FROM generate_series(now()::date - interval '29 days', now()::date, interval '1 day') d
      LEFT JOIN paid p ON p.created_at::date = d::date
      GROUP BY d
      ORDER BY d
    ),
    top_products AS (
      SELECT oi.product_id,
        oi.name_snapshot AS name,
        SUM(oi.quantity)::int AS units,
        SUM(oi.subtotal)::numeric AS revenue
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE o.payment_status = 'paid'
      GROUP BY oi.product_id, oi.name_snapshot
      ORDER BY units DESC
      LIMIT 10
    ),
    rev_by_category AS (
      SELECT COALESCE(c.name, 'Uncategorized') AS name,
        SUM(oi.subtotal)::numeric AS revenue
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id AND o.payment_status = 'paid'
      LEFT JOIN public.products p ON p.id = oi.product_id
      LEFT JOIN public.categories c ON c.id = p.category_id
      GROUP BY c.name
      ORDER BY revenue DESC
      LIMIT 10
    ),
    rev_by_brand AS (
      SELECT COALESCE(b.name, 'No brand') AS name,
        SUM(oi.subtotal)::numeric AS revenue
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id AND o.payment_status = 'paid'
      LEFT JOIN public.products p ON p.id = oi.product_id
      LEFT JOIN public.brands b ON b.id = p.brand_id
      GROUP BY b.name
      ORDER BY revenue DESC
      LIMIT 10
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
      SELECT id, full_name, created_at
      FROM public.profiles ORDER BY created_at DESC LIMIT 10
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
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

-- ----- Admin list customers (joins auth.users email) -----
CREATE OR REPLACE FUNCTION public.admin_list_customers(_search TEXT DEFAULT '', _limit INT DEFAULT 100, _offset INT DEFAULT 0)
RETURNS TABLE(
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  role app_role,
  order_count INT,
  total_spent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    u.email::text AS email,
    p.full_name,
    p.phone,
    p.avatar_url,
    p.created_at,
    (SELECT r.role FROM public.user_roles r WHERE r.user_id = p.id ORDER BY (r.role = 'super_admin') DESC, (r.role = 'admin') DESC LIMIT 1) AS role,
    (SELECT COUNT(*)::int FROM public.orders o WHERE o.user_id = p.id) AS order_count,
    (SELECT COALESCE(SUM(o.total), 0) FROM public.orders o WHERE o.user_id = p.id AND o.payment_status = 'paid') AS total_spent
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE (_search = '' OR p.full_name ILIKE '%' || _search || '%' OR u.email ILIKE '%' || _search || '%')
  ORDER BY p.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_customers(TEXT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_customers(TEXT, INT, INT) TO authenticated;

-- ----- Admin adjust stock -----
CREATE OR REPLACE FUNCTION public.admin_adjust_stock(_product_id UUID, _delta INT, _reason TEXT, _note TEXT DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_stock INT;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _delta = 0 THEN RAISE EXCEPTION 'Delta must be non-zero'; END IF;

  UPDATE public.products
  SET stock = GREATEST(0, stock + _delta)
  WHERE id = _product_id
  RETURNING stock INTO new_stock;

  IF new_stock IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  INSERT INTO public.stock_movements(product_id, delta, reason, note, created_by)
  VALUES (_product_id, _delta, _reason, _note, auth.uid());

  RETURN new_stock;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_stock(UUID, INT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_stock(UUID, INT, TEXT, TEXT) TO authenticated;

-- ----- Storage bucket policies (buckets created via storage tool) -----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='media_public_read') THEN
    CREATE POLICY media_public_read ON storage.objects FOR SELECT
      USING (bucket_id IN ('media','product-images'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='media_admin_insert') THEN
    CREATE POLICY media_admin_insert ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id IN ('media','product-images') AND public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='media_admin_update') THEN
    CREATE POLICY media_admin_update ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id IN ('media','product-images') AND public.is_admin(auth.uid()))
      WITH CHECK (bucket_id IN ('media','product-images') AND public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='media_admin_delete') THEN
    CREATE POLICY media_admin_delete ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id IN ('media','product-images') AND public.is_admin(auth.uid()));
  END IF;
END $$;
