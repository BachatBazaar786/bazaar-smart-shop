
-- Fix column name mismatch: history uses `created_by`, not `changed_by`
CREATE OR REPLACE FUNCTION public.admin_update_order_status(_order_id uuid, _status order_status, _payment_status payment_status, _note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  prev_status order_status;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT status INTO prev_status FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF prev_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  UPDATE public.orders
  SET status = _status,
      payment_status = _payment_status
  WHERE id = _order_id;

  INSERT INTO public.order_status_history (order_id, status, note, created_by)
  VALUES (_order_id, _status, _note, auth.uid());

  IF _status = 'cancelled' AND prev_status <> 'cancelled' THEN
    PERFORM public.refund_order_stock(_order_id);
  END IF;
END;
$function$;

-- Public order tracking via security definer (bypasses RLS for exact order_number+email match only)
CREATE OR REPLACE FUNCTION public.track_order_public(_order_number text, _email text)
RETURNS TABLE (
  order_number text,
  status order_status,
  payment_status payment_status,
  created_at timestamptz,
  total numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT o.order_number, o.status, o.payment_status, o.created_at, o.total
  FROM public.orders o
  WHERE o.order_number = _order_number
    AND lower(o.email) = lower(_email);
$$;

GRANT EXECUTE ON FUNCTION public.track_order_public(text, text) TO anon, authenticated;
