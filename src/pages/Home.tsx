import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Star, ShieldCheck, Sparkles } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { getCategories, getProducts } from '../lib/storeApi'
import type { Category, Product } from '../types/database'

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, prods] = await Promise.all([
          getCategories(true),
          getProducts({ isFeatured: true }),
        ])
        setCategories(cats)
        setFeaturedProducts(prods)
      } catch (err) {
        console.error('Home load error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <div className="flex flex-col w-full">
      {/* 1. Hero Section (Matching REA Normless Full-Bleed Aesthetics) */}
      <section className="relative w-full min-h-[75vh] md:min-h-[85vh] bg-black text-white flex items-center overflow-hidden">
        {/* Background Visual Texture */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=2000&q=85"
            alt="WENZY Streetwear Hero"
            className="w-full h-full object-cover object-center opacity-40 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60" />
        </div>

        {/* Content Overlay */}
        <div className="wrap relative z-10 py-20 flex flex-col items-start justify-center max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded border border-white/20 font-accent text-xs font-bold uppercase tracking-widest text-white">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SEASON 01 • THE DOOMSDAY DROP</span>
          </div>

          <h1 className="font-heading font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-[0.95] uppercase text-white">
            WEAR YOUR <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-400">
              LIMITLESS EDGE.
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-neutral-300 max-w-xl font-normal leading-relaxed">
            Engineered with 240+ GSM heavyweight combed cotton and signature drop-shoulder silhouettes. Built for those
            who refuse to blend in.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link to="/shop" className="btn-primary bg-white text-black hover:bg-neutral-200 hover:text-black">
              <span>EXPLORE ALL TEES</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
            <Link
              to="/product/wenzy-doomsday-edition-oversized-t-shirt"
              className="inline-flex h-12 items-center justify-center gap-2 border border-white bg-transparent px-6 text-xs font-bold uppercase tracking-[0.16em] text-white transition-all duration-200 hover:bg-white hover:text-black active:scale-[0.98]"
            >
              DOOMSDAY EDITION
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Launch Category Spotlight (Strict Single Category: T-Shirts) */}
      <section className="py-12 border-b border-neutral-200 bg-neutral-50">
        <div className="wrap">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">
                Core Catalog
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-black mt-1">
                Shop By Category
              </h2>
            </div>
            <Link
              to="/shop"
              className="text-xs font-bold uppercase tracking-[0.16em] text-black hover:opacity-60 flex items-center gap-1"
            >
              <span>View Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="group relative block aspect-[16/9] md:aspect-[4/3] overflow-hidden bg-neutral-900 border border-neutral-200 shadow-sm"
              >
                <img
                  src={
                    cat.image_url ||
                    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80'
                  }
                  alt={cat.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 opacity-70 group-hover:opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                  <div>
                    <span className="font-accent text-[11px] font-bold text-neutral-300 uppercase tracking-widest">
                      Current Launch Category
                    </span>
                    <h3 className="font-heading font-black text-2xl text-white uppercase tracking-wider mt-0.5">
                      {cat.name}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center group-hover:translate-x-1 transition-transform">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Featured Drops Section */}
      <section className="py-16 md:py-24">
        <div className="wrap">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-4 border-b border-neutral-200">
            <div>
              <span className="font-accent text-[11px] font-bold uppercase tracking-[0.24em] text-neutral-500">
                Signature Collection
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black mt-1">
                Trending Streetwear Drops
              </h2>
            </div>
            <Link
              to="/shop"
              className="text-xs font-bold uppercase tracking-[0.16em] text-black hover:opacity-60 flex items-center gap-1.5"
            >
              <span>View All Pieces ({featuredProducts.length})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Product Grid (4 columns desktop, 2 columns mobile) */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="animate-pulse space-y-3">
                  <div className="aspect-square bg-neutral-200" />
                  <div className="h-4 bg-neutral-200 w-3/4" />
                  <div className="h-4 bg-neutral-200 w-1/4" />
                </div>
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-16 text-neutral-500 text-sm">
              No products found in this drop.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Fabric Engineering & Brand Specs Banner */}
      <section className="py-16 bg-neutral-900 text-white">
        <div className="wrap grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="border-l-2 border-white pl-6 space-y-2">
            <div className="font-accent text-3xl font-black">240+ GSM</div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Ultra-Dense French Terry
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Knitted from 100% long-staple combed cotton for substantial weight, clean drape, and lifelong durability.
            </p>
          </div>

          <div className="border-l-2 border-white pl-6 space-y-2">
            <div className="font-accent text-3xl font-black">ZERO BLEED</div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              High-Density Screen Prints
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Curated artwork cured at 180°C with crack-resistant plastisol and soft-hand waterbased inks.
            </p>
          </div>

          <div className="border-l-2 border-white pl-6 space-y-2">
            <div className="font-accent text-3xl font-black">BOXY CUT</div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Tailored Drop-Shoulder Fit
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Proportionally structured chest and dropped armholes engineered for modern streetwear styling.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Verified Customer Reviews & Community Proof */}
      <section className="py-16 md:py-24 border-t border-neutral-200">
        <div className="wrap">
          <div className="text-center max-w-xl mx-auto space-y-2 mb-12">
            <div className="flex items-center justify-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-black">
              Verified Buyer Feedback
            </h2>
            <p className="text-xs text-neutral-500">
              Join thousands of streetwear enthusiasts sporting WENZY across India.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-neutral-50 p-6 border border-neutral-200 space-y-3">
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-black">
                "Insane Quality & Fit"
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                The 240 GSM weight is real. The collar stays crisp after 5+ washes and the drop shoulder fits exactly
                like high-end international streetwear brands.
              </p>
              <div className="flex items-center gap-2 pt-2 text-[11px] font-bold text-neutral-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Rohan V. • Verified Buyer (Mumbai)</span>
              </div>
            </div>

            <div className="bg-neutral-50 p-6 border border-neutral-200 space-y-3">
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-black">
                "The Doomsday Print is Wild"
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                High-density puff and clean lines. Everyone asked where I got this tee. Shipped in 2 days to Bangalore.
                Super satisfied!
              </p>
              <div className="flex items-center gap-2 pt-2 text-[11px] font-bold text-neutral-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Karan S. • Verified Buyer (Bangalore)</span>
              </div>
            </div>

            <div className="bg-neutral-50 p-6 border border-neutral-200 space-y-3">
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-black">
                "Legit Oversized Silhouette"
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                No need to size up — stick to your regular size for that authentic boxy drape. Best graphic tee brand
                coming out of India right now.
              </p>
              <div className="flex items-center gap-2 pt-2 text-[11px] font-bold text-neutral-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ananya M. • Verified Buyer (Delhi)</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
