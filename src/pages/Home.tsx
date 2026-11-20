import React, { useEffect, useState } from 'react'
import { Star, ShieldCheck } from 'lucide-react'
import HeroBannerCarousel from '../components/HeroBannerCarousel'
import WenzyRackSection from '../components/wenzy-rack/WenzyRackSection'
import CollectionsSection from '../components/CollectionsSection'
import { getBanners } from '../lib/storeApi'
import type { StorefrontBanner } from '../types/database'

export default function Home() {
  const [banners, setBanners] = useState<StorefrontBanner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBanners()
      .then(setBanners)
      .catch((err) => console.error('Error loading banners:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col w-full">
      {/* 1. Dynamic Hero Banner Carousel (Directly under Header, Flush Layout) */}
      <HeroBannerCarousel banners={banners} />

      {/* 2. WENZY RACK (Interactive Clothing Rail - Directly under Hero Banner) */}
      <WenzyRackSection />

      {/* 3. Collections / Shop the Edit section */}
      <CollectionsSection />

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
