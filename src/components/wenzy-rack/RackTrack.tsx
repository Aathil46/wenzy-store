import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Product } from '../../types/database'
import RackHangerItem from './RackHangerItem'

interface RackTrackProps {
  products: Product[]
  onSelectProduct: (product: Product) => void
}

/**
 * Horizontal clothing rail drag track.
 * Supports:
 * - Pointer and touch drag with velocity-based momentum coasting
 * - Seamless looping without hitting boundary walls
 * - Dynamic neighbor gap expansion on hover (data-hover-gap="18")
 * - Left/Right pan controls and progress line indicator
 */
export default function RackTrack({ products, onSelectProduct }: RackTrackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  // Duplicate items 3x for continuous seamless looping if there are multiple items
  const loopMultiplier = products.length >= 2 ? 3 : 1
  const displayProducts = Array(loopMultiplier).fill(products).flat()

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [scrollProgress, setScrollProgress] = useState(0)

  // Drag physics state refs
  const isDragging = useRef(false)
  const startX = useRef(0)
  const currentTranslate = useRef(0)
  const prevTranslate = useRef(0)
  const lastX = useRef(0)
  const velocity = useRef(0)
  const animationFrameId = useRef<number | null>(null)
  const hasMoved = useRef(false)

  // Update progress indicator
  const updateProgress = useCallback(() => {
    if (!containerRef.current || !trackRef.current) return
    const containerWidth = containerRef.current.clientWidth
    const trackWidth = trackRef.current.scrollWidth
    const maxScroll = Math.max(1, trackWidth - containerWidth)
    const progress = Math.min(1, Math.max(0, -currentTranslate.current / maxScroll))
    setScrollProgress(progress)
  }, [])

  // Apply transform directly to track for 60 FPS performance
  const setTrackPosition = (x: number) => {
    if (!trackRef.current || !containerRef.current) return

    const containerWidth = containerRef.current.clientWidth
    const trackWidth = trackRef.current.scrollWidth
    const singleSetWidth = trackWidth / loopMultiplier

    // Infinite wrap handling
    let wrappedX = x
    if (loopMultiplier > 1 && singleSetWidth > 0) {
      if (wrappedX > 0) {
        wrappedX -= singleSetWidth
      } else if (wrappedX < -singleSetWidth * 2) {
        wrappedX += singleSetWidth
      }
    } else {
      const minBound = -(trackWidth - containerWidth)
      wrappedX = Math.min(0, Math.max(minBound, wrappedX))
    }

    currentTranslate.current = wrappedX
    trackRef.current.style.transform = `translateX(${wrappedX}px)`
    updateProgress()
  }

  // Momentum coasting loop
  const coast = () => {
    if (Math.abs(velocity.current) > 0.3) {
      currentTranslate.current += velocity.current
      velocity.current *= 0.92 // deceleration factor
      setTrackPosition(currentTranslate.current)
      animationFrameId.current = requestAnimationFrame(coast)
    } else {
      velocity.current = 0
      prevTranslate.current = currentTranslate.current
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current)
    }
  }

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true
    hasMoved.current = false
    startX.current = e.clientX
    lastX.current = e.clientX
    prevTranslate.current = currentTranslate.current
    velocity.current = 0

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
    }
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
  }

  const handlePointerUp = () => {
    if (!isDragging.current) return
    isDragging.current = false
    prevTranslate.current = currentTranslate.current
    animationFrameId.current = requestAnimationFrame(coast)
  }

  // Arrow navigation buttons
  const panBy = (distance: number) => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current)
    const target = currentTranslate.current + distance
    setTrackPosition(target)
    prevTranslate.current = target
  }

  useEffect(() => {
    // Initial centering
    if (containerRef.current && trackRef.current && loopMultiplier > 1) {
      const singleSetWidth = trackRef.current.scrollWidth / loopMultiplier
      setTrackPosition(-singleSetWidth * 0.5)
      prevTranslate.current = -singleSetWidth * 0.5
    }
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current)
    }
  }, [products.length])

  return (
    <div className="relative w-full overflow-hidden select-none group">
      {/* Pan Navigation Buttons (Desktop only, visible on rail hover) */}
      <button
        type="button"
        onClick={() => panBy(320)}
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-40 w-11 h-11 items-center justify-center bg-black/80 hover:bg-black text-white rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs border border-white/10"
        title="Scroll left"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={() => panBy(-320)}
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-40 w-11 h-11 items-center justify-center bg-black/80 hover:bg-black text-white rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs border border-white/10"
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
        className="w-full overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y py-6"
      >
        <div
          ref={trackRef}
          className="flex items-start gap-8 sm:gap-12 md:gap-16 px-8 sm:px-16 w-max will-change-transform"
        >
          {displayProducts.map((product, idx) => {
            const isHovered = hoveredIdx === idx
            const isNeighbor = hoveredIdx !== null && Math.abs(hoveredIdx - idx) === 1
            const neighborDir = hoveredIdx !== null && idx < hoveredIdx ? 'left' : 'right'

            return (
              <div key={`${product.id}-${idx}`} className="shrink-0">
                <RackHangerItem
                  product={product}
                  index={idx}
                  isHovered={isHovered}
                  isNeighborHovered={isNeighbor}
                  neighborDirection={neighborDir}
                  onHover={(hovered) => setHoveredIdx(hovered ? idx : null)}
                  onSelect={(p) => {
                    // Only trigger click if user didn't drag
                    if (!hasMoved.current) {
                      onSelectProduct(p)
                    }
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Minimalist Progress Line Indicator (observed on reference site) */}
      <div className="max-w-xs mx-auto mt-4 px-4">
        <div className="h-0.5 w-full bg-neutral-200 overflow-hidden rounded-full">
          <div
            className="h-full bg-neutral-900 transition-all duration-150"
            style={{ width: `${Math.max(15, scrollProgress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
