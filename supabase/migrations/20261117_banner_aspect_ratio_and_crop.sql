-- Migration: banner_aspect_ratio_and_crop
-- 1. Make title column optional (nullable)
-- 2. Add crop_settings JSONB column for desktop and mobile live interactive cropping
-- 3. Restrict and normalize aspect_ratio to '3:1' (default) and '16:9' (alternative)

ALTER TABLE public.storefront_banners
  ALTER COLUMN title DROP NOT NULL;

ALTER TABLE public.storefront_banners
  ADD COLUMN IF NOT EXISTS crop_settings JSONB DEFAULT '{"desktop":{"x":0,"y":0,"zoom":1},"mobile":{"x":0,"y":0,"zoom":1}}'::jsonb;

-- Normalize aspect_ratio values
UPDATE public.storefront_banners
  SET aspect_ratio = '3:1'
  WHERE aspect_ratio IN ('banner', 'ultrawide', 'square', 'portrait', 'custom') OR aspect_ratio IS NULL;

UPDATE public.storefront_banners
  SET aspect_ratio = '16:9'
  WHERE aspect_ratio = 'widescreen';
