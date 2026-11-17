import React from 'react'
import type { Product } from '../../types/database'

interface RackHangerItemProps {
  product: Product
  index: number
  isHovered: boolean
  isNeighborHovered: boolean
  neighborDirection?: 'left' | 'right'
  onHover: (hovered: boolean) => void
  onSelect: (product: Product) => void
}

/**
 * Individual hanging piece on the WENZY RACK.
 * Features:
 * - Handcrafted SVG wooden hanger with chrome hook
 * - Side-profile cutout photography with natural textile drape
 * - Hanging kraft paper price tag suspended from collar
 * - Hover micro-interactions: vertical lift, pendulum sway, and neighbor expansion
 */
export default function RackHangerItem({
  product,
  isHovered,
  isNeighborHovered,
  neighborDirection,
  onHover,
  onSelect,
}: RackHangerItemProps) {
  // Extract the mandatory side-profile cutout image
  const sideImage = product.images?.find((img) => img.view_type === 'side')?.image_url

  // If no side image exists, return null (strict requirement: never display without side image)
  if (!sideImage) return null

  // Neighbor push offset (18px outward expansion matching reference site)
  let neighborMargin = ''
  if (isNeighborHovered) {
    neighborMargin = neighborDirection === 'left' ? '-translate-x-4' : 'translate-x-4'
  }

  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={() => onSelect(product)}
      className={`relative flex flex-col items-center cursor-pointer select-none transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
        isHovered
          ? '-translate-y-3.5 scale-102 z-30'
          : 'translate-y-0 z-10'
      } ${neighborMargin}`}
      style={{
        transformOrigin: 'top center',
      }}
    >
      {/* 1. Realistic Wooden Hanger with Chrome Hook */}
      <div className="relative w-32 sm:w-40 h-16 flex justify-center -mb-4 z-20 pointer-events-none">
        <svg
          viewBox="0 0 160 64"
          className="w-full h-full overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Wooden Texture Gradient */}
            <linearGradient id="hanger-wood" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8C5831" />
              <stop offset="30%" stopColor="#A66F42" />
              <stop offset="60%" stopColor="#6E411F" />
              <stop offset="100%" stopColor="#4A2B13" />
            </linearGradient>

            {/* Chrome Hook Gradient */}
            <linearGradient id="hook-metal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#CBD5E1" />
              <stop offset="50%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#64748B" />
            </linearGradient>

            <filter id="hanger-shadow" x="-10%" y="-10%" width="120%" height="150%">
              <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Chrome Swivel Hook hooked over the rail */}
          <path
            d="M 80 22 C 80 14, 88 12, 88 5 C 88 1, 83 -2, 79 1 C 76 3, 76 7, 76 8"
            stroke="url(#hook-metal)"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Hanger Center Brass Stud */}
          <circle cx="80" cy="23" r="2.5" fill="#F1F5F9" stroke="#475569" strokeWidth="0.8" />

          {/* Solid Wooden Shoulder Bar */}
          <path
            d="M 12 48 Q 80 22 148 48 C 151 49, 150 54, 145 53 Q 80 30 15 53 C 10 54, 9 49, 12 48 Z"
            fill="url(#hanger-wood)"
            filter="url(#hanger-shadow)"
          />

          {/* Subtle wood-grain bevel highlight */}
          <path
            d="M 16 48 Q 80 24 144 48"
            stroke="#D4A373"
            strokeWidth="0.8"
            strokeOpacity="0.6"
            fill="none"
          />
        </svg>

        {/* 2. Paper Hanging Price Tag (hanging from hanger hook collar via string) */}
        <div className="absolute top-7 -right-1 sm:right-1 z-30 pointer-events-none transform rotate-6 origin-top">
          {/* Tag Thread String */}
          <div className="w-[1px] h-4 bg-neutral-400 mx-auto" />
          {/* Kraft Paper Tag */}
          <div className="bg-neutral-900 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-tight rounded-xs shadow-md border border-neutral-700 whitespace-nowrap">
            ₹{product.price.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* 3. Garment Side-Profile Cutout Image */}
      <div
        className={`relative w-44 sm:w-56 md:w-64 h-[360px] sm:h-[420px] md:h-[460px] flex items-center justify-center transition-transform duration-700 ${
          isHovered ? 'animate-[rackSway_3s_ease-in-out_infinite]' : ''
        }`}
      >
        <img
          src={sideImage}
          alt={`${product.name} - Side View`}
          className="h-full w-auto max-w-full object-contain filter drop-shadow-[0_12px_18px_rgba(0,0,0,0.18)] pointer-events-none"
          loading="lazy"
        />

        {/* Subtle quick-inspect label on hover */}
        <div
          className={`absolute bottom-2 inset-x-0 mx-auto w-fit px-3 py-1 bg-black/85 text-white text-[9px] font-bold uppercase tracking-wider rounded-full backdrop-blur-xs transition-opacity duration-300 pointer-events-none ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Click to Inspect →
        </div>
      </div>

      {/* 4. Product Name Label below garment */}
      <div className="mt-2 text-center max-w-[180px]">
        <div className="text-[11px] font-black uppercase tracking-wider text-neutral-900 truncate">
          {product.name}
        </div>
        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
          ₹{product.price.toLocaleString('en-IN')}
        </div>
      </div>
    </div>
  )
}
