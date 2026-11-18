import React, { useState, useEffect } from 'react'
import { Sparkles, Eye } from 'lucide-react'
import { getRackProducts } from '../../lib/storeApi'
import type { Product } from '../../types/database'
import RackRailRod from './RackRailRod'
import RackTrack from './RackTrack'
import RackFocusModal from './RackFocusModal'

/**
 * Built-in preview pieces available before real custom studio cutouts
 * are uploaded via Admin Products, allowing the user to immediately experience
 * the clothing rail, hover lift, pendulum sway, drag momentum, and 3D flip modal.
 */
const DEMO_SHOWCASE_PIECES: Product[] = [
  {
    id: 'demo-rack-1',
    name: 'OVERSIZED ACID WASH HOODIE',
    slug: 'oversized-acid-wash-hoodie',
    description: 'Heavyweight 240+ GSM combed French Terry with vintage mineral fade.',
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
        image_url: '/assets/wenzy_front_texture.png',
        display_order: 1,
        is_primary: false,
        view_type: 'side',
        created_at: new Date().toISOString(),
      },
      {
        id: 'img-demo-1-front',
        product_id: 'demo-rack-1',
        image_url: '/assets/wenzy_front_texture.png',
        display_order: 2,
        is_primary: true,
        view_type: 'front',
        created_at: new Date().toISOString(),
      },
      {
        id: 'img-demo-1-back',
        product_id: 'demo-rack-1',
        image_url: '/assets/wenzy_back_texture.png',
        display_order: 3,
        is_primary: false,
        view_type: 'back',
        created_at: new Date().toISOString(),
      },
    ],
    variants: [
      { id: 'v1-s', product_id: 'demo-rack-1', size: 'S', color: 'Vintage Black', stock_quantity: 8, created_at: '', updated_at: '' },
      { id: 'v1-m', product_id: 'demo-rack-1', size: 'M', color: 'Vintage Black', stock_quantity: 12, created_at: '', updated_at: '' },
      { id: 'v1-l', product_id: 'demo-rack-1', size: 'L', color: 'Vintage Black', stock_quantity: 5, created_at: '', updated_at: '' },
      { id: 'v1-xl', product_id: 'demo-rack-1', size: 'XL', color: 'Vintage Black', stock_quantity: 0, created_at: '', updated_at: '' },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-rack-2',
    name: 'CYBER CREST BOXY TEE',
    slug: 'cyber-crest-boxy-tee',
    description: 'High-density screenprint chest logo with oversized streetwear back print.',
    price: 1299,
    compare_at_price: 1899,
    is_active: true,
    is_featured: true,
    is_new: true,
    in_clothing_rail: true,
    rail_display_order: 2,
    details: {
      fabric: '100% Combed Cotton Single Jersey',
      gsm: 240,
      fit: 'Drop Shoulder Relaxed Fit',
    },
    images: [
      {
        id: 'img-demo-2-side',
        product_id: 'demo-rack-2',
        image_url: '/assets/wenzy_front_texture.png',
        display_order: 1,
        is_primary: false,
        view_type: 'side',
        created_at: new Date().toISOString(),
      },
      {
        id: 'img-demo-2-front',
        product_id: 'demo-rack-2',
        image_url: '/assets/wenzy_front_texture.png',
        display_order: 2,
        is_primary: true,
        view_type: 'front',
        created_at: new Date().toISOString(),
      },
      {
        id: 'img-demo-2-back',
        product_id: 'demo-rack-2',
        image_url: '/assets/wenzy_back_texture.png',
        display_order: 3,
        is_primary: false,
        view_type: 'back',
        created_at: new Date().toISOString(),
      },
    ],
    variants: [
      { id: 'v2-s', product_id: 'demo-rack-2', size: 'S', color: 'Washed Charcoal', stock_quantity: 10, created_at: '', updated_at: '' },
      { id: 'v2-m', product_id: 'demo-rack-2', size: 'M', color: 'Washed Charcoal', stock_quantity: 15, created_at: '', updated_at: '' },
      { id: 'v2-l', product_id: 'demo-rack-2', size: 'L', color: 'Washed Charcoal', stock_quantity: 6, created_at: '', updated_at: '' },
      { id: 'v2-xl', product_id: 'demo-rack-2', size: 'XL', color: 'Washed Charcoal', stock_quantity: 3, created_at: '', updated_at: '' },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-rack-3',
    name: 'SIGNATURE FRENCH TERRY CREW',
    slug: 'signature-french-terry-crew',
    description: 'Minimalist industrial streetwear crewneck with raw finished seams.',
    price: 1699,
    compare_at_price: 2499,
    is_active: true,
    is_featured: true,
    is_new: true,
    in_clothing_rail: true,
    rail_display_order: 3,
    details: {
      fabric: '100% Cotton Heavyweight Fleece',
      gsm: 260,
      fit: 'Boxy Silhouette',
    },
    images: [
      {
        id: 'img-demo-3-side',
        product_id: 'demo-rack-3',
        image_url: '/assets/wenzy_front_texture.png',
        display_order: 1,
        is_primary: false,
        view_type: 'side',
        created_at: new Date().toISOString(),
      },
      {
        id: 'img-demo-3-front',
        product_id: 'demo-rack-3',
        image_url: '/assets/wenzy_front_texture.png',
        display_order: 2,
        is_primary: true,
        view_type: 'front',
        created_at: new Date().toISOString(),
      },
      {
        id: 'img-demo-3-back',
        product_id: 'demo-rack-3',
        image_url: '/assets/wenzy_back_texture.png',
        display_order: 3,
        is_primary: false,
        view_type: 'back',
        created_at: new Date().toISOString(),
      },
    ],
    variants: [
      { id: 'v3-m', product_id: 'demo-rack-3', size: 'M', color: 'Pitch Black', stock_quantity: 14, created_at: '', updated_at: '' },
      { id: 'v3-l', product_id: 'demo-rack-3', size: 'L', color: 'Pitch Black', stock_quantity: 8, created_at: '', updated_at: '' },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-rack-4',
    name: 'LIMITLESS GRAPHIC LONGSLEEVE',
    slug: 'limitless-graphic-longsleeve',
    description: 'Sleeve typography hit with oversized back brutalist art print.',
    price: 1499,
    compare_at_price: 2199,
    is_active: true,
    is_featured: true,
    is_new: true,
    in_clothing_rail: true,
    rail_display_order: 4,
    details: {
      fabric: '100% Combed Cotton',
      gsm: 240,
      fit: 'Drop Shoulder Fit',
    },
    images: [
      {
        id: 'img-demo-4-side',
        product_id: 'demo-rack-4',
        image_url: '/assets/wenzy_front_texture.png',
        display_order: 1,
        is_primary: false,
        view_type: 'side',
        created_at: new Date().toISOString(),
      },
      {
        id: 'img-demo-4-front',
        product_id: 'demo-rack-4',
        image_url: '/assets/wenzy_front_texture.png',
        display_order: 2,
        is_primary: true,
        view_type: 'front',
        created_at: new Date().toISOString(),
      },
      {
        id: 'img-demo-4-back',
        product_id: 'demo-rack-4',
        image_url: '/assets/wenzy_back_texture.png',
        display_order: 3,
        is_primary: false,
        view_type: 'back',
        created_at: new Date().toISOString(),
      },
    ],
    variants: [
      { id: 'v4-s', product_id: 'demo-rack-4', size: 'S', color: 'Acid Grey', stock_quantity: 4, created_at: '', updated_at: '' },
      { id: 'v4-m', product_id: 'demo-rack-4', size: 'M', color: 'Acid Grey', stock_quantity: 9, created_at: '', updated_at: '' },
      { id: 'v4-l', product_id: 'demo-rack-4', size: 'L', color: 'Acid Grey', stock_quantity: 11, created_at: '', updated_at: '' },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

/**
 * WENZY RACK Section Component
 * Placed directly below the homepage hero banner.
 * Presents the interactive curved clothing rail with photorealistic hanging garments,
 * hover sway physics, drag momentum, and focused 3D inspection modal.
 */
export default function WenzyRackSection() {
  const [liveProducts, setLiveProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [focusModalOpen, setFocusModalOpen] = useState(false)

  const loadRackData = async () => {
    setLoading(true)
    try {
      const rackItems = await getRackProducts()
      setLiveProducts(rackItems)
    } catch (err) {
      console.warn('WENZY RACK: Live database returned empty or pending migration, using showcase items:', err)
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

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    setFocusModalOpen(true)
  }

  const handleCloseModal = () => {
    setFocusModalOpen(false)
    setSelectedProduct(null)
  }

  return (
    <section className="relative w-full py-12 sm:py-16 bg-white border-b border-neutral-100 overflow-hidden">
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
          <div className="relative w-full pt-4">
            {/* 1. Curved Metallic SVG Rail Rod */}
            <RackRailRod className="mb-[-28px] z-10" />

            {/* 2. Drag/Swipe Horizontal Track */}
            <RackTrack
              products={activeProducts}
              onSelectProduct={handleSelectProduct}
            />
          </div>
        )}
      </div>

      {/* 3. Focused Close-Up 3D Modal */}
      <RackFocusModal
        isOpen={focusModalOpen}
        product={selectedProduct}
        onClose={handleCloseModal}
      />
    </section>
  )
}
