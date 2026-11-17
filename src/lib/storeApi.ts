import { supabase } from './supabase'
import type { Category, Order, OrderStatus, PaymentStatus, Product, ShippingAddressData, StoreSettings } from '../types/database'

// Default fallback settings if DB request fails or is pending
export const DEFAULT_SETTINGS: StoreSettings = {
  store_name: 'WENZY',
  tagline: 'Bold Streetwear for the Limitless',
  currency: 'INR',
  currency_symbol: '₹',
  announcement: 'BOLD STREETWEAR FOR THE LIMITLESS • FREE SHIPPING ACROSS INDIA ON ORDERS OVER ₹999 • CASH ON DELIVERY AVAILABLE',
  contact_email: 'support@wenzy.store',
  contact_phone: '+91 98765 43210',
  shipping_fee: 99.0,
  free_shipping_threshold: 999.0,
  tax_rate: 0.05,
}

// ---------------------------------------------------------------------------
// Storefront Queries
// ---------------------------------------------------------------------------

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'general')
      .single()

    if (error || !data) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...data.value }
  } catch (err) {
    console.error('Failed to load store settings:', err)
    return DEFAULT_SETTINGS
  }
}

export async function getCategories(onlyActive = true): Promise<Category[]> {
  let query = supabase.from('categories').select('*').order('display_order', { ascending: true })
  if (onlyActive) {
    query = query.eq('is_active', true)
  }
  const { data, error } = await query
  if (error) {
    console.error('Error fetching categories:', error)
    throw error
  }
  return data || []
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single()
    if (error) return null
    return data
  } catch {
    return null
  }
}

export interface ProductFilters {
  categorySlug?: string
  isFeatured?: boolean
  isNew?: boolean
  search?: string
  sortBy?: 'featured' | 'price-low' | 'price-high' | 'newest'
}

export async function getProducts(filters?: ProductFilters): Promise<Product[]> {
  let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        images:product_images(*),
        variants:product_variants(*)
      `)
      .eq('is_active', true)

    if (filters?.isFeatured) {
      query = query.eq('is_featured', true)
    }

    if (filters?.isNew) {
      query = query.eq('is_new', true)
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    if (filters?.sortBy === 'price-low') {
      query = query.order('price', { ascending: true })
    } else if (filters?.sortBy === 'price-high') {
      query = query.order('price', { ascending: false })
    } else if (filters?.sortBy === 'newest') {
      query = query.order('created_at', { ascending: false })
    } else {
      query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false })
    }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching products:', error)
    throw error
  }

  let results = (data as Product[]) || []

  // If filtered by category slug, apply filter
  if (filters?.categorySlug && filters.categorySlug !== 'all') {
    results = results.filter((p) => p.category?.slug === filters.categorySlug)
  }

  // Sort product images by display_order
  results.forEach((p) => {
    if (p.images) {
      p.images.sort((a, b) => a.display_order - b.display_order)
    }
  })

  return results
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        images:product_images(*),
        variants:product_variants(*)
      `)
      .eq('slug', slug)
      .single()

    if (error || !data) return null

    const prod = data as Product
    if (prod.images) {
      prod.images.sort((a, b) => a.display_order - b.display_order)
    }
    return prod
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Order Creation
// ---------------------------------------------------------------------------

export interface CreateOrderParams {
  userId?: string | null
  customerEmail: string
  customerPhone: string
  customerName: string
  shippingAddress: ShippingAddressData
  paymentMethod: string
  items: {
    variantId: string
    quantity: number
  }[]
  notes?: string
}

export interface SecureOrderResult {
  order_id: string
  order_number: string
  access_token: string
  subtotal: number
  shipping_fee: number
  tax: number
  total: number
  status: OrderStatus
  payment_status: PaymentStatus
}

export async function createOrder(params: CreateOrderParams): Promise<{ order?: SecureOrderResult; error?: string }> {
  try {
    const formattedItems = params.items.map((i) => ({
      variant_id: i.variantId,
      quantity: i.quantity,
    }))

    const { data, error } = await supabase.rpc('create_order_secure', {
      p_customer_name: params.customerName,
      p_customer_email: params.customerEmail,
      p_customer_phone: params.customerPhone,
      p_shipping_address: params.shippingAddress,
      p_payment_method: params.paymentMethod,
      p_items: formattedItems,
      p_notes: params.notes || null,
    })

    if (error || !data) {
      console.error('Order creation error:', error)
      return { error: error?.message || 'Failed to place order securely.' }
    }

    return { order: data as SecureOrderResult }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred during checkout' }
  }
}

export async function verifyPayment(
  orderId: string,
  accessToken: string,
  paymentId: string,
  verificationToken = 'sig_sandbox_valid_signature'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('verify_payment_secure', {
      p_order_id: orderId,
      p_access_token: accessToken,
      p_payment_id: paymentId,
      p_verification_token: verificationToken,
    })

    if (error || !data?.success) {
      return { success: false, error: error?.message || 'Payment verification failed' }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getOrderByAccessToken(orderId: string, accessToken: string): Promise<Order | null> {
  try {
    const { data, error } = await supabase.rpc('get_guest_order', {
      p_order_id: orderId,
      p_access_token: accessToken,
    })
    if (error || !data) return null
    return data as Order
  } catch {
    return null
  }
}

export async function getCustomerOrders(userId: string): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  } catch {
    return []
  }
}

export async function getOrderById(orderId: string, accessToken?: string): Promise<Order | null> {
  try {
    if (accessToken) {
      const tokenOrder = await getOrderByAccessToken(orderId, accessToken)
      if (tokenOrder) return tokenOrder
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('id', orderId)
      .single()

    if (error || !data) return null
    return data
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Storage Upload Helpers
// ---------------------------------------------------------------------------

export async function uploadImageToStorage(
  file: File,
  bucket: 'product-images' | 'category-images' | 'store-assets'
): Promise<{ url?: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (uploadError) {
      return { error: uploadError.message }
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
    return { url: data.publicUrl }
  } catch (err: any) {
    return { error: err.message || 'Upload failed' }
  }
}

// ---------------------------------------------------------------------------
// Admin Management APIs
// ---------------------------------------------------------------------------

export async function adminGetDashboardMetrics() {
  const [ordersRes, productsRes, categoriesRes, customersRes] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact' }),
    supabase.from('products').select('*', { count: 'exact' }),
    supabase.from('categories').select('*', { count: 'exact' }),
    supabase.from('profiles').select('*', { count: 'exact' }),
  ])

  const orders = ordersRes.data || []
  const totalRevenue = orders
    .filter((o) => o.payment_status === 'Paid')
    .reduce((sum, o) => sum + Number(o.total || 0), 0)

  // Low stock variants
  const { data: lowStockVariants } = await supabase
    .from('product_variants')
    .select('*, product:products(name)')
    .lte('stock_quantity', 5)
    .order('stock_quantity', { ascending: true })

  return {
    totalRevenue,
    totalOrders: ordersRes.count || 0,
    totalProducts: productsRes.count || 0,
    totalCategories: categoriesRes.count || 0,
    totalCustomers: customersRes.count || 0,
    recentOrders: orders.slice(0, 8),
    lowStockVariants: lowStockVariants || [],
  }
}

export async function adminGetProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      images:product_images(*),
      variants:product_variants(*)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function adminSaveProduct(
  productData: Partial<Product>,
  images: { image_url: string; alt_text?: string; is_primary?: boolean }[],
  variants: { size: string; color: string; sku?: string; stock_quantity: number }[]
) {
  let productId = productData.id

  if (!productId) {
    // Insert new product
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        price: productData.price,
        compare_at_price: productData.compare_at_price || null,
        category_id: productData.category_id || null,
        is_active: productData.is_active ?? true,
        is_featured: productData.is_featured ?? false,
        is_new: productData.is_new ?? false,
        details: productData.details || {},
      })
      .select()
      .single()

    if (error) throw error
    productId = data.id
  } else {
    // Update existing product
    const { error } = await supabase
      .from('products')
      .update({
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        price: productData.price,
        compare_at_price: productData.compare_at_price || null,
        category_id: productData.category_id || null,
        is_active: productData.is_active ?? true,
        is_featured: productData.is_featured ?? false,
        is_new: productData.is_new ?? false,
        details: productData.details || {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)

    if (error) throw error

    // Delete existing images & variants for clean replacement
    await supabase.from('product_images').delete().eq('product_id', productId)
    await supabase.from('product_variants').delete().eq('product_id', productId)
  }

  // Insert Images
  if (images.length > 0) {
    const imagesToInsert = images.map((img, idx) => ({
      product_id: productId,
      image_url: img.image_url,
      alt_text: img.alt_text || productData.name,
      display_order: idx + 1,
      is_primary: idx === 0,
    }))
    const { error: imgErr } = await supabase.from('product_images').insert(imagesToInsert)
    if (imgErr) console.error('Failed to save product images:', imgErr)
  }

  // Insert Variants
  if (variants.length > 0) {
    const variantsToInsert = variants.map((v) => ({
      product_id: productId,
      size: v.size,
      color: v.color || 'Black',
      sku: v.sku || `${productData.slug?.substring(0, 6).toUpperCase()}-${v.size}`,
      stock_quantity: v.stock_quantity || 0,
    }))
    const { error: varErr } = await supabase.from('product_variants').insert(variantsToInsert)
    if (varErr) console.error('Failed to save product variants:', varErr)
  }

  return productId
}

export async function adminDeleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export async function adminSaveCategory(category: Partial<Category>) {
  if (!category.id) {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: category.name,
        slug: category.slug,
        description: category.description || null,
        image_url: category.image_url || null,
        is_active: category.is_active ?? true,
        display_order: category.display_order ?? 0,
      })
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('categories')
      .update({
        name: category.name,
        slug: category.slug,
        description: category.description || null,
        image_url: category.image_url || null,
        is_active: category.is_active ?? true,
        display_order: category.display_order ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', category.id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function adminDeleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  // Check if any products are assigned to this category
  const { count, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id)

  if (countError) {
    return { success: false, error: countError.message }
  }

  if (count && count > 0) {
    return {
      success: false,
      error: `Cannot delete category: ${count} product(s) are currently assigned to it. Reassign or delete the products first, or deactivate this category instead.`,
    }
  }

  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function adminGetOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function adminUpdateOrderStatus(orderId: string, status: Order['status'], paymentStatus?: Order['payment_status']) {
  const updateData: any = { status, updated_at: new Date().toISOString() }
  if (paymentStatus) {
    updateData.payment_status = paymentStatus
  }
  const { error } = await supabase.from('orders').update(updateData).eq('id', orderId)
  if (error) throw error
}

export async function adminGetCustomers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function adminSaveSettings(settings: StoreSettings) {
  const { error } = await supabase
    .from('store_settings')
    .upsert({
      key: 'general',
      value: settings,
      updated_at: new Date().toISOString(),
    })

  if (error) throw error
}
