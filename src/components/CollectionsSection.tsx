import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { getCollections, getProducts } from '../lib/storeApi'
import type { Collection, Product } from '../types/database'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getProductImages(product: Product): { primary: string; secondary: string } {
  const imgs = product.images || []
  const primaryObj = imgs.find((i) => i.is_primary)
  const standardImgs = imgs.filter((i) => !i.view_type || i.view_type === 'standard')
  
  const primary = primaryObj?.image_url || standardImgs[0]?.image_url || imgs[0]?.image_url || ''
  
  // Secondary image (hover alternate view):
  // 1. Look for second standard image
  // 2. Or back view cutout/image if available
  // 3. Or second image in array
  let secondary = ''
  const remainingStandard = standardImgs.filter((i) => i.image_url !== primary)
  if (remainingStandard.length > 0) {
    secondary = remainingStandard[0].image_url
  } else {
    const backImg = imgs.find((i) => i.view_type === 'back' && i.image_url !== primary)
    if (backImg) {
      secondary = backImg.image_url
    } else {
      const otherImg = imgs.find((i) => i.image_url !== primary)
      if (otherImg) secondary = otherImg.image_url
    }
  }

  return { primary, secondary: secondary || primary }
}

function formatFit(fitStr?: string | null): string {
  if (!fitStr) return 'OVERSIZED FIT'
  const cleaned = fitStr.toUpperCase().trim()
  if (cleaned.includes('OVERSIZED')) return 'OVERSIZED FIT'
  if (cleaned.includes('RELAXED')) return 'RELAXED FIT'
  if (cleaned.includes('REGULAR')) return 'REGULAR FIT'
  if (cleaned.includes('BOXY')) return 'BOXY FIT'
  return cleaned
}

function formatFabric(product: Product): string {
  const fabric = product.details?.fabric
  const gsm = product.details?.gsm
  if (gsm && gsm >= 240) return `${gsm} GSM HEAVYWEIGHT`
  if (fabric) {
    if (fabric.toLowerCase().includes('french terry')) return 'HEAVY FRENCH TERRY'
    if (fabric.toLowerCase().includes('linen')) return 'LINEN BLEND'
    if (fabric.toLowerCase().includes('fleece')) return 'PREMIUM FLEECE'
    return fabric.toUpperCase()
  }
  return 'PREMIUM HEAVY GAUGE'
}

// ─── Unique Streetwear E-Commerce Product Card ────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const { primary: primaryImg, secondary: secondaryImg } = getProductImages(product)
  const fitBadge = formatFit(product.details?.fit)
  const fabricBadge = formatFabric(product)
  const [wishlisted, setWishlisted] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const hasSecondary = Boolean(secondaryImg && secondaryImg !== primaryImg)

  return (
    <Link
      to={`/product/${product.slug}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group flex flex-col bg-white overflow-hidden rounded-md border border-neutral-200/90 hover:border-black/40 transition-all duration-300 hover:shadow-md"
    >
      {/* 1. Image Frame (Fixed 3:4 portrait ratio matching Reference Frame) */}
      <div className="relative w-full aspect-[3/4] bg-neutral-100 overflow-hidden">
        {primaryImg ? (
          <>
            {/* Primary Image */}
            <img
              src={primaryImg}
              alt={product.name}
              className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-500 ease-out ${
                isHovered && hasSecondary ? 'opacity-0 scale-105' : 'opacity-100 scale-100 group-hover:scale-105'
              }`}
              loading="lazy"
            />
            {/* Secondary Image (Smooth Transition on Hover, matching Normless report) */}
            {hasSecondary && (
              <img
                src={secondaryImg}
                alt={`${product.name} alternate view`}
                className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-500 ease-out ${
                  isHovered ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
                }`}
                loading="lazy"
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-300 text-xs font-mono">
            NO IMAGE
          </div>
        )}

        {/* Wishlist Heart Icon (Top-Right) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setWishlisted((v) => !v)
          }}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 shadow-xs ${
            wishlisted
              ? 'bg-black text-white'
              : 'bg-white/80 backdrop-blur-xs text-neutral-600 hover:text-black hover:bg-white'
          }`}
          aria-label="Wishlist"
        >
          <Heart className={`w-3.5 h-3.5 ${wishlisted ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* 2. Product Information Details */}
      <div className="p-3 flex flex-col gap-1 flex-1 bg-white">
        {/* Category name */}
        <div className="text-[10px] sm:text-[11px] text-neutral-400 uppercase tracking-wider font-semibold truncate">
          {product.category?.name || 'Streetwear'}
        </div>

        {/* Product Name (Bold, Black, Uppercase) */}
        <div className="font-black text-black uppercase text-xs sm:text-sm leading-tight tracking-tight line-clamp-1">
          {product.name}
        </div>

        {/* Price Row: Unique Streetwear Tag with Bold Actual Price + Non-Bold Compare Price */}
        <div className="flex items-center gap-2 pt-1 mt-auto flex-wrap">
          <div className="inline-flex items-baseline gap-1 bg-gradient-to-r from-purple-100/90 via-pink-50/80 to-purple-50/50 border border-purple-200/60 px-2 py-0.5 rounded text-[11px] sm:text-xs">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-neutral-600 tracking-wider">
              Price
            </span>
            <span className="font-black text-black text-xs sm:text-sm">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
          </div>

          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-neutral-400 text-xs line-through font-normal">
              ₹{product.compare_at_price.toLocaleString('en-IN')}
            </span>
          )}

          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-[10px] font-extrabold text-emerald-600 ml-auto">
              {Math.round((1 - product.price / product.compare_at_price) * 100)}% off
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ─── Main Section Component ───────────────────────────────────────────────────

export default function CollectionsSection() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [activeTab, setActiveTab] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const init = async () => {
      try {
        const [cols, prods] = await Promise.all([
          getCollections(true),
          getProducts(),
        ])
        if (!mounted) return
        setCollections(cols)
        setAllProducts(prods)
        // Select first active collection by default
        if (cols.length > 0) {
          setActiveTab(cols[0].id)
        } else {
          setActiveTab('trending')
        }
      } catch (err) {
        console.error('CollectionsSection load error', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    init()
    return () => {
      mounted = false
    }
  }, [])

  // Helper to get products for a specific collection
  const getProductsForCollection = (col: Collection) => {
    const filtered = allProducts.filter((p) => p.collection_id === col.id)
    if (filtered.length === 0 && (col.slug === 'trending' || col.slug === 'trend')) {
      const featured = allProducts.filter((p) => p.is_featured || p.is_new)
      return featured.length > 0 ? featured : allProducts.slice(0, 8)
    }
    return filtered
  }

  // Filter products by currently active collection tab
  const displayProducts = useMemo(() => {
    if (!activeTab) return allProducts.slice(0, 8)

    // Check if selected tab is a collection
    const activeCol = collections.find((c) => c.id === activeTab)
    if (activeCol) {
      return getProductsForCollection(activeCol)
    }

    if (activeTab === 'trending') {
      const featured = allProducts.filter((p) => p.is_featured || p.is_new)
      return featured.length > 0 ? featured : allProducts.slice(0, 8)
    }

    return allProducts.slice(0, 8)
  }, [activeTab, collections, allProducts])

  // Remaining collections not currently selected (preserving admin ordering)
  const otherCollections = useMemo(() => {
    return collections.filter((c) => c.id !== activeTab && c.slug !== activeTab)
  }, [collections, activeTab])

  // Don't render empty section
  if (!loading && collections.length === 0 && allProducts.length === 0) return null

  return (
    <section className="py-12 md:py-16 bg-white border-t border-neutral-200">
      <div className="wrap">
        {/* Section Heading */}
        <div id="collections-section-header" className="mb-6 md:mb-8 scroll-mt-24">
          <h2 className="font-heading font-black text-2xl md:text-3xl uppercase tracking-tight text-black">
            Collections
          </h2>
          <div className="w-12 h-0.5 bg-black mt-2" />
        </div>

        {/* Filter Tabs (Horizontal scrolling on mobile matching Reference) */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none items-center">
          {collections.length > 0 ? (
            collections.map((col) => {
              const isActive = activeTab === col.id
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveTab(col.id)}
                  className={`flex-shrink-0 px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-md border transition-all duration-150 ${
                    isActive
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                      : 'bg-white text-neutral-800 border-neutral-300 hover:border-black hover:text-black'
                  }`}
                >
                  {col.name}
                </button>
              )
            })
          ) : (
            <button
              onClick={() => setActiveTab('trending')}
              className="flex-shrink-0 px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-md border bg-neutral-900 text-white border-neutral-900"
            >
              Trending
            </button>
          )}
        </div>

        {/* Product Grid: 2-column on mobile (image 3) & 4-column on desktop (image 1) */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-neutral-100 aspect-[3/4] rounded-md" />
            ))}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-500">
              No products in this collection yet
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">
              Assign pieces to this collection in the Admin Product Manager.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* OTHER COLLECTIONS (Displayed after selected collection's products in admin order) */}
        {!loading && otherCollections.length > 0 && (
          <div className="mt-14 md:mt-20 pt-10 md:pt-14 border-t border-neutral-200">
            {/* Section Heading: OTHER COLLECTIONS */}
            <div className="mb-8 md:mb-10">
              <h2 className="font-heading font-black text-2xl md:text-3xl uppercase tracking-tight text-black">
                Other Collections
              </h2>
              <div className="w-12 h-0.5 bg-black mt-2" />
            </div>

            {/* Remaining collections rendered in exact admin order */}
            <div className="space-y-12 md:space-y-16">
              {otherCollections.map((col) => {
                const colProducts = getProductsForCollection(col)
                return (
                  <div key={col.id} className="space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
                      <div className="flex items-center gap-3">
                        <h3 className="font-heading font-black text-base sm:text-lg uppercase tracking-wider text-black">
                          {col.name}
                        </h3>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                          ({colProducts.length} {colProducts.length === 1 ? 'piece' : 'pieces'})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab(col.id)
                          document.getElementById('collections-section-header')?.scrollIntoView({ behavior: 'smooth' })
                        }}
                        className="text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-black transition-colors cursor-pointer"
                      >
                        View In Tabs ↑
                      </button>
                    </div>

                    {colProducts.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                        {colProducts.map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 px-4 text-center bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                        <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                          No products in this collection yet
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
