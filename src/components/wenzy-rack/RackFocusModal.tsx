import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, ShoppingBag, ArrowRight, ShieldCheck, Check } from 'lucide-react'
import type { Product, ProductVariant } from '../../types/database'
import { useCart } from '../../context/CartContext'

interface RackFocusModalProps {
  isOpen: boolean
  product: Product | null
  onClose: () => void
}

/**
 * Focused close-up modal (.sr-focus) for WENZY RACK.
 * Features:
 * - Frosted blur background backdrop (blur(24px))
 * - Central isolated garment with smooth 3D CSS rotateY(180deg) card flip between Front and Back views
 * - Size selector pills, real stock validation, and instant Add to Bag checkout via CartContext
 */
export default function RackFocusModal({ isOpen, product, onClose }: RackFocusModalProps) {
  const { addItem } = useCart()
  const [activeAngle, setActiveAngle] = useState<'front' | 'back'>('front')
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [addedAnimation, setAddedAnimation] = useState(false)

  // Reset angle and selected variant whenever a new product is opened
  useEffect(() => {
    if (product) {
      setActiveAngle('front')
      setAddedAnimation(false)
      const variants = product.variants || []
      const firstInStock = variants.find((v) => v.stock_quantity > 0) || variants[0] || null
      setSelectedVariant(firstInStock)
    }
  }, [product])

  // Escape key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !product) return null

  // Extract mandatory front & back images
  const frontImage = product.images?.find((img) => img.view_type === 'front')?.image_url || ''
  const backImage = product.images?.find((img) => img.view_type === 'back')?.image_url || ''
  const sideImage = product.images?.find((img) => img.view_type === 'side')?.image_url || ''

  const price = selectedVariant?.price_override ?? product.price
  const isOutOfStock = !selectedVariant || selectedVariant.stock_quantity <= 0

  const handleAddToCart = () => {
    if (!selectedVariant || isOutOfStock) return

    addItem(
      {
        productId: product.id,
        variantId: selectedVariant.id,
        name: product.name,
        slug: product.slug,
        size: selectedVariant.size,
        color: selectedVariant.color || 'Black',
        price,
        compareAtPrice: product.compare_at_price,
        maxStock: selectedVariant.stock_quantity,
        image: frontImage || sideImage || '/assets/wenzy_front_texture.png',
      },
      1
    )

    setAddedAnimation(true)
    setTimeout(() => {
      setAddedAnimation(false)
    }, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 1. Frosted Glass Backdrop Blur */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-xl transition-opacity animate-in fade-in duration-300"
      />

      {/* 2. Modal Content Container */}
      <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="relative w-full max-w-5xl bg-neutral-950 border border-neutral-800 text-white shadow-2xl overflow-hidden rounded-xs">
          {/* Top Bar with Brand & Close Button */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                WENZY RACK // INSPECT PIECE
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors rounded-xs"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Modal Body: Garment 3D Flip (Left) & Shopping HUD (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 sm:p-8 md:p-10">
            {/* LEFT / CENTER: 3D Garment Stage */}
            <div className="md:col-span-7 flex flex-col items-center justify-center space-y-5">
              {/* Garment 3D Flip Card Container with perspective */}
              <div
                className="relative w-full max-w-[380px] sm:max-w-[420px] aspect-3/4 flex items-center justify-center"
                style={{ perspective: '1400px' }}
              >
                {/* Flipping Inner Container */}
                <div
                  className="relative w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: activeAngle === 'back' ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  {/* FRONT FACE */}
                  <div
                    className="absolute inset-0 w-full h-full flex flex-col items-center justify-center"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                    }}
                  >
                    {/* Wooden Hanger SVG Header */}
                    <div className="w-36 sm:w-44 h-12 -mb-2 z-10 select-none">
                      <svg viewBox="0 0 160 50" className="w-full h-full" fill="none">
                        <path
                          d="M 80 18 C 80 10, 88 8, 88 3 C 88 0, 83 -2, 79 1 C 76 3, 76 6, 76 7"
                          stroke="#E2E8F0"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 14 38 Q 80 18 146 38 C 149 39, 148 43, 144 42 Q 80 24 16 42 C 12 43, 11 39, 14 38 Z"
                          fill="#8C5831"
                        />
                      </svg>
                    </div>

                    <img
                      src={frontImage || sideImage}
                      alt={`${product.name} - Front View`}
                      className="h-[360px] sm:h-[440px] w-auto max-w-full object-contain filter drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] select-none"
                    />
                  </div>

                  {/* BACK FACE (Rotated 180deg) */}
                  <div
                    className="absolute inset-0 w-full h-full flex flex-col items-center justify-center"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    {/* Wooden Hanger SVG Header */}
                    <div className="w-36 sm:w-44 h-12 -mb-2 z-10 select-none">
                      <svg viewBox="0 0 160 50" className="w-full h-full" fill="none">
                        <path
                          d="M 80 18 C 80 10, 88 8, 88 3 C 88 0, 83 -2, 79 1 C 76 3, 76 6, 76 7"
                          stroke="#E2E8F0"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 14 38 Q 80 18 146 38 C 149 39, 148 43, 144 42 Q 80 24 16 42 C 12 43, 11 39, 14 38 Z"
                          fill="#8C5831"
                        />
                      </svg>
                    </div>

                    <img
                      src={backImage || frontImage}
                      alt={`${product.name} - Back View`}
                      className="h-[360px] sm:h-[440px] w-auto max-w-full object-contain filter drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] select-none"
                    />
                  </div>
                </div>
              </div>

              {/* Minimalist 3D Angle Switching Tabs ([ FRONT ] / [ BACK ]) */}
              <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 p-1 rounded-full">
                <button
                  type="button"
                  onClick={() => setActiveAngle('front')}
                  className={`px-5 py-1.5 text-xs font-black uppercase tracking-wider rounded-full transition-all ${
                    activeAngle === 'front'
                      ? 'bg-white text-black shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Front
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAngle('back')}
                  className={`px-5 py-1.5 text-xs font-black uppercase tracking-wider rounded-full transition-all ${
                    activeAngle === 'back'
                      ? 'bg-white text-black shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Back
                </button>
              </div>
            </div>

            {/* RIGHT: Product Details & Direct Shopping HUD */}
            <div className="md:col-span-5 flex flex-col justify-between space-y-6 md:border-l md:border-neutral-800 md:pl-8">
              <div className="space-y-4">
                {/* Category & Badge */}
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-300 font-bold uppercase text-[10px] rounded-xs">
                    {product.category?.name || 'Streetwear'}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    DROP POS #{product.rail_display_order || 1}
                  </span>
                </div>

                {/* Product Title */}
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-none font-heading">
                  {product.name}
                </h2>

                {/* Price Display */}
                <div className="flex items-baseline gap-3 pt-1">
                  <span className="text-2xl font-black text-white">
                    ₹{price.toLocaleString('en-IN')}
                  </span>
                  {product.compare_at_price && product.compare_at_price > price && (
                    <span className="text-sm text-neutral-500 line-through font-mono">
                      ₹{product.compare_at_price.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {/* Fabric Specifications */}
                {product.details && (
                  <div className="p-3 bg-neutral-900/60 border border-neutral-800/80 rounded-xs space-y-1 text-[11px]">
                    <div className="text-neutral-400">
                      <strong className="text-neutral-200">Fabric:</strong>{' '}
                      {product.details.fabric || '100% Cotton French Terry'} ({product.details.gsm || 240} GSM)
                    </div>
                    {product.details.fit && (
                      <div className="text-neutral-400">
                        <strong className="text-neutral-200">Fit:</strong> {product.details.fit}
                      </div>
                    )}
                  </div>
                )}

                {/* Sizing Pills Selection */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-neutral-300">Select Sizing</span>
                    {selectedVariant && selectedVariant.stock_quantity > 0 && selectedVariant.stock_quantity <= 5 && (
                      <span className="text-amber-400 font-bold text-[10px] uppercase">
                        Only {selectedVariant.stock_quantity} left in stock!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {product.variants?.map((v) => {
                      const isSelected = selectedVariant?.id === v.id
                      const inStock = v.stock_quantity > 0

                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={!inStock}
                          onClick={() => setSelectedVariant(v)}
                          className={`relative py-2 px-1 text-center font-bold text-xs uppercase border transition-all rounded-xs ${
                            isSelected
                              ? 'bg-white text-black border-white shadow-md'
                              : inStock
                              ? 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-600'
                              : 'bg-neutral-950 text-neutral-600 border-neutral-900 cursor-not-allowed opacity-50 line-through'
                          }`}
                        >
                          {v.size}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Shopping Actions */}
              <div className="space-y-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className={`w-full py-3.5 px-6 font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all rounded-xs ${
                    addedAnimation
                      ? 'bg-emerald-600 text-white'
                      : isOutOfStock
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      : 'bg-white text-black hover:bg-neutral-200 active:scale-98'
                  }`}
                >
                  {addedAnimation ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Added to Bag!</span>
                    </>
                  ) : isOutOfStock ? (
                    <span>Sold Out</span>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Add to Bag — ₹{price.toLocaleString('en-IN')}</span>
                    </>
                  )}
                </button>

                {/* Deep Link to Product Detail Page */}
                <Link
                  to={`/product/${product.slug}`}
                  className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors py-1"
                >
                  <span>View full piece details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-500 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Free shipping above ₹999 · Cash on Delivery available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
