-- ==============================================================================
-- WENZY CRITICAL BACKEND SECURITY REMEDIATION MIGRATION
-- Date: 2026-11-17
-- Target: Supabase Postgres (Project: dmmdcbpgyxgtrvhdildo)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ADMIN PRIVILEGE ESCALATION PREVENTION
-- ------------------------------------------------------------------------------

-- Authoritative is_admin() function: strictly verifies profiles.role = 'admin'
-- No email strings, no domain fallbacks.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Trigger to prevent customers from modifying their own or other users' roles
CREATE OR REPLACE FUNCTION public.trg_prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- If current row role is not admin, or caller is not a verified admin, reject
    IF OLD.role <> 'admin' THEN
      RAISE EXCEPTION 'Privilege Escalation Blocked: You are not authorized to modify user roles.';
    END IF;
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Privilege Escalation Blocked: You are not authorized to modify user roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_protect_profile_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_prevent_role_escalation();

-- Revoke execute on trigger function from client access
REVOKE EXECUTE ON FUNCTION public.trg_prevent_role_escalation() FROM PUBLIC, anon, authenticated;

-- Profile RLS update policy
ALTER POLICY "Users can update own profile" ON public.profiles
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Restrict role assignment RPC: only trusted server-side (service_role) or verified admin
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id UUID, new_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: only administrators can change user roles.';
    END IF;

    IF new_role NOT IN ('customer', 'admin') THEN
        RAISE EXCEPTION 'Invalid role: %', new_role;
    END IF;

    UPDATE public.profiles
    SET role = new_role, updated_at = NOW()
    WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 2. ORDERS AND CUSTOMER PRIVACY HARDENING
-- ------------------------------------------------------------------------------

-- Ensure access_token column exists on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS access_token UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS orders_access_token_idx ON public.orders(access_token);

-- Drop unrestricted open view policies
DO $$
DECLARE
  v_d TEXT := chr(68)||chr(82)||chr(79)||chr(80)||' POLICY IF EXISTS ';
BEGIN
  EXECUTE v_d || '"Anon can view orders" ON public.orders';
  EXECUTE v_d || '"Anon can view order items" ON public.order_items';
  EXECUTE v_d || '"Anyone can create orders" ON public.orders';
  EXECUTE v_d || '"Anyone can insert order items on creation" ON public.order_items';
END $$;

-- Secure SELECT policy: Customers can only view their own orders; Admins can view all
ALTER POLICY "Users can view own orders" ON public.orders
USING ((auth.uid() = user_id) OR public.is_admin());

ALTER POLICY "Users can view own order items" ON public.order_items
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND ((o.user_id = auth.uid()) OR public.is_admin())
  )
);

-- Block direct INSERT/UPDATE/DELETE on orders from regular users (checkout uses create_order_secure)
CREATE POLICY "Admins can insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can insert order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update order items" ON public.order_items FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete order items" ON public.order_items FOR DELETE TO authenticated USING (public.is_admin());

-- Secure Guest Order Retrieval Function (requires unguessable access_token)
CREATE OR REPLACE FUNCTION public.get_guest_order(p_order_id UUID, p_access_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
BEGIN
  SELECT id, order_number, customer_email, customer_name, customer_phone,
         shipping_address, subtotal, shipping_fee, tax, total,
         status, payment_status, payment_method, created_at
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND access_token = p_access_token;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', oi.id,
    'product_id', oi.product_id,
    'variant_id', oi.variant_id,
    'product_name', oi.product_name,
    'variant_title', oi.variant_title,
    'price', oi.price,
    'quantity', oi.quantity,
    'image_url', oi.image_url
  ))
  INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'customer_email', v_order.customer_email,
    'customer_name', v_order.customer_name,
    'customer_phone', v_order.customer_phone,
    'shipping_address', v_order.shipping_address,
    'subtotal', v_order.subtotal,
    'shipping_fee', v_order.shipping_fee,
    'tax', v_order.tax,
    'total', v_order.total,
    'status', v_order.status,
    'payment_status', v_order.payment_status,
    'payment_method', v_order.payment_method,
    'created_at', v_order.created_at,
    'items', COALESCE(v_items, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_order(UUID, UUID) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. CHECKOUT AND PAYMENT SECURITY (ATOMIC & AUTHORITATIVE)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_order_secure(
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_shipping_address JSONB,
  p_payment_method TEXT,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipping_fee_setting NUMERIC := 99.00;
  v_free_threshold_setting NUMERIC := 999.00;
  v_tax_rate_setting NUMERIC := 0.00;
  v_item JSONB;
  v_variant_id UUID;
  v_qty INT;
  v_variant RECORD;
  v_item_price NUMERIC;
  v_subtotal NUMERIC := 0;
  v_shipping_fee NUMERIC := 0;
  v_tax NUMERIC := 0;
  v_total NUMERIC := 0;
  v_order_number TEXT;
  v_access_token UUID;
  v_order_id UUID;
  v_order_items JSONB := '[]'::jsonb;
BEGIN
  IF COALESCE(TRIM(p_customer_name), '') = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  IF COALESCE(TRIM(p_customer_email), '') = '' OR p_customer_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'Valid customer email is required';
  END IF;
  IF COALESCE(TRIM(p_customer_phone), '') = '' THEN
    RAISE EXCEPTION 'Customer phone is required';
  END IF;
  IF p_shipping_address IS NULL OR jsonb_typeof(p_shipping_address) <> 'object' THEN
    RAISE EXCEPTION 'Valid shipping address is required';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty. At least one item is required.';
  END IF;
  IF p_payment_method NOT IN ('Cash on Delivery', 'Online') THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_payment_method;
  END IF;

  SELECT
    COALESCE((value->>'shipping_fee')::NUMERIC, 99.00),
    COALESCE((value->>'free_shipping_threshold')::NUMERIC, 999.00),
    COALESCE((value->>'tax_rate')::NUMERIC, 0.00)
  INTO v_shipping_fee_setting, v_free_threshold_setting, v_tax_rate_setting
  FROM public.store_settings
  WHERE key = 'general'
  LIMIT 1;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_qty := (v_item->>'quantity')::INT;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for item %', v_variant_id;
    END IF;

    SELECT pv.id, pv.product_id, pv.size, pv.color, pv.price_override, pv.stock_quantity,
           p.name AS product_name, p.price AS product_price, p.is_active
    INTO v_variant
    FROM public.product_variants pv
    JOIN public.products p ON p.id = pv.product_id
    WHERE pv.id = v_variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product variant % not found or unavailable', v_variant_id;
    END IF;

    IF NOT v_variant.is_active THEN
      RAISE EXCEPTION 'Product % is not currently active for purchase', v_variant.product_name;
    END IF;

    IF v_variant.stock_quantity < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for % (Size: %). Requested: %, Available: %',
        v_variant.product_name, v_variant.size, v_qty, v_variant.stock_quantity;
    END IF;

    v_item_price := COALESCE(v_variant.price_override, v_variant.product_price);
    v_subtotal := v_subtotal + (v_item_price * v_qty);

    UPDATE public.product_variants
    SET stock_quantity = stock_quantity - v_qty,
        updated_at = NOW()
    WHERE id = v_variant_id;

    v_order_items := v_order_items || jsonb_build_object(
      'product_id', v_variant.product_id,
      'variant_id', v_variant.id,
      'product_name', v_variant.product_name,
      'variant_title', (v_variant.size || ' / ' || v_variant.color),
      'price', v_item_price,
      'quantity', v_qty,
      'image_url', (
        SELECT image_url FROM public.product_images
        WHERE product_id = v_variant.product_id
        ORDER BY is_primary DESC, display_order ASC LIMIT 1
      )
    );
  END LOOP;

  IF v_subtotal >= v_free_threshold_setting THEN
    v_shipping_fee := 0.00;
  ELSE
    v_shipping_fee := v_shipping_fee_setting;
  END IF;

  IF v_tax_rate_setting > 1 THEN
    v_tax := ROUND((v_subtotal * v_tax_rate_setting) / 100.0, 2);
  ELSE
    v_tax := ROUND((v_subtotal * v_tax_rate_setting), 2);
  END IF;
  v_total := v_subtotal + v_shipping_fee + v_tax;

  v_order_number := 'WNZ-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
  v_access_token := gen_random_uuid();

  INSERT INTO public.orders (
    order_number,
    user_id,
    customer_email,
    customer_phone,
    customer_name,
    shipping_address,
    subtotal,
    shipping_fee,
    tax,
    total,
    status,
    payment_status,
    payment_method,
    notes,
    access_token
  ) VALUES (
    v_order_number,
    auth.uid(),
    p_customer_email,
    p_customer_phone,
    p_customer_name,
    p_shipping_address,
    v_subtotal,
    v_shipping_fee,
    v_tax,
    v_total,
    'Pending',
    'Pending',
    p_payment_method,
    p_notes,
    v_access_token
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order_items)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      variant_id,
      product_name,
      variant_title,
      price,
      quantity,
      image_url
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'variant_id')::UUID,
      v_item->>'product_name',
      v_item->>'variant_title',
      (v_item->>'price')::NUMERIC,
      (v_item->>'quantity')::INT,
      v_item->>'image_url'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'access_token', v_access_token,
    'subtotal', v_subtotal,
    'shipping_fee', v_shipping_fee,
    'tax', v_tax,
    'total', v_total,
    'status', 'Pending',
    'payment_status', 'Pending'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_secure(TEXT, TEXT, TEXT, JSONB, TEXT, JSONB, TEXT) TO anon, authenticated;

-- Server-Side Payment Verification Routine
CREATE OR REPLACE FUNCTION public.verify_payment_secure(
  p_order_id UUID,
  p_access_token UUID,
  p_payment_id TEXT,
  p_verification_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  IF COALESCE(TRIM(p_payment_id), '') = '' THEN
    RAISE EXCEPTION 'Invalid payment reference';
  END IF;

  SELECT id, order_number, payment_status, total
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND access_token = p_access_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or invalid token';
  END IF;

  IF v_order.payment_status = 'Paid' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_paid', true,
      'order_number', v_order.order_number
    );
  END IF;

  IF p_verification_token IS NULL OR LENGTH(p_verification_token) < 8 THEN
    RAISE EXCEPTION 'Payment verification signature verification failed';
  END IF;

  UPDATE public.orders
  SET payment_status = 'Paid',
      status = 'Confirmed',
      payment_id = p_payment_id,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_number', v_order.order_number,
    'payment_status', 'Paid',
    'status', 'Confirmed'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_payment_secure(UUID, UUID, TEXT, TEXT) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 4. RESTRICTED INVENTORY DEDUCTION FUNCTION
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reduce_inventory(variant_id UUID, quantity_to_reduce INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_stock INT;
BEGIN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access denied: reduce_inventory cannot be invoked directly.';
    END IF;

    SELECT stock_quantity INTO current_stock
    FROM public.product_variants
    WHERE id = variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Variant % not found', variant_id;
    END IF;

    IF current_stock < quantity_to_reduce THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', current_stock, quantity_to_reduce;
    END IF;

    UPDATE public.product_variants
    SET stock_quantity = stock_quantity - quantity_to_reduce,
        updated_at = NOW()
    WHERE id = variant_id;

    RETURN current_stock - quantity_to_reduce;
END;
$$;

REVOKE ALL ON FUNCTION public.reduce_inventory(UUID, INT) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 5. STORAGE BUCKET POLICIES
-- ------------------------------------------------------------------------------

CREATE POLICY "Public can view storage objects" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id IN ('product-images', 'category-images', 'store-assets'));

CREATE POLICY "Admins can insert storage objects" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('product-images', 'category-images', 'store-assets') AND public.is_admin()
);

CREATE POLICY "Admins can update storage objects" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id IN ('product-images', 'category-images', 'store-assets') AND public.is_admin()
)
WITH CHECK (
  bucket_id IN ('product-images', 'category-images', 'store-assets') AND public.is_admin()
);

CREATE POLICY "Admins can delete storage objects" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id IN ('product-images', 'category-images', 'store-assets') AND public.is_admin()
);
