import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { X, ShoppingBag, ArrowRight, ShieldCheck, Check } from 'lucide-react'
import type { Product, ProductVariant } from '../../types/database'
import { useCart } from '../../context/CartContext'

interface RackFocusModalProps {
  isOpen: boolean
  product: Product | null
  fromRect: DOMRect | null
  sourceElement: HTMLElement | null
  onClose: () => void
  onCloseComplete: () => void
}

/**
 * Reference-Accurate Focus View (.sr-focus) for WENZY RACK.
 *
 * Implements:
 * 1. True FLIP shared-element flight animation:
 *    - Garment physically lifts from its exact rail slot and travels along an arc to center stage (680ms cubic-bezier(.22,.85,.3,1)).
 *    - Source rail hanger is hidden while in focus view.
 * 2. Reverse landing flight on close:
 *    - Garment travels back to the exact hanger position on the rail (560ms cubic-bezier(.45,0,.55,1)).
 *    - Restores rail visibility and applies landing sway impulse!
 * 3. NO fake/duplicate SVG hangers — preserves natural studio cutouts.
 * 4. Interactive 3D angle switching (Front ↔ Back) with drag rotate and snap.
 * 5. Instant Add to Bag with CartContext integration.
 */
export default function RackFocusModal({
  isOpen,
  product,
  fromRect,
  sourceElement,
  onClose,
  onCloseComplete,
}: RackFocusModalProps) {
  const { addItem } = useCart()

  const [activeAngle, setActiveAngle] = useState<'front' | 'back'>('front')
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [addedAnimation, setAddedAnimation] = useState(false)
  const [isAnimatingIn, setIsAnimatingIn] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const garmentRef = useRef<HTMLDivElement>(null)
  const activeAnimation = useRef<Animation | null>(null)

  // 3D rotation state (degrees)
  const fAng = useRef<number>(0)
  const fAngTarget = useRef<number>(0)
  const fRotRaf = useRef<number | null>(null)
  const isPointerDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartAngle = useRef(0)

  // Sync angle target and run smooth rotation decay
  const setRotationTarget = (deg: number) => {
    fAngTarget.current = deg
    setActiveAngle(deg === 180 ? 'back' : 'front')

    if (!fRotRaf.current) {
      let last = 0
      const loop = (ts: number) => {
        if (!last) last = ts
        const dt = Math.min(80, ts - last)
        last = ts

        const diff = fAngTarget.current - fAng.current
        const k = 1 - Math.exp(-dt / (700 * 0.22)) // time constant ~154ms matching reference

        if (Math.abs(diff) < 0.4) {
          fAng.current = fAngTarget.current
        } else {
          fAng.current += diff * k
        }

        if (garmentRef.current) {
          garmentRef.current.style.transform = `rotateY(${fAng.current.toFixed(2)}deg)`
        }

        if (fAng.current !== fAngTarget.current) {
          fRotRaf.current = requestAnimationFrame(loop)
        } else {
          fRotRaf.current = null
        }
      }
      fRotRaf.current = requestAnimationFrame(loop)
    }
  }

  // Pointer drag to spin garment
  const handleStagePointerDown = (e: React.PointerEvent) => {
    if (isClosing) return
    isPointerDragging.current = true
    dragStartX.current = e.clientX
    dragStartAngle.current = fAng.current
    if (stageRef.current) {
      stageRef.current.classList.add('sr-dragging')
      try {
        stageRef.current.setPointerCapture(e.pointerId)
      } catch {}
    }
  }

  const handleStagePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDragging.current) return
    const deltaX = e.clientX - dragStartX.current
    let nextAngle = dragStartAngle.current + deltaX * 0.45 // 0.45 deg/px sensitivity matching reference
    nextAngle = Math.max(-210, Math.min(210, nextAngle))
    fAng.current = nextAngle
    if (garmentRef.current) {
      garmentRef.current.style.transform = `rotateY(${nextAngle.toFixed(2)}deg)`
    }
  }

  const handleStagePointerUp = () => {
    if (!isPointerDragging.current) return
    isPointerDragging.current = false
    if (stageRef.current) {
      stageRef.current.classList.remove('sr-dragging')
    }
    // Snap to nearest 0 or 180
    const snapTo = Math.abs(fAng.current) < 90 ? 0 : 180
    setRotationTarget(snapTo)
  }

  // Trigger Open Flight
  useEffect(() => {
    if (isOpen && product && stageRef.current) {
      setIsClosing(false)
      setIsAnimatingIn(true)
      setActiveAngle('front')
      fAng.current = 0
      fAngTarget.current = 0

      const variants = product.variants || []
      const firstInStock = variants.find((v) => v.stock_quantity > 0) || variants[0] || null
      setSelectedVariant(firstInStock)

      // Hide source garment on the rail
      if (sourceElement) {
        sourceElement.style.visibility = 'hidden'
      }

      // Run FLIP animation if fromRect is available
      if (fromRect && stageRef.current.animate) {
        const toRect = stageRef.current.getBoundingClientRect()
        const sc = toRect.height > 0 ? fromRect.height / toRect.height : 0.8
        const dx = fromRect.left + fromRect.width / 2 - (toRect.left + toRect.width / 2)
        const dy = fromRect.top - toRect.top
        const lift = Math.min(90, Math.abs(dy) * 0.25 + 34)

        const start = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${sc.toFixed(4)})`
        const mid = `translate(${(dx * 0.4).toFixed(1)}px, ${(dy * 0.4 - lift).toFixed(1)}px) scale(${(((sc + 1) / 2) * 1.03).toFixed(4)}) rotate(${dx > 0 ? -2.5 : 2.5}deg)`
        const end = `translate(0px, 0px) scale(1)`

        const anim = stageRef.current.animate(
          [
            { transform: start },
            { transform: mid, offset: 0.5 },
            { transform: end },
          ],
          {
            duration: 680,
            easing: 'cubic-bezier(.22,.85,.3,1)',
            fill: 'both',
          }
        )
        activeAnimation.current = anim
      }
    }
  }, [isOpen, product, fromRect, sourceElement])

  // Trigger Close Reverse Flight
  const handleRequestClose = () => {
    if (isClosing) return
    setIsClosing(true)
    setIsAnimatingIn(false)

    if (fRotRaf.current) {
      cancelAnimationFrame(fRotRaf.current)
      fRotRaf.current = null
    }

    const finishClose = () => {
      if (sourceElement) {
        sourceElement.style.visibility = ''
      }
      setIsClosing(false)
      onClose()
      onCloseComplete()
    }

    // Run reverse flight to return to hanger on rail
    if (fromRect && stageRef.current && stageRef.current.animate) {
      const toRect = stageRef.current.getBoundingClientRect()
      const sc = toRect.height > 0 ? fromRect.height / toRect.height : 0.8
      const dx = fromRect.left + fromRect.width / 2 - (toRect.left + toRect.width / 2)
      const dy = fromRect.top - toRect.top
      const lift = Math.min(90, Math.abs(dy) * 0.25 + 34)

      const start = `translate(0px, 0px) scale(1)`
      const mid = `translate(${(dx * 0.4).toFixed(1)}px, ${(dy * 0.4 - lift).toFixed(1)}px) scale(${(((sc + 1) / 2) * 1.03).toFixed(4)}) rotate(${dx > 0 ? -2.5 : 2.5}deg)`
      const end = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${sc.toFixed(4)})`

      const anim = stageRef.current.animate(
        [
          { transform: start },
          { transform: mid, offset: 0.5 },
          { transform: end },
        ],
        {
          duration: 560,
          easing: 'cubic-bezier(.45,0,.55,1)',
          fill: 'both',
        }
      )
      anim.onfinish = finishClose
    } else {
      setTimeout(finishClose, 300)
    }
  }

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleRequestClose()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (isOpen) {
          setRotationTarget(activeAngle === 'front' ? 180 : 0)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activeAngle, isClosing])

  if (!isOpen && !isClosing) return null
  if (!product) return null

  // Extract mandatory front & back images
  const frontImage =
    product.images?.find((img) => img.view_type === 'front')?.image_url ||
    product.images?.find((img) => img.is_primary)?.image_url ||
    product.images?.[0]?.image_url ||
    ''
  const backImage =
    product.images?.find((img) => img.view_type === 'back')?.image_url ||
    frontImage

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
        image: frontImage || '/assets/wenzy_front_texture.png',
      },
      1
    )

    setAddedAnimation(true)
    setTimeout(() => {
      setAddedAnimation(false)
    }, 1500)
  }

  return createPortal(
    <div
      className={`rack-focus sr-focus-open ${
        isAnimatingIn && !isClosing ? 'sr-focus-in' : ''
      }`}
    >
      {/* 1. Frosted Backdrop Blur (26px) */}
      <div className="rack-focus-bg" onClick={handleRequestClose} />

      {/* 2. Top-Right Close Button */}
      <button
        type="button"
        onClick={handleRequestClose}
        className="rack-focus-close absolute top-6 right-6 z-50 p-2.5 bg-neutral-900/80 hover:bg-white text-white hover:text-black rounded-full border border-neutral-700 backdrop-blur-md transition-all shadow-2xl"
        title="Return to rack (Esc)"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* 3. Main Modal Container */}
      <div className="relative z-10 w-full max-w-6xl max-h-[92vh] flex flex-col md:flex-row items-center justify-center gap-8 lg:gap-14 px-4 sm:px-8 pointer-events-auto">
        {/* LEFT: Central 3D Garment Stage */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center">
          <div
            ref={stageRef}
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
            onPointerCancel={handleStagePointerUp}
            className="rack-focus-stage w-full max-w-[360px] sm:max-w-[420px] md:max-w-[460px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
          >
            {/* Flipping 3D Garment Container */}
            <div
              ref={garmentRef}
              className="rack-garment relative w-full h-[400px] sm:h-[480px] md:h-[540px] flex items-center justify-center"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateY(${fAng.current}deg)`,
              }}
            >
              {/* FRONT VIEW (pos="1") */}
              <div
                className="rack-view"
                data-sr-pos="1"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <img
                  src={frontImage}
                  alt={`${product.name} – front`}
                  className="h-full w-auto max-w-full object-contain pointer-events-none drop-shadow-[0_24px_36px_rgba(0,0,0,0.45)]"
                />
              </div>

              {/* BACK VIEW (pos="-1", pre-rotated 180deg) */}
              <div
                className="rack-view"
                data-sr-pos="-1"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <img
                  src={backImage}
                  alt={`${product.name} – back`}
                  className="h-full w-auto max-w-full object-contain pointer-events-none drop-shadow-[0_24px_36px_rgba(0,0,0,0.45)]"
                />
              </div>
            </div>
          </div>

          {/* Angle Switching Tabs ([ FRONT ] / [ BACK ]) */}
          <div className="rack-focus-meta mt-6 flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 p-1 rounded-full shadow-2xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => setRotationTarget(0)}
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
              onClick={() => setRotationTarget(180)}
              className={`px-5 py-1.5 text-xs font-black uppercase tracking-wider rounded-full transition-all ${
                activeAngle === 'back'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Back
            </button>
          </div>
          <p className="rack-focus-meta text-[10px] text-neutral-500 uppercase tracking-widest mt-2 font-mono">
            Drag piece horizontally to spin in 3D
          </p>
        </div>

        {/* RIGHT: Product Meta & Direct Shopping HUD */}
        <div className="rack-focus-meta w-full md:w-1/2 max-w-md bg-neutral-950/85 border border-neutral-800/80 p-6 sm:p-8 rounded-sm shadow-2xl backdrop-blur-xl text-white space-y-6">
          <div className="space-y-3">
            {/* Category & Collection Tag */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-neutral-900 border border-neutral-700/60 text-neutral-300 font-bold uppercase text-[10px] rounded-xs tracking-wider">
                {product.category?.name || 'STREETWEAR'}
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                PIECE #{product.rail_display_order || 1}
              </span>
            </div>

            {/* Product Title */}
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight font-heading">
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

            {/* Fabric Specs */}
            {product.details && (
              <div className="p-3 bg-neutral-900/50 border border-neutral-800/80 rounded-xs space-y-1 text-[11px]">
                <div className="text-neutral-400">
                  <strong className="text-neutral-200">Fabric:</strong>{' '}
                  {product.details.fabric || '100% Cotton French Terry'} (
                  {product.details.gsm || 240} GSM)
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
                <span className="font-bold uppercase tracking-wider text-neutral-300">
                  Select Sizing
                </span>
                {selectedVariant &&
                  selectedVariant.stock_quantity > 0 &&
                  selectedVariant.stock_quantity <= 5 && (
                    <span className="text-amber-400 font-bold text-[10px] uppercase">
                      Only {selectedVariant.stock_quantity} left in stock!
                    </span>
                  )}
              </div>

              <div className="grid grid-cols-6 gap-2">
                {product.variants?.map((v) => {
                  const isSelected = selectedVariant?.id === v.id
                  const inStock = v.stock_quantity > 0

                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={!inStock}
                      onClick={() => setSelectedVariant(v)}
                      className={`relative py-2 text-center font-bold text-xs uppercase border transition-all rounded-xs ${
                        isSelected
                          ? 'bg-white text-black border-white shadow-md'
                          : inStock
                          ? 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-500'
                          : 'bg-neutral-950 text-neutral-600 border-neutral-900 cursor-not-allowed opacity-40 line-through'
                      }`}
                    >
                      {v.size}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Direct Shopping Actions */}
          <div className="space-y-3 pt-3 border-t border-neutral-800/80">
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
    </div>,
    document.body
  )
}
