import { supabase } from './supabase'
import type { Category, Collection, Order, OrderStatus, PaymentStatus, Product, ShippingAddressData, StoreSettings, StorefrontBanner } from '../types/database'

// Default fallback settings if DB request fails or is pending
export const DEFAULT_SETTINGS: StoreSettings = {
  store_name: 'WENZY',
  tagline: 'Bold Streetwear for the Limitless',
  currency: 'INR',
  currency_symbol: '₹',
  contact_email: 'support@wenzy.store',
  contact_phone: '+91 98765 43210',
  shipping_fee: 99.0,
  free_shipping_threshold: 999.0,
  tax_rate: 0.05,
}

// ---------------------------------------------------------------------------
// Storefront Queries
// ---------------------------------------------------------------------------

/**
 * Fetch products configured for the interactive WENZY RACK.
 * Strictly filters to ensure only active products with all three mandatory
 * rack images (side, front, back) are returned to the public storefront rail.
 */
export async function getRackProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        images:product_images(*),
        variants:product_variants(*)
      `)
      .eq('is_active', true)
      .eq('in_clothing_rail', true)
      .order('rail_display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching rack products:', error)
      return []
    }

    const products = (data as Product[]) || []

    // Enforce strict storefront rule:
    // A rack garment MUST have its required side-profile, front, and back images.
    // If any are missing, it remains hidden from the public clothing rail.
    return products.filter((p) => {
      const imgs = p.images || []
      const hasSide = imgs.some((img) => img.view_type === 'side' && Boolean(img.image_url?.trim()))
      const hasFront = imgs.some((img) => img.view_type === 'front' && Boolean(img.image_url?.trim()))
      const hasBack = imgs.some((img) => img.view_type === 'back' && Boolean(img.image_url?.trim()))
      return hasSide && hasFront && hasBack
    })
  } catch (err) {
    console.error('Failed to load rack products:', err)
    return []
  }
}

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

export async function getCategories(onlyActive = true, onlyHeader = false): Promise<Category[]> {
  let query = supabase.from('categories').select('*').order('display_order', { ascending: true })
  if (onlyActive) {
    query = query.eq('is_active', true)
  }
  if (onlyHeader) {
    query = query.eq('show_in_header', true)
  }
  const { data, error } = await query
  if (error) {
    console.error('Error fetching categories:', error)
    throw error
  }
  return data || []
}

// ─── Collections ───────────────────────────────────────────────────────────

export async function getCollections(onlyActive = true): Promise<Collection[]> {
  let query = supabase
    .from('collections')
    .select('*')
    .order('display_order', { ascending: true })
  if (onlyActive) {
    query = query.eq('is_active', true)
  }
  const { data, error } = await query
  if (error) {
    console.error('Error fetching collections:', error)
    return []
  }
  return data || []
}

export async function adminSaveCollection(col: Partial<Collection>): Promise<Collection> {
  const payload: Record<string, any> = {
    name: col.name,
    slug: col.slug,
    is_active: col.is_active ?? true,
    display_order: col.display_order ?? 0,
    updated_at: new Date().toISOString(),
  }

  if (col.id) {
    const { data, error } = await supabase
      .from('collections')
      .update(payload)
      .eq('id', col.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('collections')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function adminDeleteCollection(id: string): Promise<void> {
  const { error } = await supabase.from('collections').delete().eq('id', id)
  if (error) throw error
}

export async function adminReorderCollections(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, idx) =>
    supabase.from('collections').update({ display_order: idx, updated_at: new Date().toISOString() }).eq('id', id)
  )
  await Promise.all(updates)
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
  images: { image_url: string; alt_text?: string; is_primary?: boolean; view_type?: 'standard' | 'side' | 'front' | 'back' | 'detail' }[],
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
        collection_id: productData.collection_id || null,
        is_active: productData.is_active ?? true,
        is_featured: productData.is_featured ?? false,
        is_new: productData.is_new ?? false,
        in_clothing_rail: productData.in_clothing_rail ?? false,
        rail_display_order: productData.rail_display_order ?? 0,
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
        collection_id: productData.collection_id || null,
        is_active: productData.is_active ?? true,
        is_featured: productData.is_featured ?? false,
        is_new: productData.is_new ?? false,
        in_clothing_rail: productData.in_clothing_rail ?? false,
        rail_display_order: productData.rail_display_order ?? 0,
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
      is_primary: img.is_primary ?? (idx === 0),
      view_type: img.view_type || 'standard',
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
        show_in_header: category.show_in_header ?? true,
        crop_settings: category.crop_settings || { x: 0, y: 0, zoom: 1 },
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
        show_in_header: category.show_in_header ?? true,
        crop_settings: category.crop_settings || { x: 0, y: 0, zoom: 1 },
        updated_at: new Date().toISOString(),
      })
      .eq('id', category.id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function adminReorderCategories(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('categories')
      .update({ display_order: index + 1, updated_at: new Date().toISOString() })
      .eq('id', id)
  )
  const results = await Promise.all(updates)
  const firstError = results.find((r) => r.error)?.error
  if (firstError) throw firstError
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

// ===========================================================================
// BANNER MANAGEMENT
// ===========================================================================

/** Returns the public CDN URL for a given banner-media storage path */
export function getBannerPublicUrl(path: string): string {
  if (!path) return ''
  // If it's already a full URL, return as-is
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('banner-media').getPublicUrl(path)
  return data.publicUrl
}

/** Fetch active banners for storefront (ordered by display_order) */
export async function getBanners(): Promise<StorefrontBanner[]> {
  const { data, error } = await supabase
    .from('storefront_banners')
    .select(`
      *,
      destination_product:products!destination_product_id(name, slug),
      destination_category:categories!destination_category_id(name, slug)
    `)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching banners:', error)
    return []
  }
  return data || []
}

/** Fetch ALL banners for admin (including inactive), with joined product/category names */
export async function adminGetBanners(): Promise<StorefrontBanner[]> {
  const { data, error } = await supabase
    .from('storefront_banners')
    .select(`
      *,
      destination_product:products!destination_product_id(name, slug),
      destination_category:categories!destination_category_id(name, slug)
    `)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching banners (admin):', error)
    throw error
  }
  return data || []
}

/** Create or update a banner record */
export async function adminSaveBanner(banner: Partial<StorefrontBanner>): Promise<StorefrontBanner> {
  const payload = {
    title: banner.title ? banner.title.trim() : null,
    media_type: banner.media_type,
    media_path: banner.media_path,
    mobile_media_path: banner.mobile_media_path || null,
    destination_type: banner.destination_type || 'none',
    destination_product_id: banner.destination_product_id || null,
    destination_category_id: banner.destination_category_id || null,
    destination_url: banner.destination_url || null,
    heading: banner.heading || null,
    description: banner.description || null,
    button_text: banner.button_text || null,
    display_order: banner.display_order ?? 0,
    duration_ms: banner.duration_ms ?? 5000,
    video_advance_mode: banner.video_advance_mode || 'duration',
    overlay_opacity: banner.overlay_opacity ?? 0,
    text_alignment: banner.text_alignment || 'left',
    text_color: banner.text_color || '#FFFFFF',
    aspect_ratio: banner.aspect_ratio || '3:1',
    crop_settings: banner.crop_settings || { desktop: { x: 0, y: 0, zoom: 1 }, mobile: { x: 0, y: 0, zoom: 1 } },
    object_fit: banner.object_fit || 'cover',
    is_active: banner.is_active ?? true,
    updated_at: new Date().toISOString(),
  }

  if (banner.id) {
    // UPDATE
    const { data, error } = await supabase
      .from('storefront_banners')
      .update(payload)
      .eq('id', banner.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    // INSERT
    const { data, error } = await supabase
      .from('storefront_banners')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

/** Toggle banner active/inactive */
export async function adminToggleBannerActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('storefront_banners')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/** Delete a banner record and its associated media from storage */
export async function adminDeleteBanner(id: string, mediaPath?: string | null, mobileMediaPath?: string | null): Promise<void> {
  const { error } = await supabase
    .from('storefront_banners')
    .delete()
    .eq('id', id)
  if (error) throw error

  // Clean up storage objects (best-effort, don't fail if missing)
  const toDelete: string[] = []
  if (mediaPath && !mediaPath.startsWith('http')) toDelete.push(mediaPath)
  if (mobileMediaPath && !mobileMediaPath.startsWith('http')) toDelete.push(mobileMediaPath)
  if (toDelete.length > 0) {
    await supabase.storage.from('banner-media').remove(toDelete)
  }
}

/** Reorder banners using the server-side RPC */
export async function adminReorderBanners(orderedIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_banners', { p_ordered_ids: orderedIds })
  if (error) throw error
}

/** Upload a banner media file (image or video) to the banner-media bucket */
export async function uploadBannerMedia(
  file: File,
  type: 'image' | 'video'
): Promise<{ path: string; url: string; error?: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || (type === 'video' ? 'mp4' : 'jpg')
  const fileName = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const path = `banners/${fileName}`

  const { data, error } = await supabase.storage
    .from('banner-media')
    .upload(path, file, { upsert: false, contentType: file.type })

  if (error) {
    return { path: '', url: '', error: error.message }
  }

  const { data: urlData } = supabase.storage.from('banner-media').getPublicUrl(data.path)
  return { path: data.path, url: urlData.publicUrl }
}

/** Delete a banner media file from storage */
export async function deleteBannerMedia(path: string): Promise<void> {
  if (!path || path.startsWith('http')) return
  await supabase.storage.from('banner-media').remove([path])
}
