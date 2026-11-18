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

const SET_COUNT = 5 // 5 repeat sets for infinite seamless looping (2 before, 1 center, 2 after)
const START_PAD = 14 // 14px comfortable gutter at resting center

/**
 * High-performance clothing rail track matching the reference Nike Shopify engine:
 * - 60 FPS rAF physics engine:
 *   1. Damped pendulum swing physics (--sr-sw)
 *   2. Exponential-decay hover turn from side to front with 3D perspective rotation
 *   3. Neighbor swing impulse and dynamic spacing expansion
 *   4. Inertial drag coasting with velocity preservation
 *
 * Responsive Architecture:
 * - DESKTOP (>= 768px):
 *   - Unchanged continuous rail (centered if <= 4 items, draggable if > 4 items)
 *   - Arrow buttons for panning
 *   - Desktop mouse hover 3D reveal
 * - MOBILE (< 768px):
 *   - True infinite horizontal loop (items continue endlessly in both directions, 0 seams)
 *   - Direct finger-following 1:1 touch/pointer drag
 *   - Continuous partial entry of subsequent garments (comfortable 4-item resting fit)
 *   - Smooth release with exponential momentum deceleration
 *   - Two-tap interaction (1st tap turns front on rail, 2nd tap opens product detail)
 *   - Tap outside returns turned piece to side profile
 */
export default function RackTrack({
  products,
  onSelectProduct,
  activeFocusProduct,
}: RackTrackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const mobileTrackRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Responsive mobile detection
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false
  })

  // Track viewport resize for mobile vs desktop mode
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // -------------------------------------------------------------
  // Mobile Infinite Loop State & Data
  // -------------------------------------------------------------
  // Ensure base cycle has at least 6 products so 1 set is comfortably wider than any viewport
  const baseCycleProducts = useMemo(() => {
    if (products.length === 0) return []
    let list: Product[] = []
    while (list.length < 6) {
      list = list.concat(products)
    }
    return list
  }, [products])

  // Create 5 identical repeat sets for seamless infinite loop buffer
  const mobileItems = useMemo(() => {
    if (baseCycleProducts.length === 0) return []
    const items: Product[] = []
    for (let s = 0; s < SET_COUNT; s++) {
      items.push(...baseCycleProducts)
    }
    return items
  }, [baseCycleProducts])

  const cycleLen = baseCycleProducts.length
  const cycleWidthRef = useRef<number>(0)
  const mobileTrackTranslate = useRef<number>(0)
  const hasInitializedMobilePos = useRef<boolean>(false)

  // Mobile touch / pointer drag state
  const isMobileDragging = useRef(false)
  const hasMobileMoved = useRef(false)
  const mobileStartX = useRef(0)
  const mobileStartY = useRef(0)
  const mobileLastX = useRef(0)
  const mobileLastTime = useRef(0)
  const mobileVelocity = useRef(0)
  const mobileMomentumRaf = useRef<number | null>(null)
  const isHorizontalGesture = useRef<boolean | null>(null)
  const touchActiveRef = useRef(false)

  // Track currently turned product id on mobile
  const tappedProdId = useRef<string | null>(null)

  // -------------------------------------------------------------
  // Desktop Drag State (> 4 items)
  // -------------------------------------------------------------
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

  // Brushing impulse across visible mobile garments while dragging / gliding
  const applyBrushingSwing = useCallback(
    (v: number) => {
      if (Math.abs(v) < 0.2 || itemStates.current.length === 0) return
      const centerIdx = Math.floor(itemStates.current.length / 2)
      for (let i = centerIdx - 4; i <= centerIdx + 4; i++) {
        if (itemStates.current[i]?.swing) {
          itemStates.current[i].swing.v += v * (0.2 + (Math.abs(i) % 3) * 0.05)
        }
      }
    },
    []
  )

  // -------------------------------------------------------------
  // Desktop Drag Handlers & Helpers
  // -------------------------------------------------------------
  const setTrackPosition = useCallback(
    (x: number) => {
      if (!trackRef.current || !containerRef.current || products.length <= 4) return
      const containerWidth = containerRef.current.clientWidth
      const trackWidth = trackRef.current.scrollWidth

      const minBound = Math.min(0, -(trackWidth - containerWidth))
      const clampedX = Math.min(0, Math.max(minBound, x))

      currentTranslate.current = clampedX
      trackRef.current.style.transform = `translateX(${clampedX}px)`
    },
    [products.length]
  )

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

  const panBy = (distance: number) => {
    if (dragRaf.current) cancelAnimationFrame(dragRaf.current)
    const target = currentTranslate.current + distance
    setTrackPosition(target)
  }

  const setHover = useCallback(
    (idx: number | null) => {
      if (lastPointerType.current === 'touch') return
      if (curHoverIdx.current === idx) return

      const prev = curHoverIdx.current
      if (prev !== null && itemStates.current[prev]) {
        itemStates.current[prev].t = 0
        impulse(prev - 1, 2.5)
        impulse(prev + 1, -2.5)
      }

      curHoverIdx.current = idx
      if (idx !== null && itemStates.current[idx]) {
        itemStates.current[idx].t = 1
        itemStates.current[idx].swing.a = 0
        itemStates.current[idx].swing.v = 0
        impulse(idx - 1, -5)
        impulse(idx + 1, 5)
      }
    },
    [impulse]
  )

  // -------------------------------------------------------------
  // Mobile Infinite Seamless Looping Engine
  // -------------------------------------------------------------
  const wrapTranslate = useCallback((x: number, cWidth: number) => {
    if (cWidth <= 0) return x
    let wrapped = x
    const lowerBound = -3 * cWidth + START_PAD
    const upperBound = -cWidth + START_PAD
    while (wrapped < lowerBound) {
      wrapped += cWidth
    }
    while (wrapped > upperBound) {
      wrapped -= cWidth
    }
    return wrapped
  }, [])

  const applyMobileTranslate = useCallback((x: number) => {
    if (!mobileTrackRef.current) return
    mobileTrackRef.current.style.transform = `translateX(${x}px)`
  }, [])

  // Natural momentum release glide with exponential deceleration matching Nike reference
  const startMobileGlide = useCallback(
    (initialV: number) => {
      if (mobileMomentumRaf.current) cancelAnimationFrame(mobileMomentumRaf.current)
      let v = initialV
      let lastTime = performance.now()

      const step = (ts: number) => {
        const dt = Math.min(40, ts - lastTime)
        lastTime = ts

        const nextX = mobileTrackTranslate.current + v * dt
        const wrappedX = wrapTranslate(nextX, cycleWidthRef.current)
        mobileTrackTranslate.current = wrappedX
        applyMobileTranslate(wrappedX)

        // Exponential decay: v *= 0.94^(dt/16)
        v *= Math.pow(0.94, dt / 16)

        if (Math.abs(v) > 0.08) {
          applyBrushingSwing(clamp(v * 2.5, -2, 2))
        }

        if (Math.abs(v) > 0.02) {
          mobileMomentumRaf.current = requestAnimationFrame(step)
        } else {
          mobileVelocity.current = 0
          mobileMomentumRaf.current = null
        }
      }

      mobileMomentumRaf.current = requestAnimationFrame(step)
    },
    [wrapTranslate, applyMobileTranslate, applyBrushingSwing]
  )

  // Mobile Touch Handlers
  const handleMobileTouchStart = (e: React.TouchEvent) => {
    touchActiveRef.current = true
    lastPointerType.current = 'touch'

    if (mobileMomentumRaf.current) {
      cancelAnimationFrame(mobileMomentumRaf.current)
      mobileMomentumRaf.current = null
    }

    isMobileDragging.current = true
    hasMobileMoved.current = false
    isHorizontalGesture.current = null

    const touch = e.touches[0]
    mobileStartX.current = touch.clientX
    mobileStartY.current = touch.clientY
    mobileLastX.current = touch.clientX
    mobileLastTime.current = performance.now()
    mobileVelocity.current = 0
  }

  const handleMobileTouchMove = (e: React.TouchEvent) => {
    if (!isMobileDragging.current || e.touches.length !== 1) return

    const touch = e.touches[0]
    const currentX = touch.clientX
    const currentY = touch.clientY
    const totalDx = currentX - mobileStartX.current
    const totalDy = currentY - mobileStartY.current
    const dx = currentX - mobileLastX.current

    // Direction lock: wait for 5px movement
    if (isHorizontalGesture.current === null && (Math.abs(totalDx) > 5 || Math.abs(totalDy) > 5)) {
      isHorizontalGesture.current = Math.abs(totalDx) >= Math.abs(totalDy)
    }

    if (isHorizontalGesture.current === false) return

    if (e.cancelable) {
      e.preventDefault()
    }

    if (Math.abs(totalDx) > 7) {
      hasMobileMoved.current = true
      // Return any turned piece back to side profile on rack during swipe
      if (tappedProdId.current !== null) {
        setTappedProduct(null)
      }
    }

    const now = performance.now()
    const dt = Math.max(1, now - mobileLastTime.current)
    const instantV = dx / dt
    mobileVelocity.current = mobileVelocity.current * 0.4 + instantV * 0.6
    mobileLastX.current = currentX
    mobileLastTime.current = now

    // Direct 1:1 finger tracking
    const nextX = mobileTrackTranslate.current + dx
    const wrappedX = wrapTranslate(nextX, cycleWidthRef.current)
    mobileTrackTranslate.current = wrappedX
    applyMobileTranslate(wrappedX)

    if (Math.abs(dx) > 3) {
      applyBrushingSwing(clamp(dx * 0.12, -2.5, 2.5))
    }
  }

  const handleMobileTouchEnd = () => {
    if (!isMobileDragging.current) return
    isMobileDragging.current = false

    const timeSinceLast = performance.now() - mobileLastTime.current
    if (hasMobileMoved.current && timeSinceLast < 120 && Math.abs(mobileVelocity.current) > 0.05) {
      const v = clamp(mobileVelocity.current, -2.5, 2.5)
      startMobileGlide(v)
    } else {
      mobileVelocity.current = 0
    }

    setTimeout(() => {
      hasMobileMoved.current = false
      touchActiveRef.current = false
    }, 60)
  }

  // Pointer Handlers for Mouse Testing on Mobile Viewports
  const handleMobilePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || touchActiveRef.current) return
    if (e.button !== 0) return

    lastPointerType.current = 'mouse'
    if (mobileMomentumRaf.current) {
      cancelAnimationFrame(mobileMomentumRaf.current)
      mobileMomentumRaf.current = null
    }

    isMobileDragging.current = true
    hasMobileMoved.current = false
    isHorizontalGesture.current = null

    mobileStartX.current = e.clientX
    mobileStartY.current = e.clientY
    mobileLastX.current = e.clientX
    mobileLastTime.current = performance.now()
    mobileVelocity.current = 0
  }

  const handleMobilePointerMove = (e: React.PointerEvent) => {
    if (!isMobileDragging.current || e.pointerType === 'touch' || touchActiveRef.current) return

    const currentX = e.clientX
    const currentY = e.clientY
    const totalDx = currentX - mobileStartX.current
    const totalDy = currentY - mobileStartY.current
    const dx = currentX - mobileLastX.current

    if (isHorizontalGesture.current === null && (Math.abs(totalDx) > 5 || Math.abs(totalDy) > 5)) {
      isHorizontalGesture.current = Math.abs(totalDx) >= Math.abs(totalDy)
    }

    if (isHorizontalGesture.current === false) return

    if (Math.abs(totalDx) > 7) {
      hasMobileMoved.current = true
      if (tappedProdId.current !== null) {
        setTappedProduct(null)
      }
    }

    const now = performance.now()
    const dt = Math.max(1, now - mobileLastTime.current)
    const instantV = dx / dt
    mobileVelocity.current = mobileVelocity.current * 0.4 + instantV * 0.6
    mobileLastX.current = currentX
    mobileLastTime.current = now

    const nextX = mobileTrackTranslate.current + dx
    const wrappedX = wrapTranslate(nextX, cycleWidthRef.current)
    mobileTrackTranslate.current = wrappedX
    applyMobileTranslate(wrappedX)

    if (Math.abs(dx) > 3) {
      applyBrushingSwing(clamp(dx * 0.12, -2.5, 2.5))
    }
  }

  const handleMobilePointerUp = (e: React.PointerEvent) => {
    if (!isMobileDragging.current || e.pointerType === 'touch' || touchActiveRef.current) return
    isMobileDragging.current = false

    const timeSinceLast = performance.now() - mobileLastTime.current
    if (hasMobileMoved.current && timeSinceLast < 120 && Math.abs(mobileVelocity.current) > 0.05) {
      const v = clamp(mobileVelocity.current, -2.5, 2.5)
      startMobileGlide(v)
    } else {
      mobileVelocity.current = 0
    }

    setTimeout(() => {
      hasMobileMoved.current = false
    }, 60)
  }

  // Synchronously turn/unturn product across all its loop clones
  const setTappedProduct = useCallback((productId: string | null) => {
    tappedProdId.current = productId
    itemStates.current.forEach((s) => {
      if (!s || !s.element) return
      const prodId = s.element.getAttribute('data-product-id')
      if (productId && prodId === productId) {
        s.t = 1
        s.swing.a = 0
        s.swing.v = 0
      } else {
        s.t = 0
      }
    })
  }, [])

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

        // Rapidly damp any residual swing on the hovered/turned piece
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
    const isMob = window.innerWidth < 768
    itemStates.current = itemRefs.current.map((el) => {
      if (!el) {
        return {
          element: null as any,
          garment: null as any,
          views: [],
          p: 0,
          t: 0,
          hpx: isMob ? 225 : 440,
          aspectSide: 0.35,
          aspectFront: 0.68,
          swing: { a: 0, v: 0 },
        }
      }

      const garment = el.querySelector<HTMLElement>('.rack-garment') || el
      const hpx = isMob ? 225 : garment.getBoundingClientRect().height || 440

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

    // Measure mobile cycle width accurately from DOM offsetLeft
    if (isMob && cycleLen > 0) {
      const firstEl = itemRefs.current[0]
      const nextCycleEl = itemRefs.current[cycleLen]
      if (firstEl && nextCycleEl) {
        const cWidth = nextCycleEl.offsetLeft - firstEl.offsetLeft
        if (cWidth > 0) {
          cycleWidthRef.current = cWidth
          if (!hasInitializedMobilePos.current) {
            hasInitializedMobilePos.current = true
            const initialPos = -2 * cWidth + START_PAD
            mobileTrackTranslate.current = initialPos
            if (mobileTrackRef.current) {
              mobileTrackRef.current.style.transform = `translateX(${initialPos}px)`
            }
          }
        }
      }
    }
  }, [cycleLen])

  useEffect(() => {
    initItems()
    if (window.innerWidth < 768 && mobileTrackTranslate.current && mobileTrackRef.current) {
      mobileTrackRef.current.style.transform = `translateX(${mobileTrackTranslate.current}px)`
    }
    window.addEventListener('resize', initItems)
    return () => window.removeEventListener('resize', initItems)
  }, [initItems, products.length, isMobile, mobileItems.length])

  // Reset desktop track position when <= 4 items
  useEffect(() => {
    if (!isMobile && products.length <= 4 && trackRef.current) {
      trackRef.current.style.transform = 'none'
      currentTranslate.current = 0
    }
  }, [products.length, isMobile])

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

  // Global tap-outside on mobile: returns any front-facing piece back to resting side position
  useEffect(() => {
    const handleGlobalOutside = (e: Event) => {
      if (!tappedProdId.current) return
      const target = e.target as HTMLElement | null
      const item = target?.closest?.('.rack-item')
      if (!item) {
        setTappedProduct(null)
      }
    }

    document.addEventListener('pointerdown', handleGlobalOutside, true)
    document.addEventListener('touchstart', handleGlobalOutside, { capture: true, passive: true })
    return () => {
      document.removeEventListener('pointerdown', handleGlobalOutside, true)
      document.removeEventListener('touchstart', handleGlobalOutside, true)
    }
  }, [setTappedProduct])

  // Handle click / tap on garment
  const handleItemClick = (
    e: React.MouseEvent<HTMLDivElement>,
    product: Product,
    idx: number
  ) => {
    if (hasMobileMoved.current || hasMoved.current) return
    e.stopPropagation()

    const s = itemStates.current[idx]
    if (!s || !s.element) return

    // Mobile / Touch handling: Two-tap behavior matching reference
    // 1st tap turns garment to front view on the rack (touch hover reveal)
    // 2nd tap on the same garment opens the focus modal
    if (isMobile || lastPointerType.current === 'touch') {
      if (tappedProdId.current !== product.id) {
        setTappedProduct(product.id)
        impulse(idx - 1, -12)
        impulse(idx + 1, 12)
        return
      }
      // Second tap on the same garment: proceed to open focus modal
      setTappedProduct(null)
    }

    // Capture source garment rect for true FLIP flight animation
    const garment = s.garment || s.element
    const fromRect = garment.getBoundingClientRect()

    onSelectProduct(product, garment, fromRect)
  }

  // Tapping track background turns any tapped mobile piece back
  const handleBackgroundClick = () => {
    if (tappedProdId.current !== null) {
      setTappedProduct(null)
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
              id="wenzy-desktop-rack-track"
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
        /* MOBILE VIEW (< 768px): True Infinite Looping Rail             */
        /* Finger-Following Drag + Momentum Deceleration + 0 Seams       */
        /* ------------------------------------------------------------- */
        <div
          className="w-full overflow-hidden touch-pan-y pt-2 pb-5 select-none"
          onTouchStart={handleMobileTouchStart}
          onTouchMove={handleMobileTouchMove}
          onTouchEnd={handleMobileTouchEnd}
          onTouchCancel={handleMobileTouchEnd}
          onPointerDown={handleMobilePointerDown}
          onPointerMove={handleMobilePointerMove}
          onPointerUp={handleMobilePointerUp}
          onPointerCancel={handleMobilePointerUp}
        >
          <div
            ref={mobileTrackRef}
            id="wenzy-mobile-rack-track"
            className="flex items-start gap-3 will-change-transform"
            style={{ width: 'max-content' }}
          >
            {mobileItems.map((product, globalIdx) => (
              <div
                key={`mob-item-${globalIdx}-${product.id}`}
                className="shrink-0"
              >
                <RackHangerItem
                  ref={(el) => {
                    itemRefs.current[globalIdx] = el
                  }}
                  product={product}
                  index={globalIdx}
                  onClick={(e) => handleItemClick(e, product, globalIdx)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
