import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react'
import type { StorefrontBanner } from '../types/database'
import { getBannerPublicUrl } from '../lib/storeApi'

interface HeroBannerCarouselProps {
  banners: StorefrontBanner[]
}

export default function HeroBannerCarousel({ banners }: HeroBannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({})
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Navigation handlers
  const goToNext = useCallback(() => {
    if (banners.length <= 1) return
    setCurrentIndex((prev) => (prev + 1) % banners.length)
  }, [banners.length])

  const goToPrev = useCallback(() => {
    if (banners.length <= 1) return
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)
  }, [banners.length])

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  // Current active banner
  const activeBanner = banners[currentIndex]

  // Video playback management for active slide
  useEffect(() => {
    if (!banners || banners.length === 0) return

    // Pause all other videos and play the active one if it's a video
    Object.keys(videoRefs.current).forEach((key) => {
      const idx = Number(key)
      const vid = videoRefs.current[idx]
      if (vid) {
        if (idx === currentIndex) {
          vid.currentTime = 0
          vid.play().catch(() => {
            // Autoplay could be blocked if unmuted, but our videos are muted
          })
        } else {
          vid.pause()
        }
      }
    })
  }, [currentIndex, banners])

  // Slide advancement logic (auto-play timer)
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (!banners || banners.length <= 1) return
    if (isHovered) return // Pause on hover

    const currentBanner = banners[currentIndex]
    if (!currentBanner) return

    // If it's a video set to advance on_end, we handle slide advancement via onEnded
    if (currentBanner.media_type === 'video' && currentBanner.video_advance_mode === 'on_end') {
      return
    }

    const duration = Math.max(currentBanner.duration_ms || 5000, 2000)
    timerRef.current = setTimeout(() => {
      goToNext()
    }, duration)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [currentIndex, banners, isHovered, goToNext])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      goToPrev()
    } else if (e.key === 'ArrowRight') {
      goToNext()
    }
  }

  // Fallback state if no banners configured yet
  if (!banners || banners.length === 0) {
    return (
      <section className="relative w-full min-h-[75vh] md:min-h-[85vh] bg-black text-white flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-neutral-950">
          <div className="w-full h-full opacity-30 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80" />
        </div>

        <div className="wrap relative z-10 py-20 flex flex-col items-start justify-center max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded border border-white/20 font-accent text-xs font-bold uppercase tracking-widest text-white">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SEASON 01 • INAUGURAL DROP</span>
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
              <span>EXPLORE COLLECTION</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
            <Link
              to="/about"
              className="inline-flex h-12 items-center justify-center gap-2 border border-white bg-transparent px-6 text-xs font-bold uppercase tracking-[0.16em] text-white transition-all duration-200 hover:bg-white hover:text-black active:scale-[0.98]"
            >
              BRAND STORY
            </Link>
          </div>
        </div>
      </section>
    )
  }

  // Destination resolver
  const getDestinationLink = (banner: StorefrontBanner) => {
    switch (banner.destination_type) {
      case 'product':
        if (banner.destination_product?.slug) {
          return `/product/${banner.destination_product.slug}`
        }
        if (banner.destination_product_id) {
          return `/product/${banner.destination_product_id}`
        }
        return '/shop'
      case 'category':
        if (banner.destination_category?.slug) {
          return `/category/${banner.destination_category.slug}`
        }
        if (banner.destination_category_id) {
          return `/shop?category=${banner.destination_category_id}`
        }
        return '/shop'
      case 'custom_url':
        return banner.destination_url || '#'
      default:
        return null
    }
  }

  return (
    <section
      className="relative w-full min-h-[75vh] md:min-h-[85vh] lg:min-h-[90vh] bg-black text-white flex items-center overflow-hidden select-none outline-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Homepage Banners"
    >
      {/* Slides media container */}
      {banners.map((banner, index) => {
        const isActive = index === currentIndex
        const desktopUrl = getBannerPublicUrl(banner.media_path)
        const mobileUrl = banner.mobile_media_path ? getBannerPublicUrl(banner.mobile_media_path) : desktopUrl
        const opacity = banner.overlay_opacity ?? 0.4

        return (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
            style={{
              transitionDuration: reducedMotion ? '0ms' : '1000ms',
            }}
            aria-hidden={!isActive}
          >
            {/* Media: Image or Video */}
            {banner.media_type === 'video' ? (
              <div className="absolute inset-0 w-full h-full overflow-hidden">
                {/* Desktop Video */}
                <video
                  ref={(el) => (videoRefs.current[index] = el)}
                  src={desktopUrl}
                  muted
                  playsInline
                  autoPlay={isActive}
                  loop={banner.video_advance_mode !== 'on_end'}
                  onEnded={() => {
                    if (banner.video_advance_mode === 'on_end') {
                      goToNext()
                    }
                  }}
                  className={`w-full h-full object-cover object-center ${
                    banner.mobile_media_path ? 'hidden md:block' : 'block'
                  }`}
                />
                {/* Mobile Video (if distinct mobile media is configured) */}
                {banner.mobile_media_path && (
                  <video
                    src={mobileUrl}
                    muted
                    playsInline
                    autoPlay={isActive}
                    loop={banner.video_advance_mode !== 'on_end'}
                    onEnded={() => {
                      if (banner.video_advance_mode === 'on_end') {
                        goToNext()
                      }
                    }}
                    className="w-full h-full object-cover object-center md:hidden"
                  />
                )}
              </div>
            ) : (
              <picture className="absolute inset-0 w-full h-full">
                {banner.mobile_media_path && (
                  <source media="(max-width: 767px)" srcSet={mobileUrl} />
                )}
                <img
                  src={desktopUrl}
                  alt={banner.heading || banner.title || 'WENZY Banner'}
                  className="w-full h-full object-cover object-center"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </picture>
            )}

            {/* Custom Overlay Opacity & Streetwear Vignette */}
            <div
              className="absolute inset-0 bg-black pointer-events-none"
              style={{ opacity }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 pointer-events-none" />
          </div>
        )
      })}

      {/* Slide Content Overlay */}
      {activeBanner && (
        <div className="wrap relative z-20 py-20 w-full pointer-events-none">
          <div
            className={`flex flex-col max-w-4xl space-y-6 pointer-events-auto ${
              activeBanner.text_alignment === 'center'
                ? 'items-center text-center mx-auto'
                : activeBanner.text_alignment === 'right'
                ? 'items-end text-right ml-auto'
                : 'items-start text-left'
            }`}
            style={{ color: activeBanner.text_color || '#FFFFFF' }}
          >
            {/* Title / Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-sm border border-white/20 font-accent text-xs font-bold uppercase tracking-widest text-white shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>{activeBanner.title || 'WENZY EXCLUSIVE'}</span>
            </div>

            {/* Bold Editorial Heading */}
            {activeBanner.heading && (
              <h1 className="font-heading font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-[0.95] uppercase break-words drop-shadow-md">
                {activeBanner.heading}
              </h1>
            )}

            {/* Subheading / Description */}
            {activeBanner.description && (
              <p className="text-sm sm:text-base md:text-lg text-neutral-200 max-w-xl font-normal leading-relaxed drop-shadow-sm">
                {activeBanner.description}
              </p>
            )}

            {/* Action Buttons / CTA */}
            {(() => {
              const link = getDestinationLink(activeBanner)
              const buttonText = activeBanner.button_text || (link ? 'DISCOVER NOW' : null)

              if (!link && !buttonText) return null

              const isExternal = link?.startsWith('http')

              return (
                <div className="flex flex-wrap items-center gap-4 pt-4">
                  {link ? (
                    isExternal ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary bg-white text-black hover:bg-neutral-200 hover:text-black shadow-lg"
                      >
                        <span>{buttonText}</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </a>
                    ) : (
                      <Link
                        to={link}
                        className="btn-primary bg-white text-black hover:bg-neutral-200 hover:text-black shadow-lg"
                      >
                        <span>{buttonText}</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    )
                  ) : (
                    <button className="btn-primary bg-white text-black hover:bg-neutral-200 hover:text-black shadow-lg">
                      <span>{buttonText}</span>
                    </button>
                  )}

                  <Link
                    to="/shop"
                    className="inline-flex h-12 items-center justify-center gap-2 border border-white/80 bg-black/40 backdrop-blur-md px-6 text-xs font-bold uppercase tracking-[0.16em] text-white transition-all duration-200 hover:bg-white hover:text-black active:scale-[0.98]"
                  >
                    ALL PRODUCTS
                  </Link>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Navigation Controls (Arrows) - Only rendered if more than 1 banner */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center bg-black/40 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white rounded-none transition-all duration-200 group active:scale-95"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-6 h-6 transition-transform group-hover:-translate-x-0.5" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center bg-black/40 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white rounded-none transition-all duration-200 group active:scale-95"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-0.5" />
          </button>
        </>
      )}

      {/* Slide Indicators / Minimal Brutalist Pagination */}
      {banners.length > 1 && (
        <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-black/50 backdrop-blur-md px-4 py-2 border border-white/10 rounded-full">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              className={`transition-all duration-300 rounded-full ${
                idx === currentIndex
                  ? 'w-8 h-1.5 bg-white'
                  : 'w-2 h-1.5 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={idx === currentIndex ? 'true' : 'false'}
            />
          ))}
          <span className="text-[10px] font-mono tracking-widest text-neutral-400 pl-2">
            0{currentIndex + 1} / 0{banners.length}
          </span>
        </div>
      )}
    </section>
  )
}
