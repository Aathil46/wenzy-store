import React, { useState, useEffect } from 'react'
import { Sparkles, Eye } from 'lucide-react'
import { getRackProducts } from '../../lib/storeApi'
import type { Product } from '../../types/database'
import RackRailRod from './RackRailRod'
import RackTrack from './RackTrack'
import RackFocusModal from './RackFocusModal'

/**
 * Built-in preview pieces with authentic high-resolution studio cutouts,
 * demonstrating natural hanging drape, 3D hover turn, and FLIP inspection
 * before custom pieces are uploaded via the admin portal.
 */
const DEMO_SHOWCASE_PIECES: Product[] = [
  {
    id: 'demo-rack-1',
    name: 'OVERSIZED VINTAGE HOODIE',
    slug: 'oversized-vintage-hoodie',
    description: 'Heavyweight 240+ GSM combed French Terry with vintage mineral wash.',
    price: 1999,
    compare_at_price: 2999,
    is_active: true,
    is_featured: true,
    is_new: true,
    in_clothing_rail: true,
    rail_display_order: 1,
    details: {
      fabric: '100% Combed Cotton French Terry',
      gsm: 240,
      fit: 'Oversized Boxy Fit',
    },
    images: [
      {
        id: 'img-demo-1-side',
        product_id: 'demo-rack-1',
        image_url: 'https://nike-makknzjs.myshopify.com/cdn/shop/files/2610071514447647.webp',
        display_order: 1,
        is_primary: false,
        view_type: 'side',
        created_at: new Date().toISOString(),
      },
      {
        id: 'img-demo-1-front',
        product_id: 'demo-rack-1',
        image_url: 'https://nike-makknzjs.myshopify.com/cdn/shop/files/2610071514403809.webp',
        display_order: 2,
        is_primary: true,
        view_type: 'front',
        created_at: new Date().toISOString(),
      },
      {
        id: 'img-demo-1-back',
        product_id: 'demo-rack-1',
        image_url: 'https://nike-makknzjs.myshopify.com/cdn/shop/files/2610071514388245.webp',
        display_order: 3,
        is_primary: false,
        view_type: 'back',
        created_at: new Date().toISOString(),
      },
    ],
    variants: [
      { id: 'v1-s', product_id: 'demo-rack-1', size: 'S', color: 'Vintage Grey', stock_quantity: 8, created_at: '', updated_at: '' },
      { id: 'v1-m', product_id: 'demo-rack-1', size: 'M', color: 'Vintage Grey', stock_quantity: 12, created_at: '', updated_at: '' },
      { id: 'v1-l', product_id: 'demo-rack-1', size: 'L', color: 'Vintage Grey', stock_quantity: 5, created_at: '', updated_at: '' },
      { id: 'v1-xl', product_id: 'demo-rack-1', size: 'XL', color: 'Vintage Grey', stock_quantity: 2, created_at: '', updated_at: '' },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-rack-2',
    name: 'BRUTALIST TAILORED BLAZER',
    slug: 'brutalist-tailored-blazer',
    description: 'Structured architectural blazer with raw edge finish and industrial hardware.',
    price: 3499,
    compare_at_price: 4999,
    is_active: true,
    is_featured: true,
    is_new: true,
    in_clothing_rail: true,
    rail_display_order: 2,
    details: {
      fabric: 'Heavy Cotton Canvas Blend',
      gsm: 320,
      fit: 'Relaxed Tailored Silhouette',
    },
    images: [
      {
        id: 'img-demo-2-side',
        product_id: 'demo-rack-2',
        image_url: 'https://nike-makknzjs.myshopify.com/cdn/shop/files/2610071515248388.webp',
        display_order: 1,
        is_primary: false,
        view_type: 'side',
        created_at: new Date().toISOString(),
      },
      {
        id: 'img-demo-2-front',
        product_id: 'demo-rack-2',
        image_url: 'https://nike-makknzjs.myshopify.com/cdn/shop/files/2610071514560224.webp',
        display_order: 2,
        is_primary: true,
        view_type: 'front',
        created_at: new Date().toISOString(),
      },
      {
        id: 'img-demo-2-back',
        product_id: 'demo-rack-2',
        image_url: 'https://nike-makknzjs.myshopify.com/cdn/shop/files/2610071514492742.webp',
        display_order: 3,
        is_primary: false,
        view_type: 'back',
        created_at: new Date().toISOString(),
      },
    ],
    variants: [
      { id: 'v2-s', product_id: 'demo-rack-2', size: 'S', color: 'Pitch Black', stock_quantity: 4, created_at: '', updated_at: '' },
      { id: 'v2-m', product_id: 'demo-rack-2', size: 'M', color: 'Pitch Black', stock_quantity: 8, created_at: '', updated_at: '' },
      { id: 'v2-l', product_id: 'demo-rack-2', size: 'L', color: 'Pitch Black', stock_quantity: 6, created_at: '', updated_at: '' },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-rack-3',
    name: 'BOXY FRENCH TERRY CREWNECK',
    slug: 'boxy-french-terry-crewneck',
    description: 'Minimalist drop-shoulder crewneck with tonal silicone chest print.',
    price: 1599,
    compare_at_price: 2299,
    is_active: true,
    is_featured: true,
    is_new: true,
    in_clothing_rail: true,
    rail_display_order: 3,
    details: {
      fabric: '100% Combed Cotton Single Jersey',
      gsm: 240,
      fit: 'Oversized Drop-Shoulder Fit',
    },
    images: [
      {
        id: 'img-demo-3-side',
        product_id: 'demo-rack-3',
        image_url: 'https://nike-makknzjs.myshopify.com/cdn/shop/files/2610071517384792.webp',
        display_order: 1,
        is_primary: false,
        view_type: 'side',
        created_at: new Date().toISOString(),
      },
      {
        id: 'img-demo-3-front',
        product_id: 'demo-rack-3',
        image_url: 'https://nike-makknzjs.myshopify.com/cdn/shop/files/2610071517318112.webp',
        display_order: 2,
        is_primary: true,
        view_type: 'front',
        created_at: new Date().toISOString(),
      },
      {
        id: 'img-demo-3-back',
        product_id: 'demo-rack-3',
        image_url: 'https://nike-makknzjs.myshopify.com/cdn/shop/files/2610071517292954.webp',
        display_order: 3,
        is_primary: false,
        view_type: 'back',
        created_at: new Date().toISOString(),
      },
    ],
    variants: [
      { id: 'v3-m', product_id: 'demo-rack-3', size: 'M', color: 'Washed Ash', stock_quantity: 11, created_at: '', updated_at: '' },
      { id: 'v3-l', product_id: 'demo-rack-3', size: 'L', color: 'Washed Ash', stock_quantity: 7, created_at: '', updated_at: '' },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-rack-4',
    name: 'HEAVYWEIGHT STREETWEAR TEE',
    slug: 'heavyweight-streetwear-tee',
    description: 'High-density screenprint chest hit with raw industrial typography on reverse.',
    price: 1199,
    compare_at_price: 1799,
    is_active: true,
    is_featured: true,
    is_new: true,
    in_clothing_rail: true,
    rail_display_order: 4,
    details: {
      fabric: '100% Combed Heavy Cotton',
      gsm: 260,
      fit: 'Relaxed Streetwear Silhouette',
    },
    images: [
      {
        id: 'img-demo-4-side',
        product_id: 'demo-rack-4',
        image_url: 'https://nike-makknzjs.myshopify.com/cdn/shop/files/2610071516549024.webp',
        display_order: 1,
        is_primary: false,
        view_type: 'side',
        created_at: new Date().toISOString(),
      },
      {
        id: 'img-demo-4-front',
        product_id: 'demo-rack-4',
        image_url: 'https://nike-makknzjs.myshopify.com/cdn/shop/files/2610071515314737.webp',
        display_order: 2,
        is_primary: true,
        view_type: 'front',
        created_at: new Date().toISOString(),
      },
      {
        id: 'img-demo-4-back',
        product_id: 'demo-rack-4',
        image_url: 'https://nike-makknzjs.myshopify.com/cdn/shop/files/2610071515554298.webp',
        display_order: 3,
        is_primary: false,
        view_type: 'back',
        created_at: new Date().toISOString(),
      },
    ],
    variants: [
      { id: 'v4-s', product_id: 'demo-rack-4', size: 'S', color: 'Charcoal', stock_quantity: 5, created_at: '', updated_at: '' },
      { id: 'v4-m', product_id: 'demo-rack-4', size: 'M', color: 'Charcoal', stock_quantity: 9, created_at: '', updated_at: '' },
      { id: 'v4-l', product_id: 'demo-rack-4', size: 'L', color: 'Charcoal', stock_quantity: 12, created_at: '', updated_at: '' },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

/**
 * WENZY RACK Section Component
 * Placed directly below the homepage hero banner.
 * Presents the interactive curved clothing rail with photorealistic hanging garments,
 * hover 3D reveal, pendulum sway physics, drag momentum, and shared-element flight modal.
 */
export default function WenzyRackSection() {
  const [liveProducts, setLiveProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Selection & FLIP Flight state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [sourceElement, setSourceElement] = useState<HTMLElement | null>(null)
  const [fromRect, setFromRect] = useState<DOMRect | null>(null)
  const [focusModalOpen, setFocusModalOpen] = useState(false)

  const loadRackData = async () => {
    setLoading(true)
    try {
      const rackItems = await getRackProducts()
      setLiveProducts(rackItems)
    } catch (err) {
      console.warn('WENZY RACK: Live database returned empty or error, using showcase items:', err)
      setLiveProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRackData()
  }, [])

  // Use live database products when valid (3/3 images), or showcase demonstration items
  const isShowcaseMode = liveProducts.length === 0
  const activeProducts = isShowcaseMode ? DEMO_SHOWCASE_PIECES : liveProducts

  const handleSelectProduct = (
    product: Product,
    element: HTMLElement,
    rect: DOMRect
  ) => {
    setSelectedProduct(product)
    setSourceElement(element)
    setFromRect(rect)
    setFocusModalOpen(true)
  }

  const handleCloseModal = () => {
    setFocusModalOpen(false)
  }

  const handleCloseComplete = () => {
    setSelectedProduct(null)
    setSourceElement(null)
    setFromRect(null)
  }

  return (
    <section className="relative w-full py-10 sm:py-14 bg-white border-b border-neutral-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading & Subtitle */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 rounded-full text-neutral-800 text-[10px] font-black uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
            <span>Interactive Boutique Experience</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-neutral-950 font-heading">
            WENZY RACK
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 uppercase tracking-widest mt-2 font-medium">
            — Hover a piece · click to look closer
          </p>

          {/* Mode Indicator Banner */}
          {isShowcaseMode && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-neutral-900 text-neutral-200 text-[10px] font-bold uppercase tracking-wider rounded-full">
              <Eye className="w-3 h-3 text-emerald-400" />
              <span>Showcase Preview ({activeProducts.length} Pieces) · Ready to upload real studio cutouts</span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-full max-w-2xl px-8">
              <RackRailRod />
            </div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-neutral-400 animate-ping" />
              <span>Suspending Rail Collection...</span>
            </div>
          </div>
        ) : (
          /* Active Interactive Clothing Rail */
          <div className="relative w-full pt-2">
            {/* 1. Curved Metallic SVG Rail Rod */}
            <RackRailRod className="mb-[-34px] z-20" />

            {/* 2. Drag/Swipe Horizontal Track */}
            <RackTrack
              products={activeProducts}
              onSelectProduct={handleSelectProduct}
              activeFocusProduct={selectedProduct}
            />
          </div>
        )}
      </div>

      {/* 3. Focused Close-Up 3D Modal (with FLIP Shared-Element Flight) */}
      <RackFocusModal
        isOpen={focusModalOpen}
        product={selectedProduct}
        fromRect={fromRect}
        sourceElement={sourceElement}
        onClose={handleCloseModal}
        onCloseComplete={handleCloseComplete}
      />
    </section>
  )
}
