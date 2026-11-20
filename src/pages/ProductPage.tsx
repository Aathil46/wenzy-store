import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  FileText,
  Ruler,
  Package,
  Truck,
  Share2,
  Star,
  Check,
  CheckCircle2,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  Play,
  Upload,
  MessageSquare,
  Trash2,
  Maximize2,
} from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import {
  getProductBySlug,
  getProductReviews,
  submitProductReview,
  uploadReviewMedia,
  adminDeleteReview,
  getRelatedProducts,
} from '../lib/storeApi'
import type { Product, ProductVariant, ProductReview, ColorVariant, ReviewMediaItem } from '../types/database'

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { isAdmin } = useAuth()

  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedImage, setSelectedImage] = useState<string>('')
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [addedAnimation, setAddedAnimation] = useState(false)
  const [showStickyBar, setShowStickyBar] = useState(false)
  const [shareToast, setShareToast] = useState(false)

  // Color variant selection
  const [selectedColorName, setSelectedColorName] = useState<string>('')

  // Mobile image carousel state
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0)
  const mobileCarouselRef = useRef<HTMLDivElement>(null)

  // Accordion tabs (matching Image 1 pill format)
  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>({
    description: false,
    size_guide: false,
    return_policy: false,
    shipping_info: false,
  })

  // Customer Reviews state
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewFilter, setReviewFilter] = useState<'all' | 'media' | number>('all')
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'lowest'>('newest')
  const [reviewPage, setReviewPage] = useState(1)
  const REVIEWS_PER_PAGE = 5

  // Write Review Modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const [reviewForm, setReviewForm] = useState<{
    rating: number
    author_name: string
    author_email: string
    title: string
    content: string
    media: File[]
  }>({
    rating: 5,
    author_name: '',
    author_email: '',
    title: '',
    content: '',
    media: [],
  })
  const [mediaPreviews, setMediaPreviews] = useState<{ type: 'image' | 'video'; url: string; file: File }[]>([])

  // Lightbox for Size Guide image or review media
  const [lightboxItem, setLightboxItem] = useState<{ type: 'image' | 'video'; url: string } | null>(null)

  // Toggle Accordion
  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Fetch product data and reviews
  useEffect(() => {
    if (!slug) return
    setLoading(true)
    getProductBySlug(slug)
      .then((prod) => {
        setProduct(prod)
        if (prod) {
          const primary =
            prod.images?.find((img) => img.is_primary)?.image_url || prod.images?.[0]?.image_url || ''
          setSelectedImage(primary)
          setMobileActiveIndex(0)
          const firstInStock = prod.variants?.find((v) => v.stock_quantity > 0) || prod.variants?.[0] || null
          setSelectedVariant(firstInStock)

          // Color name initialization
          const defaultColor =
            prod.details?.color_variants?.[0]?.name ||
            firstInStock?.color ||
            'Black'
          setSelectedColorName(defaultColor)

          // Load reviews for this product
          loadReviews(prod.id)

          // Load related products ("YOU MAY LIKE")
          getRelatedProducts(prod).then((related) => {
            setRelatedProducts(related.filter((p) => p.id !== prod.id))
          })
        }
      })
      .finally(() => setLoading(false))

    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 500)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [slug])

  const loadReviews = async (productId: string) => {
    setReviewsLoading(true)
    try {
      const data = await getProductReviews(productId)
      setReviews(data)
    } catch (err) {
      console.error('Failed to load reviews:', err)
    } finally {
      setReviewsLoading(false)
    }
  }

  // Get display catalog images (standard view)
  const catalogImages = useMemo(() => {
    if (!product || !product.images) return []
    const standard = product.images.filter((img) => !img.view_type || img.view_type === 'standard')
    const list = standard.length > 0 ? standard : product.images
    return [...list].sort((a, b) => a.display_order - b.display_order)
  }, [product])

  // Color variants list (from admin details or fallback linked set)
  const displayColorVariants: ColorVariant[] = useMemo(() => {
    if (product?.details?.color_variants && product.details.color_variants.length > 0) {
      return product.details.color_variants
    }
    // Fallback: If no explicit color variants configured, offer standard streetwear shades
    return [
      { name: 'Black', hex: '#111111', slug: product?.slug },
      { name: 'Off-White', hex: '#f2eee6', slug: 'doom' },
      { name: 'Sand', hex: '#d9cbb7', slug: 'oversized-tshirt' },
      { name: 'Mocha', hex: '#634433', slug: 'doom-black' },
    ]
  }, [product])

  const handleSelectColor = (col: ColorVariant) => {
    setSelectedColorName(col.name)
    if (col.slug && col.slug !== product?.slug) {
      navigate(`/product/${col.slug}`)
    }
  }

  // Mobile scroll listener
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

  // Share product
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name || 'WENZY Streetwear',
          text: `Check out ${product?.name} on WENZY`,
          url: window.location.href,
        })
        return
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(window.location.href)
    setShareToast(true)
    setTimeout(() => setShareToast(false), 2500)
  }

  // Reviews calculations
  const totalReviews = reviews.length
  const avgRating = useMemo(() => {
    if (totalReviews === 0) return 5.0
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
    return Math.round((sum / totalReviews) * 100) / 100
  }, [reviews, totalReviews])

  const ratingCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviews.forEach((r) => {
      if (counts[r.rating as keyof typeof counts] !== undefined) {
        counts[r.rating as keyof typeof counts]++
      }
    })
    return counts
  }, [reviews])

  const mediaCount = useMemo(() => {
    return reviews.filter((r) => r.media_urls && r.media_urls.length > 0).length
  }, [reviews])

  // Filtered & Sorted Reviews
  const filteredReviews = useMemo(() => {
    let list = [...reviews]
    if (reviewFilter === 'media') {
      list = list.filter((r) => r.media_urls && r.media_urls.length > 0)
    } else if (typeof reviewFilter === 'number') {
      list = list.filter((r) => r.rating === reviewFilter)
    }

    if (reviewSort === 'highest') {
      list.sort((a, b) => b.rating - a.rating)
    } else if (reviewSort === 'lowest') {
      list.sort((a, b) => a.rating - b.rating)
    } else {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return list
  }, [reviews, reviewFilter, reviewSort])

  // Pagination for reviews (5 per page)
  const totalPages = Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE) || 1
  const paginatedReviews = useMemo(() => {
    const start = (reviewPage - 1) * REVIEWS_PER_PAGE
    return filteredReviews.slice(start, start + REVIEWS_PER_PAGE)
  }, [filteredReviews, reviewPage])

  // Video validation & preview handler
  const handleReviewMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setReviewError('')
    const newPreviews: { type: 'image' | 'video'; url: string; file: File }[] = []

    for (const file of files) {
      const isVideo = file.type.startsWith('video/')
      if (isVideo) {
        // 1. Max size: 20MB
        if (file.size > 20 * 1024 * 1024) {
          setReviewError('Video file exceeds 20MB limit. Please choose a smaller video clip.')
          continue
        }

        // 2. Max duration: 30 seconds
        const tempUrl = URL.createObjectURL(file)
        const videoEl = document.createElement('video')
        videoEl.preload = 'metadata'
        videoEl.src = tempUrl

        const duration = await new Promise<number>((resolve) => {
          videoEl.onloadedmetadata = () => resolve(videoEl.duration)
          videoEl.onerror = () => resolve(0)
        })

        if (duration > 30.5) {
          setReviewError(`Video duration is ${Math.round(duration)}s (exceeds 30 second limit). Please trim to under 30s.`)
          URL.revokeObjectURL(tempUrl)
          continue
        }

        newPreviews.push({ type: 'video', url: tempUrl, file })
      } else {
        // Image
        newPreviews.push({ type: 'image', url: URL.createObjectURL(file), file })
      }
    }

    setMediaPreviews((prev) => [...prev, ...newPreviews])
    setReviewForm((prev) => ({
      ...prev,
      media: [...prev.media, ...newPreviews.map((p) => p.file)],
    }))
    e.target.value = ''
  }

  const removeReviewMedia = (index: number) => {
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index))
    setReviewForm((prev) => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index),
    }))
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    if (!reviewForm.author_name.trim() || !reviewForm.content.trim()) {
      setReviewError('Please provide your name and review comments.')
      return
    }

    setReviewSubmitting(true)
    setReviewError('')
    try {
      // Upload media files
      const uploadedMedia: ReviewMediaItem[] = []
      for (const p of mediaPreviews) {
        try {
          const item = await uploadReviewMedia(p.file, p.type)
          uploadedMedia.push(item)
        } catch (uploadErr) {
          console.warn('Failed to upload media item:', uploadErr)
        }
      }

      const created = await submitProductReview({
        product_id: product.id,
        rating: reviewForm.rating,
        author_name: reviewForm.author_name.trim(),
        author_email: reviewForm.author_email.trim() || null,
        title: reviewForm.title.trim() || null,
        content: reviewForm.content.trim(),
        media_urls: uploadedMedia,
        is_verified_buyer: true,
        is_approved: true,
      })

      setReviews((prev) => [created, ...prev])
      setReviewSuccess(true)
      setTimeout(() => {
        setReviewSuccess(false)
        setReviewModalOpen(false)
        setReviewForm({
          rating: 5,
          author_name: '',
          author_email: '',
          title: '',
          content: '',
          media: [],
        })
        setMediaPreviews([])
      }, 1500)
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review.')
    } finally {
      setReviewSubmitting(false)
    }
  }

  const handleDeleteReview = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return
    try {
      await adminDeleteReview(id)
      setReviews((prev) => prev.filter((r) => r.id !== id))
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`)
    }
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
        color: selectedColorName || selectedVariant.color,
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
      {/* Toast Notification */}
      {shareToast && (
        <div className="fixed top-6 right-6 z-50 bg-black text-white px-4 py-2.5 rounded shadow-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Link copied to clipboard!</span>
        </div>
      )}

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
        {/* ============================================================== */}
        <div className="lg:col-span-7 w-full">
          {/* MOBILE VIEW (< lg): Horizontal swipe carousel with dots indicator */}
          <div className="block lg:hidden relative w-full">
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

            {/* Mobile Dots Indicator */}
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
                        isActive ? 'w-5 h-1.5 bg-neutral-900' : 'w-1.5 h-1.5 bg-neutral-300 hover:bg-neutral-500'
                      }`}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* DESKTOP VIEW (>= lg): Selectable thumbnails on left + Main primary image on right */}
          <div className="hidden lg:flex flex-row gap-4">
            {catalogImages.length > 1 && (
              <div className="flex flex-col gap-3 shrink-0 overflow-y-auto max-h-[85vh] scrollbar-none pr-1">
                {catalogImages.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    type="button"
                    onClick={() => setSelectedImage(img.image_url)}
                    className={`w-20 h-24 bg-neutral-100 rounded overflow-hidden border transition-all cursor-pointer ${
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

            {/* Main Single Display Image (Frame only, no hover scaling effect) */}
            <div className="flex-1 aspect-[3/4] bg-neutral-100 overflow-hidden rounded-md border border-neutral-200 relative">
              <img
                src={selectedImage || catalogImages[0]?.image_url || '/assets/wenzy_front_texture.png'}
                alt={product.name}
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: STICKY PURCHASING DETAILS (5 cols on lg)         */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 flex flex-col space-y-5 lg:sticky lg:top-24">
          {/* Product Header */}
          <div className="space-y-1.5">
            {/* Product Name (Reduced size slightly) */}
            <h1 className="font-heading font-black text-xl sm:text-2xl lg:text-3xl uppercase tracking-tight text-black leading-tight">
              {product.name}
            </h1>

            {/* Subsection Small Text Non-Bold (Optional by Admin) */}
            {product.details?.subtitle && (
              <p className="text-xs sm:text-sm text-neutral-500 font-normal leading-relaxed">
                {product.details.subtitle}
              </p>
            )}

            {/* Price Presentation (Reduced size, uses Rs not ₹ symbol) */}
            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-xl sm:text-2xl font-black text-black">
                Rs. {product.price.toLocaleString('en-IN')}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-sm text-neutral-400 line-through font-normal">
                    Rs. {product.compare_at_price!.toLocaleString('en-IN')}
                  </span>
                  <span className="badge-sale text-[10px] px-2 py-0.5">
                    SAVE {discountPercent}%
                  </span>
                </>
              )}
            </div>

            {/* Reviews summary with stars under price (smoothly scrolls to reviews) */}
            <button
              type="button"
              onClick={() => {
                document.getElementById('customer-reviews-section')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="flex items-center gap-1.5 pt-1 text-xs text-neutral-600 hover:text-black transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'
                    }`}
                  />
                ))}
              </div>
              <span className="font-bold text-black ml-0.5">{avgRating.toFixed(2)}</span>
              <span className="text-neutral-400 group-hover:underline">
                ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
              </span>
            </button>
          </div>

          <hr className="border-neutral-200" />

          {/* Color Selection (Matching Reference Image 3) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-neutral-500">Color</span>
              <span className="font-black text-black uppercase tracking-wider">{selectedColorName}</span>
            </div>

            <div className="flex items-center gap-3">
              {displayColorVariants.map((col, idx) => {
                const isSelected = col.name.toLowerCase() === selectedColorName.toLowerCase()
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectColor(col)}
                    title={col.name}
                    className={`relative w-7 h-7 rounded-full transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-black ring-offset-2'
                        : 'border border-neutral-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: col.hex }}
                    aria-label={`Select color ${col.name}`}
                  />
                )
              })}
            </div>
          </div>

          {/* Size Variant Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span>Select Size</span>
              <button
                type="button"
                onClick={() => {
                  setOpenAccordions((prev) => ({ ...prev, size_guide: true }))
                  document.getElementById('accordion-size-guide')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="text-neutral-500 hover:text-black underline underline-offset-4 cursor-pointer"
              >
                Size Chart
              </button>
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

            {/* Out of Stock Notice (In red colour; in-stock message removed) */}
            {selectedVariant && selectedVariant.stock_quantity <= 0 && (
              <div className="text-red-600 font-extrabold text-xs uppercase tracking-wider">
                Out of Stock
              </div>
            )}
          </div>

          {/* Quantity Selector, Add to Bag, and Share Button */}
          <div className="space-y-3 pt-1">
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
                className="btn-primary flex-1 h-12 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                {addedAnimation ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Added to Bag</span>
                  </>
                ) : isCurrentVariantInStock ? (
                  <span>
                    Add to Bag • Rs.{' '}
                    {((selectedVariant?.price_override || product.price) * quantity).toLocaleString('en-IN')}
                  </span>
                ) : (
                  <span>Out of Stock</span>
                )}
              </button>

              {/* Share Button with Share Icon */}
              <button
                type="button"
                onClick={handleShare}
                className="w-12 h-12 border border-neutral-300 hover:border-black rounded flex items-center justify-center text-neutral-700 hover:text-black transition-colors shrink-0"
                title="Share piece"
                aria-label="Share product"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Trust Guarantees (Removed by default; only rendered if configured by admin) */}
          {product.details?.trust_cards && product.details.trust_cards.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200 text-center text-[10px] font-bold uppercase tracking-wider text-neutral-600">
              {product.details.trust_cards.map((c, idx) => (
                <div key={idx} className="p-2 bg-neutral-50 border border-neutral-200 rounded">
                  <div className="font-bold text-black">{c.title}</div>
                  {c.subtitle && <div className="text-[9px] text-neutral-400">{c.subtitle}</div>}
                </div>
              ))}
            </div>
          )}

          {/* ============================================================== */}
          {/* ACCORDION SECTIONS (Matching Reference Image 1 in WENZY Theme) */}
          {/* ============================================================== */}
          <div className="space-y-2.5 pt-3">
            {/* 1. Description */}
            <div className="bg-neutral-900 text-white rounded-xl border border-neutral-800 overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleAccordion('description')}
                className="w-full p-4 flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider hover:bg-neutral-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-neutral-300" />
                  <span>Description</span>
                </div>
                {openAccordions.description ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
              {openAccordions.description && (
                <div className="px-4 pb-4 pt-1 text-xs text-neutral-300 leading-relaxed space-y-2.5 border-t border-neutral-800 animate-fade-in">
                  <p>{product.description}</p>
                  {product.details && (
                    <ul className="list-disc pl-4 space-y-1 text-neutral-400 text-[11px] pt-1">
                      {product.details.fabric && <li>Fabric: {product.details.fabric}</li>}
                      {product.details.gsm && <li>Weight: {product.details.gsm} GSM</li>}
                      {product.details.fit && <li>Cut & Silhouette: {product.details.fit}</li>}
                      {product.details.care && <li>Care: {product.details.care}</li>}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* 2. Size Guide (Small image section added by admin, scrollable, click to view) */}
            <div id="accordion-size-guide" className="bg-neutral-900 text-white rounded-xl border border-neutral-800 overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleAccordion('size_guide')}
                className="w-full p-4 flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider hover:bg-neutral-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Ruler className="w-4 h-4 text-neutral-300" />
                  <span>Size Guide</span>
                </div>
                {openAccordions.size_guide ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
              {openAccordions.size_guide && (
                <div className="px-4 pb-4 pt-2 text-xs text-neutral-300 space-y-3 border-t border-neutral-800 animate-fade-in">
                  <p className="text-[11px] text-neutral-400">
                    Oversized boxy cut. Tap the size guide chart to open and inspect in full detail.
                  </p>
                  <div
                    onClick={() =>
                      setLightboxItem({
                        type: 'image',
                        url: product.details?.size_guide_image || '/assets/size_guide.svg',
                      })
                    }
                    className="relative rounded-lg overflow-hidden border border-neutral-700 bg-neutral-950 cursor-zoom-in group max-w-sm"
                  >
                    <img
                      src={product.details?.size_guide_image || '/assets/size_guide.svg'}
                      alt="Size Guide Chart"
                      className="w-full h-auto object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white gap-1.5 text-[11px] font-bold uppercase tracking-wider pointer-events-none">
                      <Maximize2 className="w-4 h-4" />
                      <span>Click to Enlarge</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Return Policy */}
            <div className="bg-neutral-900 text-white rounded-xl border border-neutral-800 overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleAccordion('return_policy')}
                className="w-full p-4 flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider hover:bg-neutral-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-neutral-300" />
                  <span>Return Policy</span>
                </div>
                {openAccordions.return_policy ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
              {openAccordions.return_policy && (
                <div className="px-4 pb-4 pt-1 text-xs text-neutral-300 leading-relaxed border-t border-neutral-800 animate-fade-in">
                  <p>
                    {product.details?.return_policy ||
                      '7-day hassle-free exchange on unworn, unwashed streetwear pieces with original brand tags and packaging intact. Contact support@wenzy.store for instant reverse pickup scheduling.'}
                  </p>
                </div>
              )}
            </div>

            {/* 4. Shipping Information */}
            <div className="bg-neutral-900 text-white rounded-xl border border-neutral-800 overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleAccordion('shipping_info')}
                className="w-full p-4 flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider hover:bg-neutral-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Truck className="w-4 h-4 text-neutral-300" />
                  <span>Shipping Information</span>
                </div>
                {openAccordions.shipping_info ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
              {openAccordions.shipping_info && (
                <div className="px-4 pb-4 pt-1 text-xs text-neutral-300 leading-relaxed border-t border-neutral-800 animate-fade-in">
                  <p>
                    {product.details?.shipping_info ||
                      'Orders processed & dispatched within 24–48 hours from our Mumbai facility. Express delivery to metro hubs in 2–4 business days; rest of India in 4–6 business days with live SMS tracking.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. CUSTOMER REVIEWS SECTION (Matching Reference Image 4)       */}
      {/* ============================================================== */}
      <section id="customer-reviews-section" className="mt-20 pt-12 border-t border-neutral-200">
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="font-heading font-black text-2xl sm:text-3xl uppercase tracking-tight text-black">
              Customer Reviews
            </h2>
          </div>

          {/* Breakdown Header Card (Matches Image 4 Layout) */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center shadow-xs">
            {/* Col 1: Average Score & Count */}
            <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left space-y-1.5 md:border-r md:border-neutral-200 md:pr-6">
              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'
                    }`}
                  />
                ))}
                <span className="font-black text-black text-base ml-2">{avgRating.toFixed(2)} out of 5</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-semibold">
                <span>Based on {totalReviews} reviews</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
              </div>
            </div>

            {/* Col 2: Star Breakdown Progress Bars */}
            <div className="md:col-span-5 space-y-2 md:border-r md:border-neutral-200 md:pr-6">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = ratingCounts[stars as keyof typeof ratingCounts] || 0
                const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0
                return (
                  <div key={stars} className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-0.5 text-amber-400 w-20 shrink-0">
                      {Array.from({ length: 5 }).map((_, sIdx) => (
                        <Star
                          key={sIdx}
                          className={`w-3 h-3 ${sIdx < stars ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'}`}
                        />
                      ))}
                    </div>
                    {/* Bar */}
                    <div className="flex-1 h-3 bg-neutral-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-neutral-900 transition-all duration-500 rounded"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono text-[11px] text-neutral-500">{count}</span>
                  </div>
                )
              })}
            </div>

            {/* Col 3: Write a Review CTA Button */}
            <div className="md:col-span-3 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setReviewModalOpen(true)}
                className="w-full md:w-auto px-8 py-3.5 bg-black text-white rounded font-bold uppercase tracking-wider text-xs hover:bg-neutral-800 transition-colors shadow-xs"
              >
                Write a review
              </button>
            </div>
          </div>

          {/* Filter Pills and Sort Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => {
                  setReviewFilter('all')
                  setReviewPage(1)
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  reviewFilter === 'all'
                    ? 'bg-black text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                All ({reviews.length})
              </button>
              {mediaCount > 0 && (
                <button
                  onClick={() => {
                    setReviewFilter('media')
                    setReviewPage(1)
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    reviewFilter === 'media'
                      ? 'bg-black text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  With Photos & Videos ({mediaCount})
                </button>
              )}
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = ratingCounts[stars as keyof typeof ratingCounts] || 0
                if (count === 0) return null
                return (
                  <button
                    key={stars}
                    onClick={() => {
                      setReviewFilter(stars)
                      setReviewPage(1)
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      reviewFilter === stars
                        ? 'bg-black text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {stars}★ ({count})
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Sort:</span>
              <select
                value={reviewSort}
                onChange={(e) => setReviewSort(e.target.value as any)}
                className="text-xs font-bold border border-neutral-300 rounded px-2.5 py-1.5 bg-white cursor-pointer focus:outline-hidden"
              >
                <option value="newest">Most Recent</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>
          </div>

          {/* Paginated Reviews List (5 per page) */}
          <div className="space-y-4">
            {reviewsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-black" />
                <span className="text-xs text-neutral-400">Loading reviews...</span>
              </div>
            ) : paginatedReviews.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 rounded-lg border border-neutral-200 text-neutral-500 text-xs">
                No customer reviews match this filter. Be the first to write a review!
              </div>
            ) : (
              paginatedReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white p-5 sm:p-6 rounded-lg border border-neutral-200 space-y-3 transition-all hover:border-neutral-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="font-black text-black text-xs uppercase">{rev.author_name}</span>
                        {rev.is_verified_buyer && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Verified Buyer
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-neutral-400">
                        {new Date(rev.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>

                      {/* Admin Quick Delete Option */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(rev.id)}
                          className="text-neutral-400 hover:text-red-600 p-1 transition-colors"
                          title="Delete review (Admin)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {rev.title && <div className="font-bold text-black text-sm">{rev.title}</div>}
                  <p className="text-xs text-neutral-600 leading-relaxed">{rev.content}</p>

                  {/* Review Media (Photos & Videos with play/zoom modal) */}
                  {rev.media_urls && rev.media_urls.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 pt-2">
                      {rev.media_urls.map((m, mIdx) => (
                        <button
                          key={mIdx}
                          type="button"
                          onClick={() => setLightboxItem(m)}
                          className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 group cursor-pointer"
                        >
                          {m.type === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center bg-black/85 text-white">
                              <Play className="w-5 h-5 fill-white text-white group-hover:scale-110 transition-transform" />
                              <span className="absolute bottom-1 right-1 text-[9px] bg-black/80 px-1 rounded text-white font-mono">
                                0:30
                              </span>
                            </div>
                          ) : (
                            <img
                              src={m.url}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls (If more than 5, separated like 1, 2, 3) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-4">
              <button
                type="button"
                disabled={reviewPage === 1}
                onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs font-bold border border-neutral-300 rounded disabled:opacity-30 hover:border-black cursor-pointer"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNumber = idx + 1
                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setReviewPage(pageNumber)}
                    className={`w-8 h-8 rounded text-xs font-bold transition-all cursor-pointer ${
                      reviewPage === pageNumber
                        ? 'bg-black text-white'
                        : 'border border-neutral-300 text-neutral-700 hover:border-black'
                    }`}
                  >
                    {pageNumber}
                  </button>
                )
              })}
              <button
                type="button"
                disabled={reviewPage === totalPages}
                onClick={() => setReviewPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 text-xs font-bold border border-neutral-300 rounded disabled:opacity-30 hover:border-black cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. UNDER REVIEW SECTION: "YOU MAY LIKE" (Customizable by admin) */}
      {/* ============================================================== */}
      {relatedProducts.length > 0 && (
        <section className="mt-20 pt-12 border-t border-neutral-200">
          <div className="mb-8">
            <h2 className="font-heading font-black text-xl sm:text-2xl uppercase tracking-tight text-black">
              {product.details?.related_products_title || 'YOU MAY LIKE'}
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.slice(0, 4).map((p) => {
              const primaryImg =
                p.images?.find((img) => img.is_primary)?.image_url ||
                p.images?.[0]?.image_url ||
                '/assets/wenzy_front_texture.png'
              return (
                <Link
                  key={p.id}
                  to={`/product/${p.slug}`}
                  className="group flex flex-col bg-white overflow-hidden rounded-md border border-neutral-200 hover:border-black/40 transition-all duration-300"
                >
                  <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                    <img
                      src={primaryImg}
                      alt={p.name}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <div className="text-[10px] text-neutral-400 uppercase font-semibold">
                      {p.category?.name || 'Streetwear'}
                    </div>
                    <div className="font-black text-black uppercase text-xs truncate">{p.name}</div>
                    <div className="font-black text-black text-xs sm:text-sm pt-1 mt-auto">
                      Rs. {p.price.toLocaleString('en-IN')}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Sticky Bottom Purchase Bar */}
      {showStickyBar && isCurrentVariantInStock && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-neutral-200 py-3 px-4 shadow-xl animate-fade-in">
          <div className="wrap flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={selectedImage || catalogImages[0]?.image_url}
                alt={product.name}
                className="w-10 h-10 object-cover bg-neutral-100 border border-neutral-200 shrink-0 rounded"
              />
              <div className="truncate">
                <div className="text-xs font-bold uppercase truncate">{product.name}</div>
                <div className="text-[11px] text-neutral-500 font-extrabold">
                  Rs. {product.price.toLocaleString('en-IN')} • Size: {selectedVariant?.size}
                </div>
              </div>
            </div>

            <button onClick={handleAddToCart} className="btn-primary py-2.5 px-6 shrink-0 text-xs">
              Add to Bag
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* WRITE A REVIEW MODAL                                           */}
      {/* ============================================================== */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-neutral-300 w-full max-w-lg my-8 overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <div>
                <h3 className="text-sm font-heading font-black uppercase tracking-wider text-black">
                  Write A Customer Review
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">{product.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-6 space-y-4">
              {reviewSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <div className="text-sm font-black uppercase tracking-wider text-black">Review Published!</div>
                  <div className="text-xs text-neutral-500">Thank you for sharing your experience.</div>
                </div>
              ) : (
                <>
                  {reviewError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded font-medium">
                      {reviewError}
                    </div>
                  )}

                  {/* Rating Selector */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Overall Rating *
                    </label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewForm((prev) => ({ ...prev, rating: star }))}
                          className="p-1 cursor-pointer focus:outline-hidden"
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              star <= reviewForm.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-neutral-300 hover:text-amber-300'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-xs font-bold text-neutral-700">
                        {reviewForm.rating} of 5 Stars
                      </span>
                    </div>
                  </div>

                  {/* Name and Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={reviewForm.author_name}
                        onChange={(e) => setReviewForm((prev) => ({ ...prev, author_name: e.target.value }))}
                        placeholder="e.g. Siddharth M."
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:border-black focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        value={reviewForm.author_email}
                        onChange={(e) => setReviewForm((prev) => ({ ...prev, author_email: e.target.value }))}
                        placeholder="e.g. sid@example.com"
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:border-black focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Review Title */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Review Title
                    </label>
                    <input
                      type="text"
                      value={reviewForm.title}
                      onChange={(e) => setReviewForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Top tier heavyweight streetwear!"
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:border-black focus:outline-hidden"
                    />
                  </div>

                  {/* Review Body */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Your Review *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={reviewForm.content}
                      onChange={(e) => setReviewForm((prev) => ({ ...prev, content: e.target.value }))}
                      placeholder="Share your thoughts on fit, fabric weight, print durability, and sizing..."
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:border-black focus:outline-hidden"
                    />
                  </div>

                  {/* Media Upload: Photo & Short Video (max 30s) */}
                  <div className="space-y-2 pt-2 border-t border-neutral-200">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                        Attach Photos or Videos (Max 30s)
                      </label>
                      <span className="text-[10px] text-neutral-400">Video limit: 30 seconds &lt; 20MB</span>
                    </div>

                    <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded cursor-pointer border border-neutral-300 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Photos / Videos</span>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleReviewMediaChange}
                        className="hidden"
                      />
                    </label>

                    {mediaPreviews.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {mediaPreviews.map((m, idx) => (
                          <div
                            key={idx}
                            className="relative w-16 h-16 rounded border border-neutral-200 overflow-hidden bg-neutral-100 shrink-0"
                          >
                            {m.type === 'video' ? (
                              <div className="w-full h-full flex items-center justify-center bg-black/85 text-white">
                                <Play className="w-4 h-4 fill-white" />
                              </div>
                            ) : (
                              <img src={m.url} alt="" className="w-full h-full object-cover" />
                            )}
                            <button
                              type="button"
                              onClick={() => removeReviewMedia(idx)}
                              className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs cursor-pointer"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-200">
                    <button
                      type="button"
                      onClick={() => setReviewModalOpen(false)}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-black cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={reviewSubmitting}
                      className="btn-primary py-2.5 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                    >
                      {reviewSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{reviewSubmitting ? 'Submitting...' : 'Submit Review'}</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MEDIA / SIZE GUIDE LIGHTBOX MODAL                              */}
      {/* ============================================================== */}
      {lightboxItem && (
        <div
          onClick={() => setLightboxItem(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-fade-in"
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-neutral-950 rounded-xl overflow-hidden shadow-2xl p-2 border border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxItem(null)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {lightboxItem.type === 'video' ? (
              <video
                src={lightboxItem.url}
                controls
                autoPlay
                className="max-w-full max-h-[82vh] rounded"
              />
            ) : (
              <img
                src={lightboxItem.url}
                alt="Enlarged preview"
                className="max-w-full max-h-[82vh] object-contain rounded"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
