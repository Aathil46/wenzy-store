import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
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

const MOBILE_PAGE_SIZE = 4

/**
 * High-performance clothing rail track matching the reference Nike Shopify engine:
 * - 60 FPS rAF physics engine:
 *   1. Damped pendulum swing physics (--sr-sw)
 *   2. Exponential-decay hover turn from side to front with 3D perspective rotation
 *   3. Neighbor swing impulse and dynamic spacing expansion
 *   4. Inertial drag coasting with velocity preservation (desktop > 4 pieces)
 *   5. Mobile two-tap gesture (1st tap turns front, 2nd tap opens focus modal)
 *
 * Specific Enhancements:
 * - 0 Duplicates: Each product appears exactly once (1 product in DB = 1 garment).
 * - Desktop Layout: Unchanged continuous rail (centered if <= 4 items, draggable if > 4 items).
 * - Mobile Experience (< 768px):
 *   - Max 4 products per page.
 *   - If > 4 products, arranged in pages of 4 with smooth horizontal swipe and subtle indicator dots.
 *   - Touch swiping with touch-action: pan-y (no vertical scroll interference).
 *   - If <= 4 products, displays available products centered with no dots or placeholders.
 */
export default function RackTrack({
  products,
  onSelectProduct,
  activeFocusProduct,
}: RackTrackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Responsive mobile detection
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false
  })

  // Mobile pagination state
  const [mobilePage, setMobilePage] = useState(0)

  // Chunk products for mobile pages (max 4 per page)
  const mobilePages = useMemo(() => {
    const pages: Product[][] = []
    for (let i = 0; i < products.length; i += MOBILE_PAGE_SIZE) {
      pages.push(products.slice(i, i + MOBILE_PAGE_SIZE))
    }
    return pages
  }, [products])

  const totalMobilePages = Math.max(1, mobilePages.length)

  // Keep mobile page in bounds if product list changes
  useEffect(() => {
    if (mobilePage >= totalMobilePages) {
      setMobilePage(Math.max(0, totalMobilePages - 1))
    }
  }, [totalMobilePages, mobilePage])

  // Track viewport resize for mobile vs desktop mode
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Desktop drag state
  const isDragging = useRef(false)
  const startX = useRef(0)
  const currentTranslate = useRef(0)
  const lastX = useRef(0)
  const velocity = useRef(0)
  const hasMoved = useRef(false)
  const dragRaf = useRef<number | null>(null)

  // Mobile touch swipe state
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchDeltaX = useRef(0)
  const isHorizontalSwipe = useRef<boolean | null>(null)

  // Internal animation state array for every item on rail
  const itemStates = useRef<ItemAnimationState[]>([])
  const curHoverIdx = useRef<number | null>(null)
  const tappedIdx = useRef<number | null>(null)
  const lastPointerType = useRef<string>('mouse')

  // Animation constants matching natural damped physics
  const HOVER_MS = 600
  const K_SPRING = 24
  const K_DAMP = 14
  const MAX_SWING_A = 3.5

  // Smoothstep easing: 3x^2 - 2x^3
  const ss = (x: number) => x * x * (3 - 2 * x)
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

  // Apply impulse to garment swing
  const impulse = useCallback((idx: number | null, v: number) => {
    if (idx === null || idx < 0 || idx >= itemStates.current.length) return
    const s = itemStates.current[idx]
    if (s && s.swing) {
      s.swing.v += v * 0.4
    }
  }, [])

  // Position desktop track horizontally
  const setTrackPosition = useCallback((x: number) => {
    if (!trackRef.current || !containerRef.current || products.length <= 4) return
    const containerWidth = containerRef.current.clientWidth
    const trackWidth = trackRef.current.scrollWidth

    const minBound = Math.min(0, -(trackWidth - containerWidth))
    const clampedX = Math.min(0, Math.max(minBound, x))

    currentTranslate.current = clampedX
    trackRef.current.style.transform = `translateX(${clampedX}px)`
  }, [products.length])

  // Drag coasting momentum loop (desktop)
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

  // Pan left / right by distance (desktop arrow buttons)
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
        // Gentle return impulse to former neighbors
        impulse(prev - 1, 2.5)
        impulse(prev + 1, -2.5)
      }

      curHoverIdx.current = idx
      if (idx !== null && itemStates.current[idx]) {
        itemStates.current[idx].t = 1
        // Smoothly stabilize hovered item itself so it turns with 0 shaking
        itemStates.current[idx].swing.a = 0
        itemStates.current[idx].swing.v = 0
        // Gentle subtle nudge to immediate neighbors
        impulse(idx - 1, -5)
        impulse(idx + 1, 5)
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

        // Rapidly damp any residual swing on the hovered turning piece so it stays steady
        if (s.t === 1 && (Math.abs(s.swing.a) > 0 || Math.abs(s.swing.v) > 0)) {
          s.swing.a *= 0.75
          s.swing.v *= 0.4
          if (Math.abs(s.swing.a) < 0.02) s.swing.a = 0
          if (Math.abs(s.swing.v) < 0.05) s.swing.v = 0
        }

        // 1. Controlled Damped Pendulum Swing
        if (Math.abs(s.swing.a) > 0.02 || Math.abs(s.swing.v) > 0.05) {
          const h = dtSec / 2
          for (let i = 0; i < 2; i++) {
            s.swing.v += (-K_SPRING * s.swing.a - K_DAMP * s.swing.v) * h
            s.swing.a += s.swing.v * h
          }
          if (s.swing.a > MAX_SWING_A) {
            s.swing.a = MAX_SWING_A
            s.swing.v *= -0.2
          } else if (s.swing.a < -MAX_SWING_A) {
            s.swing.a = -MAX_SWING_A
            s.swing.v *= -0.2
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
      const hpx =
        garment.getBoundingClientRect().height || (window.innerWidth < 768 ? 225 : 440)

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
  }, [initItems, products.length, isMobile, mobilePage])

  // Reset desktop track position when <= 4 items
  useEffect(() => {
    if (products.length <= 4 && trackRef.current) {
      trackRef.current.style.transform = 'none'
      currentTranslate.current = 0
    }
  }, [products.length])

  // -------------------------------------------------------------
  // Desktop Drag Handlers (> 4 items)
  // -------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent) => {
    lastPointerType.current = e.pointerType || 'mouse'
    if (products.length <= 4) return

    isDragging.current = true
    hasMoved.current = false
    startX.current = e.clientX
    lastX.current = e.clientX
    velocity.current = 0

    if (dragRaf.current) cancelAnimationFrame(dragRaf.current)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || products.length <= 4) return

    const currentX = e.clientX
    const deltaX = currentX - lastX.current
    lastX.current = currentX

    if (Math.abs(currentX - startX.current) > 5) {
      hasMoved.current = true
    }

    velocity.current = deltaX * 0.8
    setTrackPosition(currentTranslate.current + deltaX)

    // Gentle brushing swing impulse while dragging
    if (Math.abs(deltaX) > 6) {
      const brushIdx = curHoverIdx.current
      if (brushIdx !== null) {
        impulse(brushIdx, clamp(deltaX * 0.15, -4, 4))
      }
    }
  }

  const handlePointerUp = () => {
    if (!isDragging.current) return
    isDragging.current = false
    dragRaf.current = requestAnimationFrame(coast)
  }

  // -------------------------------------------------------------
  // Mobile Touch Swipe Handlers (Pages of max 4)
  // -------------------------------------------------------------
  const handleMobileTouchStart = (e: React.TouchEvent) => {
    lastPointerType.current = 'touch'
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchDeltaX.current = 0
    isHorizontalSwipe.current = null
  }

  const handleMobileTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const dx = currentX - touchStartX.current
    const dy = currentY - touchStartY.current

    // Direction lock on first significant displacement
    if (isHorizontalSwipe.current === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      isHorizontalSwipe.current = Math.abs(dx) > Math.abs(dy)
    }

    // If user is scrolling vertically down page, do not interfere!
    if (isHorizontalSwipe.current === false) return

    touchDeltaX.current = dx
  }

  const handleMobileTouchEnd = () => {
    if (isHorizontalSwipe.current === true && Math.abs(touchDeltaX.current) > 36) {
      if (touchDeltaX.current < 0 && mobilePage < totalMobilePages - 1) {
        setMobilePage((p) => p + 1)
      } else if (touchDeltaX.current > 0 && mobilePage > 0) {
        setMobilePage((p) => p - 1)
      }
    }
    isHorizontalSwipe.current = null
    touchDeltaX.current = 0
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

    // Reset any tapped state
    tappedIdx.current = null

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

  if (products.length === 0) return null

  return (
    <div
      className="relative w-full overflow-hidden select-none group"
      onClick={handleBackgroundClick}
    >
      {!isMobile ? (
        /* ------------------------------------------------------------- */
        /* DESKTOP VIEW (>= 768px): Unchanged continuous rail experience */
        /* ------------------------------------------------------------- */
        <div className="w-full">
          {/* Pan Navigation Buttons (Desktop only - shown when > 4 products) */}
          {products.length > 4 && (
            <>
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
            </>
          )}

          {/* Main Draggable Horizontal Container */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`w-full overflow-hidden touch-pan-y pt-2 pb-6 ${
              products.length > 4
                ? 'cursor-grab active:cursor-grabbing'
                : 'flex justify-center'
            }`}
          >
            <div
              ref={trackRef}
              className={`flex items-start gap-4 sm:gap-6 md:gap-8 px-8 sm:px-16 will-change-transform ${
                products.length <= 4 ? 'w-full justify-center' : 'w-max'
              }`}
            >
              {products.map((product, idx) => (
                <div key={product.id} className="shrink-0">
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
      ) : (
        /* ------------------------------------------------------------- */
        /* MOBILE VIEW (< 768px): Max 4 Items Per Page with Swipe Glides */
        /* ------------------------------------------------------------- */
        <div
          className="w-full overflow-hidden touch-pan-y pt-2 pb-5"
          onTouchStart={handleMobileTouchStart}
          onTouchMove={handleMobileTouchMove}
          onTouchEnd={handleMobileTouchEnd}
        >
          {totalMobilePages <= 1 ? (
            /* Single Page (<= 4 items): Clean centered rail, comfortable 4-item fit */
            <div className="flex items-start justify-center gap-2 sm:gap-3 px-2 w-full">
              {products.map((product, idx) => (
                <div key={product.id} className="shrink-0">
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
          ) : (
            /* Multi-Page Carousel (> 4 items): Horizontal glide per page of 4 */
            <>
              <div
                className="flex w-full transition-transform duration-400 ease-out will-change-transform"
                style={{
                  transform: `translateX(-${mobilePage * 100}%)`,
                }}
              >
                {mobilePages.map((pageItems, pageIdx) => (
                  <div
                    key={`mob-page-${pageIdx}`}
                    className="w-full shrink-0 flex items-start justify-center gap-2 sm:gap-3 px-2"
                  >
                    {pageItems.map((product, pItemIdx) => {
                      const globalIdx = pageIdx * MOBILE_PAGE_SIZE + pItemIdx
                      return (
                        <div key={product.id} className="shrink-0">
                          <RackHangerItem
                            ref={(el) => {
                              itemRefs.current[globalIdx] = el
                            }}
                            product={product}
                            index={globalIdx}
                            onClick={(e) => handleItemClick(e, product, globalIdx)}
                            onMouseEnter={() => setHover(globalIdx)}
                            onMouseLeave={() => setHover(null)}
                          />
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Mobile Pagination Indicator Dots */}
              <div className="flex items-center justify-center gap-2 mt-4">
                {mobilePages.map((_, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => setMobilePage(pIdx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      pIdx === mobilePage
                        ? 'w-6 bg-neutral-900'
                        : 'w-1.5 bg-neutral-300 hover:bg-neutral-500'
                    }`}
                    aria-label={`Go to page ${pIdx + 1} of ${totalMobilePages}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
