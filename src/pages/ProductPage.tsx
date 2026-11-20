import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Plus,
  Minus,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useCart } from '../context/CartContext'
import { getProductBySlug, getProducts } from '../lib/storeApi'
import ProductCard from '../components/ProductCard'
import type { Product, ProductVariant } from '../types/database'

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const { addItem } = useCart()

  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedImage, setSelectedImage] = useState<string>('')
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [addedAnimation, setAddedAnimation] = useState(false)
  const [showStickyBar, setShowStickyBar] = useState(false)

  // Mobile image carousel state
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0)
  const mobileCarouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    getProductBySlug(slug)
      .then((prod) => {
        setProduct(prod)
        if (prod) {
          const primary = prod.images?.find((img) => img.is_primary)?.image_url || prod.images?.[0]?.image_url || ''
          setSelectedImage(primary)
          setMobileActiveIndex(0)
          const firstInStock = prod.variants?.find((v) => v.stock_quantity > 0) || prod.variants?.[0] || null
          setSelectedVariant(firstInStock)

          // Fetch related products from same category or featured
          getProducts({ isFeatured: true }).then((others) => {
            setRelatedProducts(others.filter((p) => p.id !== prod.id).slice(0, 4))
          })
        }
      })
      .finally(() => setLoading(false))

    // Observe scroll position for sticky purchase bar
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 500)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [slug])

  // Get display catalog images (sorted by display_order)
  const catalogImages = useMemo(() => {
    if (!product || !product.images) return []
    // Filter to standard images, or all images if no standard images exist
    const standard = product.images.filter((img) => !img.view_type || img.view_type === 'standard')
    const list = standard.length > 0 ? standard : product.images
    return [...list].sort((a, b) => a.display_order - b.display_order)
  }, [product])

  // Mobile scroll listener to update active dot index
  const handleMobileScroll = () => {
    if (!mobileCarouselRef.current) return
    const el = mobileCarouselRef.current
    const scrollLeft = el.scrollLeft
    const width = el.offsetWidth || 1
    const newIndex = Math.round(scrollLeft / width)
    if (newIndex !== mobileActiveIndex && newIndex >= 0 && newIndex < catalogImages.length) {
      setMobileActiveIndex(newIndex)
    }
  }

  const scrollMobileTo = (index: number) => {
    if (!mobileCarouselRef.current) return
    const el = mobileCarouselRef.current
    const width = el.offsetWidth
    el.scrollTo({ left: index * width, behavior: 'smooth' })
    setMobileActiveIndex(index)
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
        <div className="text-xs uppercase font-bold tracking-widest text-neutral-400">Loading piece details...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="wrap py-24 text-center space-y-4">
        <h1 className="text-2xl font-black uppercase tracking-wider text-black">Product Not Found</h1>
        <p className="text-xs text-neutral-500">The product you are looking for may have sold out or been archived.</p>
        <Link to="/shop" className="btn-primary inline-flex">
          Explore All Products
        </Link>
      </div>
    )
  }

  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0

  const isCurrentVariantInStock = (selectedVariant?.stock_quantity ?? 0) > 0

  const handleAddToCart = () => {
    if (!selectedVariant || !isCurrentVariantInStock) return

    addItem(
      {
        productId: product.id,
        variantId: selectedVariant.id,
        name: product.name,
        slug: product.slug,
        size: selectedVariant.size,
        color: selectedVariant.color,
        price: selectedVariant.price_override || product.price,
        compareAtPrice: product.compare_at_price,
        maxStock: selectedVariant.stock_quantity,
        image: selectedImage || catalogImages[0]?.image_url || '/assets/wenzy_front_texture.png',
      },
      quantity
    )

    setAddedAnimation(true)
    setTimeout(() => setAddedAnimation(false), 2000)
  }

  return (
    <div className="wrap py-6 sm:py-10">
      {/* 1. Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-6">
        <Link to="/" className="hover:text-black transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-black transition-colors">
          Shop
        </Link>
        <span>/</span>
        {product.category && (
          <>
            <Link to={`/category/${product.category.slug}`} className="hover:text-black transition-colors">
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-black truncate max-w-xs">{product.name}</span>
      </nav>

      {/* 2. Main Product Layout (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
        
        {/* ============================================================== */}
        {/* LEFT COLUMN: PRODUCT IMAGES                                    */}
        {/* Mobile: Swipeable touch carousel with dots indicator            */}
        {/* Desktop: Primary image with selectable thumbnails on left      */}
        {/* ============================================================== */}
        <div className="lg:col-span-7 w-full">
          
          {/* MOBILE VIEW (< lg): Horizontal swipe carousel with dots indicator */}
          <div className="block lg:hidden relative w-full">
            {/* Swipeable image container (frame only, no text overlays) */}
            <div
              ref={mobileCarouselRef}
              onScroll={handleMobileScroll}
              className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-lg bg-neutral-100"
              style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
            >
              {catalogImages.length > 0 ? (
                catalogImages.map((img, idx) => (
                  <div
                    key={img.id || idx}
                    className="w-full shrink-0 snap-center relative aspect-[3/4] overflow-hidden rounded-lg border border-neutral-200"
                  >
                    <img
                      src={img.image_url}
                      alt={img.alt_text || `${product.name} photo ${idx + 1}`}
                      className="w-full h-full object-cover object-top"
                      loading={idx === 0 ? 'eager' : 'lazy'}
                    />
                  </div>
                ))
              ) : (
                <div className="w-full aspect-[3/4] bg-neutral-100 flex items-center justify-center text-neutral-400 text-xs font-mono rounded-lg">
                  NO IMAGE
                </div>
              )}
            </div>

            {/* Mobile Dots Indicator (matches reference image dots) */}
            {catalogImages.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-3 pb-1">
                {catalogImages.map((_, dotIdx) => {
                  const isActive = mobileActiveIndex === dotIdx
                  return (
                    <button
                      key={dotIdx}
                      type="button"
                      onClick={() => scrollMobileTo(dotIdx)}
                      aria-label={`Go to image ${dotIdx + 1}`}
                      className={`transition-all duration-300 rounded-full ${
                        isActive
                          ? 'w-5 h-1.5 bg-neutral-900'
                          : 'w-1.5 h-1.5 bg-neutral-300 hover:bg-neutral-500'
                      }`}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* DESKTOP VIEW (>= lg): Selectable thumbnails on the left + Main primary image on the right (Frame only) */}
          <div className="hidden lg:flex flex-row gap-4">
            {/* Selectable Thumbnails on the left */}
            {catalogImages.length > 1 && (
              <div className="flex flex-col gap-3 shrink-0 overflow-y-auto max-h-[85vh] scrollbar-none pr-1">
                {catalogImages.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    type="button"
                    onClick={() => setSelectedImage(img.image_url)}
                    className={`w-20 h-24 bg-neutral-100 rounded overflow-hidden border transition-all ${
                      (selectedImage || catalogImages[0]?.image_url) === img.image_url
                        ? 'border-black ring-1 ring-black'
                        : 'border-neutral-200 hover:border-neutral-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover object-top" />
                  </button>
                ))}
              </div>
            )}

            {/* Main Single Display Image (Frame only, no text overlays) */}
            <div className="flex-1 aspect-[3/4] bg-neutral-100 overflow-hidden rounded-md border border-neutral-200 relative group">
              <img
                src={selectedImage || catalogImages[0]?.image_url || '/assets/wenzy_front_texture.png'}
                alt={product.name}
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: STICKY PURCHASING DETAILS (5 cols on lg)         */}
        {/* On desktop: sticky top-24, stays fixed while left column      */}
        {/* scrolls past, scrolls along once past entire image gallery    */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 flex flex-col space-y-6 lg:sticky lg:top-24">
          
          {/* Brand Edition Header */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 font-accent text-xs font-bold uppercase tracking-widest text-neutral-500">
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>WENZY STREETWEAR • SEASON 01</span>
            </div>

            <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl uppercase tracking-tight text-black leading-tight">
              {product.name}
            </h1>

            {/* Price Presentation */}
            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-2xl sm:text-3xl font-black text-black">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-base text-neutral-400 line-through font-normal">
                    ₹{product.compare_at_price!.toLocaleString('en-IN')}
                  </span>
                  <span className="badge-sale">
                    SAVE {discountPercent}%
                  </span>
                </>
              )}
            </div>
            <div className="text-[11px] text-neutral-500">
              Tax included. Free shipping calculated on orders above ₹999.
            </div>
          </div>

          <hr className="border-neutral-200" />

          {/* Size Variant Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span>Select Size</span>
              <a href="#size-guide" className="text-neutral-500 hover:text-black underline underline-offset-4">
                Size Chart
              </a>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {product.variants?.map((v) => {
                const isSelected = selectedVariant?.id === v.id
                const isOut = v.stock_quantity <= 0

                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={isOut}
                    onClick={() => setSelectedVariant(v)}
                    className={`h-11 border text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center relative ${
                      isOut
                        ? 'border-neutral-200 text-neutral-300 line-through cursor-not-allowed bg-neutral-50'
                        : isSelected
                        ? 'border-black bg-black text-white font-black'
                        : 'border-neutral-300 text-black hover:border-black'
                    }`}
                  >
                    {v.size}
                  </button>
                )
              })}
            </div>

            {/* Live Stock Notice */}
            {selectedVariant && (
              <div className="text-[11px] font-bold text-neutral-600">
                {selectedVariant.stock_quantity > 0 ? (
                  selectedVariant.stock_quantity <= 5 ? (
                    <span className="text-amber-600 font-extrabold uppercase">
                      ⚠️ Only {selectedVariant.stock_quantity} left in size {selectedVariant.size}!
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-semibold">
                      ✓ In Stock (Ready to dispatch within 24 hrs)
                    </span>
                  )
                ) : (
                  <span className="text-red-600 font-bold">Sold Out in this size</span>
                )}
              </div>
            )}
          </div>

          {/* Quantity Selector & Add to Cart */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              {/* Stepper */}
              <div className="flex items-center border border-black h-12">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-full flex items-center justify-center hover:bg-neutral-100 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-bold font-mono">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(selectedVariant?.stock_quantity || 99, q + 1))}
                  className="w-10 h-full flex items-center justify-center hover:bg-neutral-100 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Main CTA */}
              <button
                type="button"
                disabled={!isCurrentVariantInStock}
                onClick={handleAddToCart}
                className="btn-primary flex-1 h-12 text-sm flex items-center justify-center gap-2"
              >
                {addedAnimation ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Added to Bag</span>
                  </>
                ) : isCurrentVariantInStock ? (
                  <span>Add to Bag • ₹{((selectedVariant?.price_override || product.price) * quantity).toLocaleString('en-IN')}</span>
                ) : (
                  <span>Sold Out</span>
                )}
              </button>
            </div>
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-neutral-200 text-center text-[10px] font-bold uppercase tracking-wider text-neutral-600">
            <div className="p-2 bg-neutral-50 border border-neutral-200">
              <Truck className="w-4 h-4 mx-auto mb-1 text-black" />
              <span>Pan-India Delivery</span>
            </div>
            <div className="p-2 bg-neutral-50 border border-neutral-200">
              <RotateCcw className="w-4 h-4 mx-auto mb-1 text-black" />
              <span>7-Day Exchange</span>
            </div>
            <div className="p-2 bg-neutral-50 border border-neutral-200">
              <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-black" />
              <span>Verified Cotton</span>
            </div>
          </div>

          {/* Collapsible Accordion Tabs (Matching REA Reference) */}
          <div className="divide-y divide-neutral-200 border-t border-b border-neutral-200 pt-2">
            {/* Description */}
            <details className="group py-4" open>
              <summary className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] cursor-pointer list-none">
                <span>Product Description</span>
                <ChevronDown className="w-4 h-4 text-neutral-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="pt-3 text-xs text-neutral-600 leading-relaxed space-y-2">
                <p>{product.description}</p>
                {product.details && (
                  <ul className="list-disc pl-4 space-y-1 text-neutral-700 pt-1">
                    {product.details.fabric && <li>Fabric: {product.details.fabric}</li>}
                    {product.details.gsm && <li>Weight: {product.details.gsm} GSM</li>}
                    {product.details.fit && <li>Cut & Fit: {product.details.fit}</li>}
                  </ul>
                )}
              </div>
            </details>

            {/* Size Guide Table */}
            <details id="size-guide" className="group py-4">
              <summary className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] cursor-pointer list-none">
                <span>Size Chart (Inches)</span>
                <ChevronDown className="w-4 h-4 text-neutral-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="pt-3 text-xs overflow-x-auto">
                <table className="w-full text-left text-neutral-700 border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-300 font-bold uppercase text-[10px]">
                      <th className="py-2">Size</th>
                      <th className="py-2">Chest</th>
                      <th className="py-2">Length</th>
                      <th className="py-2">Shoulder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    <tr>
                      <td className="py-1.5 font-bold">S</td>
                      <td>42"</td>
                      <td>28"</td>
                      <td>21"</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 font-bold">M</td>
                      <td>44"</td>
                      <td>29"</td>
                      <td>22"</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 font-bold">L</td>
                      <td>46"</td>
                      <td>30"</td>
                      <td>23"</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 font-bold">XL</td>
                      <td>48"</td>
                      <td>31"</td>
                      <td>24"</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 font-bold">2XL</td>
                      <td>50"</td>
                      <td>32"</td>
                      <td>25"</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </details>

            {/* Fabric & Wash Care */}
            <details className="group py-4">
              <summary className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] cursor-pointer list-none">
                <span>Fabric & Wash Care</span>
                <ChevronDown className="w-4 h-4 text-neutral-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="pt-3 text-xs text-neutral-600 leading-relaxed space-y-1">
                <p>• Machine wash cold inside out with like colors.</p>
                <p>• Do not iron directly on the graphic print.</p>
                <p>• Avoid bleach or harsh chemical detergents.</p>
                <p>• Dry flat in shade to preserve color saturation and collar shape.</p>
              </div>
            </details>

            {/* Shipping & Returns */}
            <details className="group py-4">
              <summary className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] cursor-pointer list-none">
                <span>Shipping & Easy Returns</span>
                <ChevronDown className="w-4 h-4 text-neutral-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="pt-3 text-xs text-neutral-600 leading-relaxed space-y-1">
                <p>• Orders dispatched within 24–48 hours from Mumbai warehouse.</p>
                <p>• Delivery across metro cities in 2–4 business days; rest of India in 4–6 business days.</p>
                <p>• 7-day hassle-free size exchange policy on unworn items with tags intact.</p>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* 3. Sticky Bottom Purchase Bar (Matches REA floating-panel.js) */}
      {showStickyBar && isCurrentVariantInStock && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-neutral-200 py-3 px-4 shadow-xl animate-fade-in">
          <div className="wrap flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={selectedImage || catalogImages[0]?.image_url}
                alt={product.name}
                className="w-10 h-10 object-cover bg-neutral-100 border border-neutral-200 shrink-0"
              />
              <div className="truncate">
                <div className="text-xs font-bold uppercase truncate">{product.name}</div>
                <div className="text-[11px] text-neutral-500 font-extrabold">
                  ₹{product.price.toLocaleString('en-IN')} • Size: {selectedVariant?.size}
                </div>
              </div>
            </div>

            <button onClick={handleAddToCart} className="btn-primary py-2.5 px-6 shrink-0 text-xs">
              Add to Bag
            </button>
          </div>
        </div>
      )}

      {/* 4. Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="mt-24 pt-12 border-t border-neutral-200">
          <div className="mb-8">
            <span className="font-accent text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-400">
              You May Also Like
            </span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-black mt-1">
              Complete The Look
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
