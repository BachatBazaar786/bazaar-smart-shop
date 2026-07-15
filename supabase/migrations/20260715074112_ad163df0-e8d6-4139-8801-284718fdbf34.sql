
-- Atomic per-line stock decrement. Returns true if stock was sufficient and decremented, false otherwise.
CREATE OR REPLACE FUNCTION public.decrement_product_stock(_product_id uuid, _qty integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.products
  SET stock = stock - _qty
  WHERE id = _product_id
    AND status = 'active'
    AND stock >= _qty;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_product_stock(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) TO authenticated, service_role;

-- Refund stock back for a cancelled order
CREATE OR REPLACE FUNCTION public.refund_order_stock(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products p
  SET stock = p.stock + oi.quantity
  FROM public.order_items oi
  WHERE oi.order_id = _order_id
    AND oi.product_id = p.id;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_order_stock(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.refund_order_stock(uuid) TO service_role;

-- Admin-only order status update with history log
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  _order_id uuid,
  _status order_status,
  _payment_status payment_status,
  _note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.order_status_history (order_id, status, note, changed_by)
  VALUES (_order_id, _status, _note, auth.uid());

  -- Refund stock if newly cancelled
  IF _status = 'cancelled' AND prev_status <> 'cancelled' THEN
    PERFORM public.refund_order_stock(_order_id);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_order_status(uuid, order_status, payment_status, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, order_status, payment_status, text) TO authenticated;
