
-- 1) Set search_path on trigger functions to fix mutable search_path lint
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'BAB-' || nextval('public.order_number_seq')::text;
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Lock down SECURITY DEFINER function execute privileges.
-- Revoke default PUBLIC execute from all public functions, then grant back
-- only what the app / RLS / triggers actually require.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.refund_order_stock(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_order_status(uuid, order_status, payment_status, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.track_order_public(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_order_number() FROM PUBLIC, anon, authenticated;

-- Grants needed at runtime
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, order_status, payment_status, text) TO authenticated;
-- Public order tracking is meant to be callable without a session
GRANT EXECUTE ON FUNCTION public.track_order_public(text, text) TO anon, authenticated;

-- 3) Replace overly permissive WITH CHECK (true) INSERT policies with
-- basic validation constraints to reduce spam / enumeration abuse.
DROP POLICY IF EXISTS contact_public_insert ON public.contact_messages;
CREATE POLICY contact_public_insert ON public.contact_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(name) BETWEEN 1 AND 120
    AND char_length(email) BETWEEN 3 AND 255
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(coalesce(subject, '')) <= 200
    AND char_length(message) BETWEEN 1 AND 5000
  );

DROP POLICY IF EXISTS newsletter_public_insert ON public.newsletter_subscribers;
CREATE POLICY newsletter_public_insert ON public.newsletter_subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(email) BETWEEN 3 AND 255
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );
