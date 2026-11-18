-- ============================================================================
-- Migration: 20261118_wenzy_rack.sql
-- Description: Add WENZY RACK fields to products and view_type to product_images
-- Safety: Additive only. No existing data is deleted, truncated, or modified.
-- ============================================================================

-- 1. Add view_type column to product_images table to classify rack images:
--    - 'standard': normal product catalog/model gallery images
--    - 'side': mandatory resting image on the clothing rail
--    - 'front': mandatory front cutout in the focused 3D view
--    - 'back': mandatory back cutout in the focused 3D view
--    - 'detail': optional close-up texture/embroidery cutout
ALTER TABLE public.product_images
ADD COLUMN IF NOT EXISTS view_type TEXT DEFAULT 'standard';

-- Backfill any existing NULL view_type values to 'standard'
UPDATE public.product_images
SET view_type = 'standard'
WHERE view_type IS NULL;

-- Enforce valid view_type classifications via check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_product_images_view_type'
  ) THEN
    ALTER TABLE public.product_images
    ADD CONSTRAINT chk_product_images_view_type 
    CHECK (view_type IN ('standard', 'side', 'front', 'back', 'detail'));
  END IF;
END $$;

-- 2. Add clothing rail visibility and ordering to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS in_clothing_rail BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rail_display_order INTEGER DEFAULT 0;

-- Backfill any existing NULL rail flags to safe defaults
UPDATE public.products
SET in_clothing_rail = FALSE
WHERE in_clothing_rail IS NULL;

UPDATE public.products
SET rail_display_order = 0
WHERE rail_display_order IS NULL;

-- 3. Add performance indexes for high-speed rail querying
CREATE INDEX IF NOT EXISTS idx_products_clothing_rail 
ON public.products (rail_display_order, created_at DESC) 
WHERE is_active = TRUE AND in_clothing_rail = TRUE;

CREATE INDEX IF NOT EXISTS idx_product_images_view_type 
ON public.product_images (product_id, view_type);
