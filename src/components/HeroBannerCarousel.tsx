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

  // Video playback management for active slide
  useEffect(() => {
    if (!banners || banners.length === 0) return

    Object.keys(videoRefs.current).forEach((key) => {
      const idx = Number(key)
      const vid = videoRefs.current[idx]
      if (vid) {
        if (idx === currentIndex) {
          vid.currentTime = 0
          vid.play().catch(() => {})
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
    if (isHovered) return

    const currentBanner = banners[currentIndex]
    if (!currentBanner) return

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

  // Resolve target link URL
  const getDestinationLink = (banner: StorefrontBanner): string | null => {
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

  // Fallback state when 0 banners configured yet
  if (!banners || banners.length === 0) {
    return (
      <section className="relative w-full h-[260px] sm:h-[360px] md:h-[440px] lg:h-[480px] bg-neutral-950 text-white flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-neutral-900">
          <img
            src="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=2000&q=85"
            alt="WENZY Hero Placeholder"
            className="w-full h-full object-cover object-center opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex flex-col items-start justify-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded border border-white/20 font-accent text-xs font-bold uppercase tracking-widest text-white">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>SEASON 01 • INAUGURAL DROP</span>
          </div>

          <h1 className="font-heading font-black text-3xl sm:text-5xl md:text-6xl tracking-tight uppercase text-white">
            WEAR YOUR LIMITLESS EDGE.
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-neutral-300 max-w-xl font-normal leading-relaxed">
            Engineered with 240+ GSM heavyweight combed cotton and signature drop-shoulder silhouettes.
          </p>

          <Link to="/shop" className="btn-primary bg-white text-black hover:bg-neutral-200 hover:text-black mt-2">
            <span>EXPLORE DROP</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </section>
    )
  }

  const activeBanner = banners[currentIndex]
  const destinationLink = activeBanner ? getDestinationLink(activeBanner) : null
  const isExternal = destinationLink?.startsWith('http')

  const getBannerHeightClass = (banner?: StorefrontBanner) => {
    if (!banner) return 'h-[240px] sm:h-[340px] md:h-[420px] lg:h-[480px] xl:h-[520px]'
    switch (banner.aspect_ratio) {
      case 'square':
        return 'h-[340px] sm:h-[460px] md:h-[520px] lg:h-[580px]'
      case 'portrait':
        return 'h-[380px] sm:h-[500px] md:h-[600px] lg:h-[680px]'
      case 'widescreen':
        return 'h-[240px] sm:h-[360px] md:h-[460px] lg:h-[540px]'
      case 'ultrawide':
        return 'h-[200px] sm:h-[280px] md:h-[360px] lg:h-[420px]'
      case 'custom':
        return ''
      case 'banner':
      default:
        return 'h-[240px] sm:h-[340px] md:h-[420px] lg:h-[480px] xl:h-[520px]'
    }
  }

  const sectionHeightClass = getBannerHeightClass(activeBanner)
  const customSectionStyle =
    activeBanner?.aspect_ratio === 'custom' && activeBanner?.custom_height
      ? { height: `${activeBanner.custom_height}px` }
      : undefined

  return (
    <section
      className={`relative w-full ${sectionHeightClass} bg-neutral-950 text-white flex items-center overflow-hidden select-none outline-none transition-all duration-500`}
      style={customSectionStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Homepage Promotional Banners"
    >
      {/* Slides media container */}
      {banners.map((banner, index) => {
        const isActive = index === currentIndex
        const desktopUrl = getBannerPublicUrl(banner.media_path)
        const mobileUrl = banner.mobile_media_path ? getBannerPublicUrl(banner.mobile_media_path) : desktopUrl
        const opacity = banner.overlay_opacity ?? 0
        const slideLink = getDestinationLink(banner)
        const slideIsExternal = slideLink?.startsWith('http')

        // Framing & focal classes
        const fitClass = banner.object_fit === 'contain' ? 'object-contain' : 'object-cover'
        const posClass =
          banner.object_position === 'top'
            ? 'object-top'
            : banner.object_position === 'bottom'
            ? 'object-bottom'
            : 'object-center'

        // Slide inner media element
        const MediaContent = (
          <div className="relative w-full h-full bg-neutral-950 flex items-center justify-center">
            {banner.media_type === 'video' ? (
              <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center">
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
                  className={`w-full h-full ${fitClass} ${posClass} ${
                    banner.mobile_media_path ? 'hidden md:block' : 'block'
                  }`}
                />
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
                    className={`w-full h-full ${fitClass} ${posClass} md:hidden`}
                  />
                )}
              </div>
            ) : (
              <picture className="absolute inset-0 w-full h-full flex items-center justify-center">
                {banner.mobile_media_path && (
                  <source media="(max-width: 767px)" srcSet={mobileUrl} />
                )}
                <img
                  src={desktopUrl}
                  alt={banner.heading || banner.title || 'WENZY Promotional Banner'}
                  className={`w-full h-full ${fitClass} ${posClass}`}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </picture>
            )}

            {/* Custom Overlay Opacity — Only applied if configured or if text exists */}
            {(opacity > 0 || banner.heading) && (
              <div
                className="absolute inset-0 bg-black pointer-events-none transition-opacity"
                style={{ opacity: Math.max(opacity, banner.heading ? 0.35 : 0) }}
              />
            )}
          </div>
        )

        return (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
            style={{
              transitionDuration: reducedMotion ? '0ms' : '700ms',
            }}
            aria-hidden={!isActive}
          >
            {/* Clickable Banner Wrapper (Direct link like reference e-commerce banner) */}
            {slideLink ? (
              slideIsExternal ? (
                <a
                  href={slideLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-full cursor-pointer"
                  title={banner.title}
                >
                  {MediaContent}
                </a>
              ) : (
                <Link
                  to={slideLink}
                  className="block w-full h-full cursor-pointer"
                  title={banner.title}
                >
                  {MediaContent}
                </Link>
              )
            ) : (
              MediaContent
            )}
          </div>
        )
      })}

      {/* Optional Editorial Typography Overlay (If configured on active banner) */}
      {activeBanner && activeBanner.heading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20 pointer-events-none">
          <div
            className={`flex flex-col max-w-2xl space-y-4 pointer-events-auto ${
              activeBanner.text_alignment === 'center'
                ? 'items-center text-center mx-auto'
                : activeBanner.text_alignment === 'right'
                ? 'items-end text-right ml-auto'
                : 'items-start text-left'
            }`}
            style={{ color: activeBanner.text_color || '#FFFFFF' }}
          >
            {/* Title / Badge */}
            {activeBanner.title && (
              <div className="inline-flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1 rounded border border-white/20 font-accent text-[11px] font-bold uppercase tracking-widest text-white shadow-sm">
                <Sparkles className="w-3 h-3 text-white" />
                <span>{activeBanner.title}</span>
              </div>
            )}

            {/* Editorial Heading */}
            <h1 className="font-heading font-black text-2xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[0.95] uppercase drop-shadow-md">
              {activeBanner.heading}
            </h1>

            {/* Description */}
            {activeBanner.description && (
              <p className="text-xs sm:text-sm md:text-base text-neutral-200 max-w-lg font-normal leading-relaxed drop-shadow-sm line-clamp-2">
                {activeBanner.description}
              </p>
            )}

            {/* CTA Button */}
            {activeBanner.button_text && destinationLink && (
              <div className="pt-2">
                {isExternal ? (
                  <a
                    href={destinationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary bg-white text-black hover:bg-neutral-200 hover:text-black text-xs py-2.5 px-5 shadow-lg"
                  >
                    <span>{activeBanner.button_text}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </a>
                ) : (
                  <Link
                    to={destinationLink}
                    className="btn-primary bg-white text-black hover:bg-neutral-200 hover:text-black text-xs py-2.5 px-5 shadow-lg"
                  >
                    <span>{activeBanner.button_text}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sleek Minimal Arrow Navigation Controls (Matches Reference Image) */}
      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              goToPrev()
            }}
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/75 text-white flex items-center justify-center transition-all shadow-md active:scale-95 focus:outline-none"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              goToNext()
            }}
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/75 text-white flex items-center justify-center transition-all shadow-md active:scale-95 focus:outline-none"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </>
      )}

      {/* Slide Indicators / Minimal Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-y-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-black/40 backdrop-blur-xs px-3 py-1 rounded-full">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation()
                goToSlide(idx)
              }}
              className={`transition-all duration-300 rounded-full ${
                idx === currentIndex
                  ? 'w-6 h-1.5 bg-white'
                  : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={idx === currentIndex ? 'true' : 'false'}
            />
          ))}
        </div>
      )}
    </section>
  )
}
