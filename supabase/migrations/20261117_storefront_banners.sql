-- Migration: storefront_banners
-- Creates the storefront_banners table with RLS policies
-- and a reorder_banners RPC for drag-and-drop reordering.

-- ============================================================
-- TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.storefront_banners (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title                   TEXT        NOT NULL,
  media_type              TEXT        NOT NULL CHECK (media_type IN ('image', 'video')),
  media_path              TEXT        NOT NULL,
  mobile_media_path       TEXT,
  destination_type        TEXT        NOT NULL DEFAULT 'none'
                          CHECK (destination_type IN ('product', 'category', 'custom_url', 'none')),
  destination_product_id  UUID        REFERENCES public.products(id) ON DELETE SET NULL,
  destination_category_id UUID        REFERENCES public.categories(id) ON DELETE SET NULL,
  destination_url         TEXT,
  heading                 TEXT,
  description             TEXT,
  button_text             TEXT,
  display_order           INTEGER     NOT NULL DEFAULT 0,
  duration_ms             INTEGER     NOT NULL DEFAULT 5000,
  video_advance_mode      TEXT        NOT NULL DEFAULT 'duration'
                          CHECK (video_advance_mode IN ('duration', 'on_end')),
  overlay_opacity         NUMERIC     NOT NULL DEFAULT 0.4
                          CHECK (overlay_opacity >= 0 AND overlay_opacity <= 1),
  text_alignment          TEXT        NOT NULL DEFAULT 'left'
                          CHECK (text_alignment IN ('left', 'center', 'right')),
  text_color              TEXT        NOT NULL DEFAULT '#FFFFFF',
  is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_storefront_banners_active_order
  ON public.storefront_banners(is_active, display_order);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_storefront_banners_updated_at ON public.storefront_banners;
CREATE TRIGGER set_storefront_banners_updated_at
  BEFORE UPDATE ON public.storefront_banners
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.storefront_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active banners" ON public.storefront_banners;
CREATE POLICY "Public can view active banners" ON public.storefront_banners
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert banners" ON public.storefront_banners;
CREATE POLICY "Admins can insert banners" ON public.storefront_banners
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update banners" ON public.storefront_banners;
CREATE POLICY "Admins can update banners" ON public.storefront_banners
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete banners" ON public.storefront_banners;
CREATE POLICY "Admins can delete banners" ON public.storefront_banners
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================
-- GRANT TABLE ACCESS
-- ============================================================
GRANT SELECT ON public.storefront_banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.storefront_banners TO authenticated;

-- ============================================================
-- REORDER BANNERS RPC (SECURITY DEFINER — only admins allowed)
-- ============================================================
CREATE OR REPLACE FUNCTION public.reorder_banners(p_ordered_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  FOR i IN 1..array_length(p_ordered_ids, 1) LOOP
    UPDATE public.storefront_banners
    SET display_order = i
    WHERE id = p_ordered_ids[i];
  END LOOP;
END;
$$;

-- Allow authenticated users to call it (internal auth check prevents abuse)
REVOKE EXECUTE ON FUNCTION public.reorder_banners(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_banners(UUID[]) TO authenticated;
