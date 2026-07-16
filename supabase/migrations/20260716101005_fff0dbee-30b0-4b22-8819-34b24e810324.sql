
CREATE TABLE public.page_layouts (
  page_key TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{"content":[],"root":{}}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

GRANT SELECT ON public.page_layouts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_layouts TO authenticated;
GRANT ALL ON public.page_layouts TO service_role;

ALTER TABLE public.page_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read page layouts"
  ON public.page_layouts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "admins can insert page layouts"
  ON public.page_layouts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admins can update page layouts"
  ON public.page_layouts FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admins can delete page layouts"
  ON public.page_layouts FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_page_layouts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.touch_page_layouts_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_page_layouts_touch
  BEFORE UPDATE ON public.page_layouts
  FOR EACH ROW EXECUTE FUNCTION public.touch_page_layouts_updated_at();
