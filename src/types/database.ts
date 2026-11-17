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

export interface Category {
  id: string
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
  // Virtual count computed or joined
  product_count?: number
}

export interface ProductDetails {
  fabric?: string
  gsm?: number
  fit?: string
  care?: string
  [key: string]: any
}

export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  alt_text?: string | null
  display_order: number
  is_primary: boolean
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

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  compare_at_price?: number | null
  category_id?: string | null
  is_active: boolean
  is_featured: boolean
  is_new: boolean
  details?: ProductDetails | null
  created_at: string
  updated_at: string
  // Joined fields
  category?: Category | null
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
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

export interface StoreSettings {
  store_name: string
  tagline: string
  currency: string
  currency_symbol: string
  announcement: string
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
