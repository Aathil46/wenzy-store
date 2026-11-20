export type UserRole = 'customer' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name?: string | null
  phone?: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface CategoryCropSettings {
  x: number
  y: number
  zoom: number
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  is_active: boolean
  display_order: number
  show_in_header?: boolean
  crop_settings?: CategoryCropSettings | null
  created_at: string
  updated_at: string
  // Virtual count computed or joined
  product_count?: number
}

export interface ColorVariant {
  name: string
  hex: string
  product_id?: string
  slug?: string
}

export interface TrustCard {
  icon: string
  title: string
  subtitle?: string
}

export interface ProductDetails {
  fabric?: string
  gsm?: number
  fit?: string
  care?: string
  subtitle?: string
  color_variants?: ColorVariant[]
  trust_cards?: TrustCard[]
  size_guide_image?: string
  return_policy?: string
  shipping_info?: string
  related_products_title?: string
  related_product_ids?: string[]
  [key: string]: any
}

export interface ReviewMediaItem {
  type: 'image' | 'video'
  url: string
}

export interface ProductReview {
  id: string
  product_id: string
  rating: number
  author_name: string
  author_email?: string | null
  title?: string | null
  content: string
  media_urls?: ReviewMediaItem[]
  is_verified_buyer: boolean
  is_approved: boolean
  helpful_count?: number
  created_at: string
  updated_at: string
  product?: { name: string; slug: string } | null
}

export type ProductImageViewType = 'standard' | 'side' | 'front' | 'back' | 'detail'

export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  alt_text?: string | null
  display_order: number
  is_primary: boolean
  view_type?: ProductImageViewType
  created_at: string
}

export interface ProductVariant {
  id: string
  product_id: string
  size: string
  color: string
  sku?: string | null
  price_override?: number | null
  stock_quantity: number
  created_at: string
  updated_at: string
}

// ============================================================
// Collections (Subcategory filter sections on homepage)
// ============================================================
export interface Collection {
  id: string
  name: string
  slug: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Virtual — joined products
  products?: Product[]
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  compare_at_price?: number | null
  category_id?: string | null
  collection_id?: string | null
  is_active: boolean
  is_featured: boolean
  is_new: boolean
  in_clothing_rail?: boolean
  rail_display_order?: number
  details?: ProductDetails | null
  created_at: string
  updated_at: string
  // Joined fields
  category?: Category | null
  collection?: Collection | null
  images?: ProductImage[]
  variants?: ProductVariant[]
}

export interface Address {
  id: string
  user_id: string
  full_name: string
  phone: string
  street_address: string
  apartment?: string | null
  city: string
  state: string
  postal_code: string
  country: string
  is_default: boolean
  created_at: string
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Refunded'
export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded'

export interface ShippingAddressData {
  full_name: string
  phone: string
  street_address: string
  apartment?: string
  city: string
  state: string
  postal_code: string
  country: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id?: string | null
  variant_id?: string | null
  product_name: string
  variant_title?: string | null
  price: number
  quantity: number
  image_url?: string | null
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  user_id?: string | null
  customer_email: string
  customer_phone: string
  customer_name: string
  shipping_address: ShippingAddressData
  subtotal: number
  shipping_fee: number
  tax: number
  total: number
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: string
  payment_id?: string | null
  notes?: string | null
  access_token?: string
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

export interface StoreSettings {
  store_name: string
  tagline: string
  currency: string
  currency_symbol: string
  announcement?: string
  contact_email: string
  contact_phone: string
  shipping_fee: number
  free_shipping_threshold: number
  tax_rate: number
}

export interface CartItem {
  id?: string // variant_id or custom key
  productId: string
  variantId: string
  name: string
  slug: string
  size: string
  color: string
  price: number
  compareAtPrice?: number | null
  quantity: number
  maxStock: number
  image: string
}

// ============================================================
// Storefront Banners
// ============================================================
export type BannerMediaType = 'image' | 'video'
export type BannerDestinationType = 'product' | 'category' | 'custom_url' | 'none'
export type BannerVideoAdvanceMode = 'duration' | 'on_end'
export type BannerTextAlignment = 'left' | 'center' | 'right'
export type BannerAspectRatio = '3:1' | '16:9' | 'banner' | 'widescreen'
export type BannerObjectFit = 'cover' | 'contain'

export interface CropData {
  x: number // percentage offset (-100 to 100)
  y: number // percentage offset (-100 to 100)
  zoom: number // scale factor (1 to 3)
}

export interface BannerCropSettings {
  desktop: CropData
  mobile: CropData
}

export interface StorefrontBanner {
  id: string
  title?: string | null
  media_type: BannerMediaType
  media_path: string
  mobile_media_path?: string | null
  destination_type: BannerDestinationType
  destination_product_id?: string | null
  destination_category_id?: string | null
  destination_url?: string | null
  heading?: string | null
  description?: string | null
  button_text?: string | null
  display_order: number
  duration_ms: number
  video_advance_mode: BannerVideoAdvanceMode
  overlay_opacity: number
  text_alignment: BannerTextAlignment
  text_color: string
  aspect_ratio?: BannerAspectRatio
  crop_settings?: BannerCropSettings | null
  object_fit?: BannerObjectFit
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields (optional, from admin queries)
  destination_product?: { name: string; slug: string } | null
  destination_category?: { name: string; slug: string } | null
}
