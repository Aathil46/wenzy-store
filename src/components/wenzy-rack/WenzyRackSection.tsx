import React, { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { getRackProducts } from '../../lib/storeApi'
import type { Product } from '../../types/database'
import RackRailRod from './RackRailRod'
import RackTrack from './RackTrack'
import RackFocusModal from './RackFocusModal'

/**
 * WENZY RACK Section Component
 * Placed directly below the homepage hero banner.
 * Presents the interactive curved clothing rail with photorealistic hanging garments,
 * hover sway physics, drag momentum, and focused 3D inspection modal.
 */
export default function WenzyRackSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [focusModalOpen, setFocusModalOpen] = useState(false)

  const loadRackData = async () => {
    setLoading(true)
    try {
      const rackItems = await getRackProducts()
      setProducts(rackItems)
    } catch (err) {
      console.error('Failed to load WENZY RACK items:', err)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRackData()
  }, [])

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
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 rounded-full text-neutral-600 text-[10px] font-black uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-neutral-800" />
            <span>Interactive Boutique Experience</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-neutral-950 font-heading">
            WENZY RACK
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 uppercase tracking-widest mt-2 font-medium">
            — Hover a piece · click to look closer
          </p>
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
        ) : products.length === 0 ? (
          /* Empty State (when user hasn't uploaded the real 3 images yet) */
          <div className="py-12 px-6 border border-dashed border-neutral-300 bg-neutral-50/60 max-w-2xl mx-auto text-center space-y-3 rounded-xs my-4">
            <div className="w-10 h-10 rounded-full bg-neutral-200/70 flex items-center justify-center mx-auto text-neutral-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-black text-sm uppercase tracking-wider text-neutral-900">
              WENZY RACK — CURATING INAUGURAL PIECES
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed max-w-md mx-auto">
              Our interactive clothing rail is ready. Products with their required side-profile, front, and back cutouts will appear here automatically once uploaded via Admin Products.
            </p>
          </div>
        ) : (
          /* Active Interactive Clothing Rail */
          <div className="relative w-full pt-4">
            {/* 1. Curved Metallic SVG Rail Rod */}
            <RackRailRod className="mb-[-28px] z-10" />

            {/* 2. Drag/Swipe Horizontal Track */}
            <RackTrack
              products={products}
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
