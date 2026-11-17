import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useCart } from '../context/CartContext'
import type { Product } from '../types/database'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Sort images: primary first, then secondary
  const primaryImg = product.images?.find((img) => img.is_primary)?.image_url || product.images?.[0]?.image_url || '/assets/wenzy_front_texture.png'
  const secondaryImg = product.images?.[1]?.image_url || primaryImg

  // Calculate discount percentage if compare_at_price exists
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0

  // Calculate total stock
  const totalStock = product.variants?.reduce((sum, v) => sum + v.stock_quantity, 0) ?? 0
  const isSoldOut = totalStock <= 0

  const handleQuickAdd = (e: React.MouseEvent, variantId: string, size: string, color: string, stock: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (stock <= 0) return

    addItem({
      productId: product.id,
      variantId,
      name: product.name,
      slug: product.slug,
      size,
      color,
      price: product.price,
      compareAtPrice: product.compare_at_price,
      maxStock: stock,
      image: primaryImg,
    })
    setShowQuickAdd(false)
  }

  return (
    <div
      className="group relative flex flex-col bg-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setShowQuickAdd(false)
      }}
    >
      {/* 1. Image Viewport (1:1 Square Ratio) */}
      <Link to={`/product/${product.slug}`} className="relative block aspect-square w-full overflow-hidden bg-neutral-100">
        {/* Primary Image */}
        <img
          src={primaryImg}
          alt={product.name}
          className={`h-full w-full object-cover object-center transition-all duration-500 ${
            isHovered && secondaryImg !== primaryImg ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
          }`}
          loading="lazy"
        />

        {/* Secondary Image (Flipped on Hover) */}
        {secondaryImg !== primaryImg && (
          <img
            src={secondaryImg}
            alt={`${product.name} alternate view`}
            className={`absolute inset-0 h-full w-full object-cover object-center transition-all duration-500 ${
              isHovered ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
            }`}
            loading="lazy"
          />
        )}

        {/* Badges Container */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {hasDiscount && (
            <span className="badge-sale">
              {discountPercent}% OFF
            </span>
          )}
          {product.is_new && !hasDiscount && (
            <span className="inline-flex items-center rounded-sm bg-neutral-900 px-2 py-0.5 font-accent text-[11px] font-bold tracking-wider text-white">
              NEW DROP
            </span>
          )}
          {isSoldOut && (
            <span className="inline-flex items-center rounded-sm bg-neutral-400 px-2 py-0.5 font-accent text-[11px] font-bold tracking-wider text-white">
              SOLD OUT
            </span>
          )}
        </div>

        {/* Quick Add Overlay Trigger */}
        {!isSoldOut && (
          <div className="absolute bottom-0 inset-x-0 p-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {!showQuickAdd ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowQuickAdd(true)
                }}
                className="w-full bg-black text-white text-xs font-bold uppercase tracking-[0.16em] py-3 flex items-center justify-center gap-1.5 hover:bg-neutral-800 transition-colors shadow-lg active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                Quick Add
              </button>
            ) : (
              <div
                className="w-full bg-white p-2.5 shadow-xl border border-neutral-200 animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2 text-center">
                  Select Size
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {product.variants && product.variants.length > 0 ? (
                    product.variants.map((v) => {
                      const out = v.stock_quantity <= 0
                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={out}
                          onClick={(e) => handleQuickAdd(e, v.id, v.size, v.color, v.stock_quantity)}
                          className={`min-w-8 h-8 px-2 text-xs font-bold border transition-all ${
                            out
                              ? 'border-neutral-200 text-neutral-300 line-through cursor-not-allowed'
                              : 'border-black hover:bg-black hover:text-white active:scale-95'
                          }`}
                        >
                          {v.size}
                        </button>
                      )
                    })
                  ) : (
                    <div className="text-xs text-neutral-500">Standard Fit</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Link>

      {/* 2. Product Meta Details */}
      <div className="pt-3 pb-2 flex flex-col space-y-1">
        <Link
          to={`/product/${product.slug}`}
          className="text-xs font-bold uppercase tracking-[0.14em] text-black hover:opacity-70 transition-opacity line-clamp-1"
        >
          {product.name}
        </Link>

        {/* Pricing Block */}
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-sm font-extrabold text-black tracking-tight">
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          {hasDiscount && (
            <span className="text-xs text-neutral-400 line-through tracking-tight">
              ₹{product.compare_at_price!.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
