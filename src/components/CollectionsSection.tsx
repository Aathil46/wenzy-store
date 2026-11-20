import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { getCollections, getProducts } from '../lib/storeApi'
import type { Collection, Product } from '../types/database'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPrimaryImage(product: Product): string {
  const imgs = product.images || []
  const primary = imgs.find((i) => i.is_primary)
  const standard = imgs.find((i) => !i.view_type || i.view_type === 'standard')
  return primary?.image_url || standard?.image_url || imgs[0]?.image_url || ''
}

function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

function getFitBadge(product: Product): string | null {
  return product.details?.fit || null
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const imgUrl = getPrimaryImage(product)
  const fit = getFitBadge(product)
  const [wishlisted, setWishlisted] = useState(false)

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group flex flex-col bg-white overflow-hidden rounded-sm border border-neutral-100 hover:border-neutral-300 transition-all duration-200 hover:shadow-md"
    >
      {/* Image frame — aspect 3:4 */}
      <div className="relative w-full aspect-[3/4] bg-neutral-100 overflow-hidden">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-300 text-xs font-mono">
            NO IMAGE
          </div>
        )}

        {/* Fit badge */}
        {fit && (
          <div className="absolute top-2 left-2 bg-black/80 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 leading-none">
            {fit}
          </div>
        )}

        {/* Wishlist icon */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setWishlisted((v) => !v)
          }}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
            wishlisted
              ? 'bg-black text-white'
              : 'bg-white/80 text-neutral-500 hover:text-black hover:bg-white'
          } shadow-sm`}
          aria-label="Wishlist"
        >
          <Heart className={`w-3.5 h-3.5 ${wishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* New badge */}
        {product.is_new && (
          <div className="absolute bottom-2 left-2 bg-white text-black text-[9px] font-black uppercase tracking-widest px-2 py-1 leading-none border border-neutral-200">
            NEW
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        {/* Category name */}
        {product.category?.name && (
          <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium leading-none">
            {product.category.name}
          </div>
        )}

        {/* Product name */}
        <div className="font-black text-black uppercase text-[13px] leading-tight tracking-tight line-clamp-2">
          {product.name}
        </div>

        {/* Pricing */}
        <div className="flex items-baseline gap-2 mt-auto pt-1">
          <span className="font-black text-black text-sm">{formatPrice(product.price)}</span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-neutral-400 text-xs line-through font-normal">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-xs font-bold text-emerald-600 ml-auto">
              {Math.round((1 - product.price / product.compare_at_price) * 100)}% off
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ─── Main Section ─────────────────────────────────────────────────────────────

type TabKey = 'trending' | string

export default function CollectionsSection() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('trending')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const [cols, prods] = await Promise.all([
          getCollections(true),
          getProducts(),
        ])
        setCollections(cols)
        setAllProducts(prods)
      } catch (err) {
        console.error('CollectionsSection load error', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const visibleProducts = useCallback((): Product[] => {
    if (activeTab === 'trending') {
      // "Trending" shows all featured or new products
      const featured = allProducts.filter((p) => p.is_featured || p.is_new)
      return featured.length > 0 ? featured : allProducts.slice(0, 8)
    }
    return allProducts.filter((p) => p.collection_id === activeTab)
  }, [activeTab, allProducts])

  // Don't render if no data at all
  if (!loading && collections.length === 0 && allProducts.length === 0) return null

  const displayProducts = visibleProducts()

  return (
    <section className="py-14 md:py-20 bg-white">
      <div className="wrap">
        {/* Section heading */}
        <div className="mb-8 md:mb-10">
          <h2 className="font-heading font-black text-2xl md:text-3xl uppercase tracking-tight text-black">
            Shop the Edit
          </h2>
          <div className="w-12 h-0.5 bg-black mt-2" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-none">
          {/* Trending tab always first */}
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex-shrink-0 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-full border transition-all duration-150 ${
              activeTab === 'trending'
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-neutral-300 hover:border-black'
            }`}
          >
            Trending
          </button>

          {/* Dynamic collection tabs */}
          {collections.map((col) => (
            <button
              key={col.id}
              onClick={() => setActiveTab(col.id)}
              className={`flex-shrink-0 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-full border transition-all duration-150 ${
                activeTab === col.id
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-neutral-300 hover:border-black'
              }`}
            >
              {col.name}
            </button>
          ))}
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-neutral-100 aspect-[3/4] rounded-sm" />
            ))}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <p className="text-sm font-medium">No products in this collection yet.</p>
            <p className="text-xs mt-1">The admin can assign products to collections via the product editor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
