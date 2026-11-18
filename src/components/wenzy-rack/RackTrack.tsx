import React, { useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Product } from '../../types/database'
import RackHangerItem from './RackHangerItem'

interface RackTrackProps {
  products: Product[]
  onSelectProduct: (product: Product, element: HTMLElement, fromRect: DOMRect) => void
  activeFocusProduct: Product | null
}

interface ItemAnimationState {
  element: HTMLDivElement
  garment: HTMLElement
  views: {
    el: HTMLElement
    pos: number
    img: HTMLImageElement | null
  }[]
  p: number // Current hover progress (0 = side resting, 1 = front revealed)
  t: number // Target hover progress (0 or 1)
  hpx: number // Measured garment height in pixels
  aspectSide: number
  aspectFront: number
  swing: {
    a: number // Angle in degrees
    v: number // Angular velocity in deg/s
  }
}

/**
 * High-performance clothing rail track matching the reference Nike Shopify engine:
 * - 60 FPS rAF physics engine:
 *   1. Damped pendulum swing physics (--sr-sw)
 *   2. Exponential-decay hover turn from side to front with 3D perspective rotation
 *   3. Neighbor swing impulse and dynamic spacing expansion
 *   4. Inertial drag coasting with velocity preservation
 *   5. Mobile two-tap gesture (1st tap turns front, 2nd tap opens focus modal)
 */
export default function RackTrack({
  products,
  onSelectProduct,
  activeFocusProduct,
}: RackTrackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Multiple items looping duplicate (minimum 8 pieces on rail for realistic boutique feel)
  const loopMultiplier = products.length === 1 ? 8 : products.length < 4 ? 4 : 2
  const displayProducts = Array(loopMultiplier).fill(products).flat()

  // Track drag state
  const isDragging = useRef(false)
  const startX = useRef(0)
  const currentTranslate = useRef(0)
  const lastX = useRef(0)
  const velocity = useRef(0)
  const hasMoved = useRef(false)
  const dragRaf = useRef<number | null>(null)

  // Internal animation state array for every item on rail
  const itemStates = useRef<ItemAnimationState[]>([])
  const curHoverIdx = useRef<number | null>(null)
  const tappedIdx = useRef<number | null>(null)
  const lastPointerType = useRef<string>('mouse')

  // Animation constants matching reference site exactly
  const HOVER_MS = 650
  const K_SPRING = 26
  const K_DAMP = 2.3
  const MAX_SWING_A = 11

  // Smoothstep easing: 3x^2 - 2x^3
  const ss = (x: number) => x * x * (3 - 2 * x)
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

  // Apply impulse to garment swing
  const impulse = useCallback((idx: number | null, v: number) => {
    if (idx === null || idx < 0 || idx >= itemStates.current.length) return
    const s = itemStates.current[idx]
    if (s && s.swing) {
      s.swing.v += v * 0.6
    }
  }, [])

  // Position track horizontally
  const setTrackPosition = useCallback((x: number) => {
    if (!trackRef.current || !containerRef.current) return
    const containerWidth = containerRef.current.clientWidth
    const trackWidth = trackRef.current.scrollWidth
    const singleSetWidth = trackWidth / loopMultiplier

    let wrappedX = x
    if (loopMultiplier > 1 && singleSetWidth > 0) {
      if (wrappedX > 0) {
        wrappedX -= singleSetWidth
      } else if (wrappedX < -singleSetWidth * (loopMultiplier - 1)) {
        wrappedX += singleSetWidth
      }
    } else {
      const minBound = -(trackWidth - containerWidth)
      wrappedX = Math.min(0, Math.max(minBound, wrappedX))
    }

    currentTranslate.current = wrappedX
    trackRef.current.style.transform = `translateX(${wrappedX}px)`
  }, [loopMultiplier])

  // Drag coasting momentum loop
  const coast = useCallback(() => {
    if (Math.abs(velocity.current) > 0.2) {
      currentTranslate.current += velocity.current
      velocity.current *= 0.92
      setTrackPosition(currentTranslate.current)
      dragRaf.current = requestAnimationFrame(coast)
    } else {
      velocity.current = 0
      if (dragRaf.current) cancelAnimationFrame(dragRaf.current)
    }
  }, [setTrackPosition])

  // Pan left / right by distance
  const panBy = (distance: number) => {
    if (dragRaf.current) cancelAnimationFrame(dragRaf.current)
    const target = currentTranslate.current + distance
    setTrackPosition(target)
  }

  // Set hover state on garment
  const setHover = useCallback(
    (idx: number | null) => {
      if (lastPointerType.current === 'touch') return
      if (curHoverIdx.current === idx) return

      const prev = curHoverIdx.current
      if (prev !== null && itemStates.current[prev]) {
        itemStates.current[prev].t = 0
        // Return impulse to former neighbors
        impulse(prev - 1, 12)
        impulse(prev + 1, -12)
      }

      curHoverIdx.current = idx
      if (idx !== null && itemStates.current[idx]) {
        itemStates.current[idx].t = 1
        // Outward swing impulse to neighbors
        impulse(idx - 1, -26)
        impulse(idx + 1, 26)
      }
    },
    [impulse]
  )

  // -------------------------------------------------------------
  // PRIMARY 60 FPS rAF ENGINE (Swing Physics & Hover 3D Turn)
  // -------------------------------------------------------------
  useEffect(() => {
    let animId = 0
    let lastTs = 0

    const mainLoop = (ts: number) => {
      if (!lastTs) lastTs = ts
      const dt = Math.min(64, ts - lastTs)
      lastTs = ts
      const dtSec = dt / 1000

      const k = 1 - Math.exp(-dt / (HOVER_MS * 0.3))

      itemStates.current.forEach((s) => {
        if (!s || !s.element) return

        // 1. Damped Pendulum Swing
        if (Math.abs(s.swing.a) > 0.03 || Math.abs(s.swing.v) > 0.08) {
          const h = dtSec / 2
          for (let i = 0; i < 2; i++) {
            s.swing.v += (-K_SPRING * s.swing.a - K_DAMP * s.swing.v) * h
            s.swing.a += s.swing.v * h
          }
          if (s.swing.a > MAX_SWING_A) {
            s.swing.a = MAX_SWING_A
            s.swing.v *= -0.35
          } else if (s.swing.a < -MAX_SWING_A) {
            s.swing.a = -MAX_SWING_A
            s.swing.v *= -0.35
          }
          s.element.style.setProperty('--sr-sw', `${(-s.swing.a).toFixed(2)}deg`)
        } else if (s.swing.a !== 0 || s.swing.v !== 0) {
          s.swing.a = 0
          s.swing.v = 0
          s.element.style.setProperty('--sr-sw', '0deg')
        }

        // 2. Hover Progress Interpolation
        const diff = s.t - s.p
        if (Math.abs(diff) > 0.015) {
          s.p += diff * k
        } else if (s.p !== s.t) {
          s.p = s.t
        }

        const e = ss(s.p)
        s.element.style.setProperty('--sr-p', e.toFixed(4))
        s.element.classList.toggle('sr-live', e > 0.02)

        // Interpolate Width between side view and front view
        if (s.hpx > 0) {
          const curAspect = s.aspectSide + (s.aspectFront - s.aspectSide) * e
          s.element.style.width = `${Math.round(s.hpx * curAspect)}px`
        }

        // View 0 (Side profile): fades out, rotates away in 3D perspective
        const view0 = s.views.find((v) => v.pos === 0)
        if (view0) {
          const sideOp = clamp((0.56 - e) / 0.12, 0, 1)
          view0.el.style.opacity = String(sideOp)
          const sAng = Math.min(1, e * 2) * -84
          view0.el.style.transform =
            e <= 0 ? 'none' : `perspective(900px) rotateY(${sAng.toFixed(2)}deg)`
        }

        // View 1 (Front face): fades in, scales from 0.92 to 1.0
        const view1 = s.views.find((v) => v.pos === 1)
        if (view1) {
          const frontOp = clamp((e - 0.44) / 0.12, 0, 1)
          view1.el.style.opacity = String(frontOp)
          view1.el.style.transform =
            e >= 1 ? 'none' : `scale(${(0.92 + 0.08 * e).toFixed(4)})`
        }

        // View -1 (Back face): kept hidden on rail
        const viewBack = s.views.find((v) => v.pos === -1)
        if (viewBack) {
          viewBack.el.style.opacity = '0'
        }
      })

      animId = requestAnimationFrame(mainLoop)
    }

    animId = requestAnimationFrame(mainLoop)
    return () => cancelAnimationFrame(animId)
  }, [HOVER_MS, K_SPRING, K_DAMP, MAX_SWING_A])

  // Measure elements and initialize animation state
  const initItems = useCallback(() => {
    itemStates.current = itemRefs.current.map((el) => {
      if (!el) {
        return {
          element: null as any,
          garment: null as any,
          views: [],
          p: 0,
          t: 0,
          hpx: 440,
          aspectSide: 0.35,
          aspectFront: 0.68,
          swing: { a: 0, v: 0 },
        }
      }

      const garment = el.querySelector<HTMLElement>('.rack-garment') || el
      const hpx = garment.getBoundingClientRect().height || 440

      const views = Array.from(el.querySelectorAll<HTMLElement>('.rack-view')).map((v) => ({
        el: v,
        pos: parseFloat(v.getAttribute('data-sr-pos') || '0'),
        img: v.querySelector('img'),
      }))

      // Read natural image aspect ratios
      const sideImg = views.find((v) => v.pos === 0)?.img
      const frontImg = views.find((v) => v.pos === 1)?.img

      const aspectSide =
        sideImg && sideImg.naturalWidth > 0 && sideImg.naturalHeight > 0
          ? sideImg.naturalWidth / sideImg.naturalHeight
          : 0.35
      const aspectFront =
        frontImg && frontImg.naturalWidth > 0 && frontImg.naturalHeight > 0
          ? frontImg.naturalWidth / frontImg.naturalHeight
          : 0.68

      // Set initial width of side-resting garment
      el.style.width = `${Math.round(hpx * aspectSide)}px`

      return {
        element: el,
        garment,
        views,
        p: 0,
        t: 0,
        hpx,
        aspectSide,
        aspectFront,
        swing: { a: 0, v: 0 },
      }
    })
  }, [])

  useEffect(() => {
    initItems()
    window.addEventListener('resize', initItems)
    return () => window.removeEventListener('resize', initItems)
  }, [initItems, displayProducts.length])

  // Center track initially
  useEffect(() => {
    if (containerRef.current && trackRef.current && loopMultiplier > 1) {
      const singleSetWidth = trackRef.current.scrollWidth / loopMultiplier
      setTrackPosition(-singleSetWidth * 0.5)
    }
  }, [loopMultiplier, setTrackPosition])

  // -------------------------------------------------------------
  // Pointer Drag & Hover Event Handlers
  // -------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent) => {
    lastPointerType.current = e.pointerType || 'mouse'
    isDragging.current = true
    hasMoved.current = false
    startX.current = e.clientX
    lastX.current = e.clientX
    velocity.current = 0

    if (dragRaf.current) cancelAnimationFrame(dragRaf.current)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return

    const currentX = e.clientX
    const deltaX = currentX - lastX.current
    lastX.current = currentX

    if (Math.abs(currentX - startX.current) > 5) {
      hasMoved.current = true
    }

    velocity.current = deltaX * 0.8
    setTrackPosition(currentTranslate.current + deltaX)

    // Brushing swing impulse while dragging
    if (Math.abs(deltaX) > 4) {
      const brushIdx = curHoverIdx.current
      if (brushIdx !== null) {
        impulse(brushIdx, clamp(deltaX * 0.4, -20, 20))
      }
    }
  }

  const handlePointerUp = () => {
    if (!isDragging.current) return
    isDragging.current = false
    dragRaf.current = requestAnimationFrame(coast)
  }

  // Handle click / tap on garment
  const handleItemClick = (
    e: React.MouseEvent<HTMLDivElement>,
    product: Product,
    idx: number
  ) => {
    if (hasMoved.current) return
    e.stopPropagation()

    const s = itemStates.current[idx]
    if (!s || !s.element) return

    // Mobile / Touch two-tap handling:
    // 1st tap turns piece to front face. 2nd tap opens modal.
    if (lastPointerType.current === 'touch') {
      if (tappedIdx.current !== idx) {
        // First tap: turn this item to front, turn any previous back
        if (tappedIdx.current !== null && itemStates.current[tappedIdx.current]) {
          itemStates.current[tappedIdx.current].t = 0
        }
        tappedIdx.current = idx
        s.t = 1
        impulse(idx - 1, -26)
        impulse(idx + 1, 26)
        return
      }
      // Second tap: open modal
      tappedIdx.current = null
    }

    // Capture source garment rect for true FLIP flight animation
    const garment = s.garment || s.element
    const fromRect = garment.getBoundingClientRect()

    onSelectProduct(product, garment, fromRect)
  }

  // Tapping track background turns any tapped mobile piece back
  const handleBackgroundClick = () => {
    if (tappedIdx.current !== null && itemStates.current[tappedIdx.current]) {
      itemStates.current[tappedIdx.current].t = 0
      tappedIdx.current = null
    }
    setHover(null)
  }

  return (
    <div
      className="relative w-full overflow-hidden select-none group"
      onClick={handleBackgroundClick}
    >
      {/* Pan Navigation Buttons (Desktop only - pointer-events-none when opacity-0) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          panBy(360)
        }}
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-40 w-11 h-11 items-center justify-center bg-black/85 hover:bg-black text-white rounded-full shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity backdrop-blur-md border border-white/10"
        title="Scroll left"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          panBy(-360)
        }}
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-40 w-11 h-11 items-center justify-center bg-black/85 hover:bg-black text-white rounded-full shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity backdrop-blur-md border border-white/10"
        title="Scroll right"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Main Draggable Horizontal Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y pt-2 pb-6"
      >
        <div
          ref={trackRef}
          className="flex items-start gap-4 sm:gap-6 md:gap-8 px-8 sm:px-16 w-max will-change-transform"
        >
          {displayProducts.map((product, idx) => (
            <div key={`${product.id}-${idx}`} className="shrink-0">
              <RackHangerItem
                ref={(el) => {
                  itemRefs.current[idx] = el
                }}
                product={product}
                index={idx}
                onClick={(e) => handleItemClick(e, product, idx)}
                onMouseEnter={() => setHover(idx)}
                onMouseLeave={() => setHover(null)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
