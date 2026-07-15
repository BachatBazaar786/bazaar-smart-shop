
-- ============ BLOG ============
CREATE TYPE public.post_status AS ENUM ('draft','published','archived');

CREATE TABLE public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_categories TO anon, authenticated;
GRANT ALL ON public.blog_categories TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.blog_categories TO authenticated;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_categories public read" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "blog_categories admin write" ON public.blog_categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER blog_categories_touch BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  body TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.post_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  seo_title TEXT,
  seo_description TEXT,
  reading_minutes INT,
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_posts public read published" ON public.blog_posts FOR SELECT
  USING (status = 'published' OR public.is_admin(auth.uid()));
CREATE POLICY "blog_posts admin write" ON public.blog_posts FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER blog_posts_touch BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX blog_posts_status_pub_idx ON public.blog_posts (status, published_at DESC);

CREATE TABLE public.blog_post_categories (
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);
GRANT SELECT ON public.blog_post_categories TO anon, authenticated;
GRANT INSERT, DELETE ON public.blog_post_categories TO authenticated;
GRANT ALL ON public.blog_post_categories TO service_role;
ALTER TABLE public.blog_post_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bpc public read" ON public.blog_post_categories FOR SELECT USING (true);
CREATE POLICY "bpc admin write" ON public.blog_post_categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ COUPONS ============
CREATE TYPE public.discount_type AS ENUM ('percent','fixed');

CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type public.discount_type NOT NULL,
  discount_value NUMERIC(12,2) NOT NULL CHECK (discount_value > 0),
  min_order NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_discount NUMERIC(12,2),
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  usage_limit INT,
  per_user_limit INT,
  used_count INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons admin all" ON public.coupons FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER coupons_touch BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "redemptions admin read" ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "redemptions self insert" ON public.coupon_redemptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_total NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Validate coupon (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.validate_coupon(_code TEXT, _subtotal NUMERIC)
RETURNS TABLE(valid BOOLEAN, message TEXT, discount NUMERIC, coupon_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE c public.coupons%ROWTYPE;
        d NUMERIC := 0;
        user_uses INT := 0;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE lower(code) = lower(_code) LIMIT 1;
  IF NOT FOUND THEN RETURN QUERY SELECT false, 'Invalid code', 0::numeric, NULL::uuid; RETURN; END IF;
  IF NOT c.active THEN RETURN QUERY SELECT false, 'Coupon inactive', 0::numeric, c.id; RETURN; END IF;
  IF c.starts_at IS NOT NULL AND c.starts_at > now() THEN RETURN QUERY SELECT false, 'Not yet active', 0::numeric, c.id; RETURN; END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RETURN QUERY SELECT false, 'Expired', 0::numeric, c.id; RETURN; END IF;
  IF _subtotal < c.min_order THEN RETURN QUERY SELECT false, 'Minimum order not met', 0::numeric, c.id; RETURN; END IF;
  IF c.usage_limit IS NOT NULL AND c.used_count >= c.usage_limit THEN RETURN QUERY SELECT false, 'Usage limit reached', 0::numeric, c.id; RETURN; END IF;
  IF c.per_user_limit IS NOT NULL AND auth.uid() IS NOT NULL THEN
    SELECT COUNT(*) INTO user_uses FROM public.coupon_redemptions WHERE coupon_id = c.id AND user_id = auth.uid();
    IF user_uses >= c.per_user_limit THEN RETURN QUERY SELECT false, 'Per-user limit reached', 0::numeric, c.id; RETURN; END IF;
  END IF;
  IF c.discount_type = 'percent' THEN
    d := round(_subtotal * c.discount_value / 100.0, 2);
  ELSE
    d := c.discount_value;
  END IF;
  IF c.max_discount IS NOT NULL AND d > c.max_discount THEN d := c.max_discount; END IF;
  IF d > _subtotal THEN d := _subtotal; END IF;
  RETURN QUERY SELECT true, 'ok'::text, d, c.id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT, NUMERIC) TO authenticated;

-- ============ PRODUCT VARIANTS ============
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price NUMERIC(12,2) NOT NULL,
  sale_price NUMERIC(12,2),
  stock INT NOT NULL DEFAULT 0,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variants public read" ON public.product_variants FOR SELECT USING (active OR public.is_admin(auth.uid()));
CREATE POLICY "variants admin write" ON public.product_variants FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE INDEX product_variants_product_idx ON public.product_variants(product_id);
CREATE TRIGGER product_variants_touch BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_name TEXT;

-- ============ VIEW ANALYTICS ============
CREATE TABLE public.product_views (
  id BIGSERIAL PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.product_views TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.product_views_id_seq TO anon, authenticated;
GRANT SELECT ON public.product_views TO authenticated;
GRANT ALL ON public.product_views TO service_role;
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "views insert anyone" ON public.product_views FOR INSERT WITH CHECK (true);
CREATE POLICY "views admin read" ON public.product_views FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX product_views_product_time_idx ON public.product_views(product_id, created_at DESC);

-- ============ PAGE BUILDER ============
CREATE TABLE public.page_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT NOT NULL,
  block_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.page_blocks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.page_blocks TO authenticated;
GRANT ALL ON public.page_blocks TO service_role;
ALTER TABLE public.page_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "page_blocks public read" ON public.page_blocks FOR SELECT USING (active OR public.is_admin(auth.uid()));
CREATE POLICY "page_blocks admin write" ON public.page_blocks FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE INDEX page_blocks_page_sort_idx ON public.page_blocks(page_key, sort_order);
CREATE TRIGGER page_blocks_touch BEFORE UPDATE ON public.page_blocks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ANALYTICS RPC ============
CREATE OR REPLACE FUNCTION public.admin_analytics_extras(_days INT DEFAULT 30)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
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
$$;
REVOKE EXECUTE ON FUNCTION public.admin_analytics_extras(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_analytics_extras(INT) TO authenticated;
