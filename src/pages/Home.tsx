import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Star, ShieldCheck, Sparkles, AlertCircle, RefreshCw } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import HeroBannerCarousel from '../components/HeroBannerCarousel'
import WenzyRackSection from '../components/wenzy-rack/WenzyRackSection'
import { getCategories, getProducts, getBanners } from '../lib/storeApi'
import type { Category, Product, StorefrontBanner } from '../types/database'

export default function Home() {
  const [banners, setBanners] = useState<StorefrontBanner[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [fetchedBanners, cats, prods] = await Promise.all([
        getBanners(),
        getCategories(true),
        getProducts({ isFeatured: true }),
      ])
      setBanners(fetchedBanners)
      setCategories(cats)
      setFeaturedProducts(prods)
    } catch (err: any) {
      console.error('Home load error:', err)
      setError(err.message || 'Unable to load products from database.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="flex flex-col w-full">
      {/* 1. Dynamic Hero Banner Carousel (Directly under Header, Flush Layout) */}
      <HeroBannerCarousel banners={banners} />

      {/* 2. WENZY RACK (Interactive Clothing Rail - Directly under Hero Banner) */}
      <WenzyRackSection />

      {/* 3. New Arrivals (Directly under WENZY RACK) */}
      <section className="py-10 sm:py-14 border-b border-neutral-100">
        <div className="wrap">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neutral-900">
              NEW ARRIVALS
            </h2>
            <div className="w-12 h-1 bg-red-600 mx-auto mt-2 rounded-full" />
          </div>

          {/* Product Grid / Error / Empty States */}
          {error ? (
            <div className="py-16 text-center max-w-md mx-auto space-y-4 bg-red-50/50 p-8 border border-red-200">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
              <div className="text-sm font-bold uppercase tracking-wider text-red-900">
                Database Connection Error
              </div>
              <p className="text-xs text-red-700 leading-relaxed">{error}</p>
              <button onClick={loadData} className="btn-secondary inline-flex items-center gap-2 text-xs">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : loading ? (
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
            <div className="py-16 text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-400">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-black text-xl uppercase tracking-tight text-black">
                Products Coming Soon
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                We are currently engineering our inaugural streetwear drop. Stay tuned for new releases.
              </p>
              <Link to="/shop" className="btn-secondary inline-flex text-xs">
                Browse Full Catalog
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {featuredProducts.length > 0 && (
            <div className="text-center mt-12">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-8 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
              >
                <span>VIEW ALL NEW ARRIVALS</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 3. Category Spotlight (Dynamically rendered only if categories exist in database) */}
      {categories.length > 0 && (
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
                <span>View All</span>
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
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 opacity-70 group-hover:opacity-85"
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-neutral-400 text-xs font-bold uppercase tracking-widest">
                      {cat.name}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                    <div>
                      <h3 className="font-heading font-black text-2xl text-white uppercase tracking-wider mt-0.5">
                        {cat.name}
                      </h3>
                      {cat.description && (
                        <p className="text-xs text-neutral-300 line-clamp-1 mt-1">{cat.description}</p>
                      )}
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
      )}

      {/* 4. Fabric Engineering & Brand Specs */}
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

      {/* 5. Verified Customer Proof */}
      <section className="py-16 md:py-20 border-t border-neutral-200">
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
              Real testimonials from verified streetwear enthusiasts across India.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-neutral-50 p-6 border border-neutral-200 space-y-3">
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <p className="text-xs text-neutral-700 italic leading-relaxed">
                "The 240 GSM weight is unreal. It holds its structured boxy shape even after 10+ machine washes. Best drop-shoulder cut in India."
              </p>
              <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[11px]">
                <span className="font-bold uppercase tracking-wider text-black">Aarav M. — Mumbai</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Buyer
                </span>
              </div>
            </div>

            <div className="bg-neutral-50 p-6 border border-neutral-200 space-y-3">
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <p className="text-xs text-neutral-700 italic leading-relaxed">
                "Packaging, unboxing experience, and the garment finish are at international luxury streetwear level. WENZY is legit."
              </p>
              <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[11px]">
                <span className="font-bold uppercase tracking-wider text-black">Vikram S. — Bengaluru</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Buyer
                </span>
              </div>
            </div>

            <div className="bg-neutral-50 p-6 border border-neutral-200 space-y-3">
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <p className="text-xs text-neutral-700 italic leading-relaxed">
                "Delivery was super fast and the fit is perfect. The ribbed collar doesn't sag or bacon. Will definitely order from the next drop."
              </p>
              <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[11px]">
                <span className="font-bold uppercase tracking-wider text-black">Rhea K. — Delhi</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Buyer
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
