import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Upload,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Video,
  Check,
  Sliders,
  Crop,
  Eye,
  RotateCcw,
  Move,
} from 'lucide-react'
import {
  adminSaveBanner,
  uploadBannerMedia,
  getBannerPublicUrl,
  getCategories,
  getProducts,
} from '../lib/storeApi'
import type {
  StorefrontBanner,
  BannerMediaType,
  BannerDestinationType,
  BannerVideoAdvanceMode,
  BannerTextAlignment,
  BannerAspectRatio,
  BannerObjectFit,
  BannerCropSettings,
  CropData,
  Category,
  Product,
} from '../types/database'

interface BannerFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  editingBanner: StorefrontBanner | null
  currentCount: number
}

const DEFAULT_CROP: CropData = { x: 0, y: 0, zoom: 1 }

export default function BannerFormModal({
  isOpen,
  onClose,
  onSaved,
  editingBanner,
  currentCount,
}: BannerFormModalProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Upload states
  const [uploadingDesktop, setUploadingDesktop] = useState(false)
  const [uploadingMobile, setUploadingMobile] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [heading, setHeading] = useState('')
  const [description, setDescription] = useState('')
  const [buttonText, setButtonText] = useState('')
  const [mediaType, setMediaType] = useState<BannerMediaType>('image')
  const [mediaPath, setMediaPath] = useState('')
  const [mobileMediaPath, setMobileMediaPath] = useState('')
  const [destinationType, setDestinationType] = useState<BannerDestinationType>('none')
  const [destinationProductId, setDestinationProductId] = useState('')
  const [destinationCategoryId, setDestinationCategoryId] = useState('')
  const [destinationUrl, setDestinationUrl] = useState('')
  const [displayOrder, setDisplayOrder] = useState(1)
  const [durationMs, setDurationMs] = useState(5000)
  const [videoAdvanceMode, setVideoAdvanceMode] = useState<BannerVideoAdvanceMode>('duration')
  const [overlayOpacity, setOverlayOpacity] = useState(0)
  const [textAlignment, setTextAlignment] = useState<BannerTextAlignment>('left')
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [isActive, setIsActive] = useState(true)

  // Aspect Ratio: ONLY TWO OPTIONS ('3:1' default or '16:9')
  const [aspectRatio, setAspectRatio] = useState<BannerAspectRatio>('3:1')
  const [objectFit, setObjectFit] = useState<BannerObjectFit>('cover')

  // Live Interactive Crop State
  const [cropSettings, setCropSettings] = useState<BannerCropSettings>({
    desktop: { ...DEFAULT_CROP },
    mobile: { ...DEFAULT_CROP },
  })
  const [activeCropTarget, setActiveCropTarget] = useState<'desktop' | 'mobile'>('desktop')
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ clientX: number; clientY: number; cropX: number; cropY: number } | null>(null)
  const cropContainerRef = useRef<HTMLDivElement | null>(null)

  // Load categories and products for destination selection
  useEffect(() => {
    if (!isOpen) return
    let mounted = true
    const loadDestinations = async () => {
      try {
        const [cats, prods] = await Promise.all([getCategories(false), getProducts()])
        if (mounted) {
          setCategories(cats)
          setProducts(prods)
        }
      } catch (err) {
        console.error('Failed to load destinations:', err)
      }
    }
    loadDestinations()
    return () => {
      mounted = false
    }
  }, [isOpen])

  // Reset or fill form when modal opens
  useEffect(() => {
    if (!isOpen) return

    if (editingBanner) {
      setTitle(editingBanner.title || '')
      setHeading(editingBanner.heading || '')
      setDescription(editingBanner.description || '')
      setButtonText(editingBanner.button_text || '')
      setMediaType(editingBanner.media_type)
      setMediaPath(editingBanner.media_path)
      setMobileMediaPath(editingBanner.mobile_media_path || '')
      setDestinationType(editingBanner.destination_type)
      setDestinationProductId(editingBanner.destination_product_id || '')
      setDestinationCategoryId(editingBanner.destination_category_id || '')
      setDestinationUrl(editingBanner.destination_url || '')
      setDisplayOrder(editingBanner.display_order)
      setDurationMs(editingBanner.duration_ms)
      setVideoAdvanceMode(editingBanner.video_advance_mode)
      setOverlayOpacity(editingBanner.overlay_opacity ?? 0)
      setTextAlignment(editingBanner.text_alignment)
      setTextColor(editingBanner.text_color || '#FFFFFF')

      // Normalize to 3:1 or 16:9
      const ratio = editingBanner.aspect_ratio === '16:9' || editingBanner.aspect_ratio === 'widescreen'
        ? '16:9'
        : '3:1'
      setAspectRatio(ratio)
      setObjectFit(editingBanner.object_fit || 'cover')

      // Restore crop settings if present
      if (editingBanner.crop_settings && typeof editingBanner.crop_settings === 'object') {
        setCropSettings({
          desktop: {
            x: Number(editingBanner.crop_settings.desktop?.x ?? 0),
            y: Number(editingBanner.crop_settings.desktop?.y ?? 0),
            zoom: Number(editingBanner.crop_settings.desktop?.zoom ?? 1),
          },
          mobile: {
            x: Number(editingBanner.crop_settings.mobile?.x ?? 0),
            y: Number(editingBanner.crop_settings.mobile?.y ?? 0),
            zoom: Number(editingBanner.crop_settings.mobile?.zoom ?? 1),
          },
        })
      } else {
        setCropSettings({
          desktop: { ...DEFAULT_CROP },
          mobile: { ...DEFAULT_CROP },
        })
      }

      setIsActive(editingBanner.is_active)
    } else {
      setTitle('')
      setHeading('')
      setDescription('')
      setButtonText('')
      setMediaType('image')
      setMediaPath('')
      setMobileMediaPath('')
      setDestinationType('none')
      setDestinationProductId('')
      setDestinationCategoryId('')
      setDestinationUrl('')
      setDisplayOrder(currentCount + 1)
      setDurationMs(5000)
      setVideoAdvanceMode('duration')
      setOverlayOpacity(0)
      setTextAlignment('left')
      setTextColor('#FFFFFF')
      setAspectRatio('3:1') // Default 3:1 Standard Website Banner
      setObjectFit('cover')
      setCropSettings({
        desktop: { ...DEFAULT_CROP },
        mobile: { ...DEFAULT_CROP },
      })
      setIsActive(true)
    }
    setActiveCropTarget('desktop')
    setErrorMsg('')
  }, [isOpen, editingBanner, currentCount])

  if (!isOpen) return null

  // File upload handler
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'desktop' | 'mobile'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (mediaType === 'image') {
      const validImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      if (!validImages.includes(file.type)) {
        setErrorMsg('Please upload a valid image file (JPG, PNG, WebP, or GIF).')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('Image file size must be less than 10MB.')
        return
      }
    } else {
      const validVideos = ['video/mp4', 'video/webm']
      if (!validVideos.includes(file.type)) {
        setErrorMsg('Please upload a valid video file (MP4 or WebM).')
        return
      }
      if (file.size > 100 * 1024 * 1024) {
        setErrorMsg('Video file size must be less than 100MB.')
        return
      }
    }

    setErrorMsg('')
    if (target === 'desktop') setUploadingDesktop(true)
    else setUploadingMobile(true)

    try {
      const res = await uploadBannerMedia(file, mediaType)
      if (res.error) {
        setErrorMsg(`Upload failed: ${res.error}`)
      } else if (res.path) {
        if (target === 'desktop') {
          setMediaPath(res.path)
        } else {
          setMobileMediaPath(res.path)
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'File upload failed.')
    } finally {
      if (target === 'desktop') setUploadingDesktop(false)
      else setUploadingMobile(false)
    }
  }

  // Interactive Live Drag Handlers
  const currentCrop = cropSettings[activeCropTarget] || DEFAULT_CROP

  const updateCurrentCrop = (partial: Partial<CropData>) => {
    setCropSettings((prev) => ({
      ...prev,
      [activeCropTarget]: {
        ...prev[activeCropTarget],
        ...partial,
      },
    }))
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mediaType === 'video') return
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      cropX: currentCrop.x,
      cropY: currentCrop.y,
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || !cropContainerRef.current) return
    const rect = cropContainerRef.current.getBoundingClientRect()
    const dx = e.clientX - dragStartRef.current.clientX
    const dy = e.clientY - dragStartRef.current.clientY

    // Convert pixel delta to percentage of container
    const deltaX = (dx / rect.width) * 100
    const deltaY = (dy / rect.height) * 100

    const newX = Math.max(-80, Math.min(80, Math.round((dragStartRef.current.cropX + deltaX) * 10) / 10))
    const newY = Math.max(-80, Math.min(80, Math.round((dragStartRef.current.cropY + deltaY) * 10) / 10))

    updateCurrentCrop({ x: newX, y: newY })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false)
    dragStartRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handleResetCrop = () => {
    updateCurrentCrop({ x: 0, y: 0, zoom: 1 })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    // Banner title is now OPTIONAL
    if (!mediaPath.trim()) {
      setErrorMsg('Please upload or provide a desktop media file.')
      return
    }

    if (uploadingDesktop || uploadingMobile) {
      setErrorMsg('Please wait for file upload to complete.')
      return
    }

    setSaving(true)
    try {
      await adminSaveBanner({
        id: editingBanner?.id,
        title: title.trim() || null, // Optional
        heading: heading.trim() || null,
        description: description.trim() || null,
        button_text: buttonText.trim() || null,
        media_type: mediaType,
        media_path: mediaPath.trim(),
        mobile_media_path: mobileMediaPath.trim() || null,
        destination_type: destinationType,
        destination_product_id: destinationType === 'product' && destinationProductId ? destinationProductId : null,
        destination_category_id: destinationType === 'category' && destinationCategoryId ? destinationCategoryId : null,
        destination_url: destinationType === 'custom_url' ? destinationUrl.trim() : null,
        display_order: Number(displayOrder) || 1,
        duration_ms: Number(durationMs) || 5000,
        video_advance_mode: videoAdvanceMode,
        overlay_opacity: Number(overlayOpacity),
        text_alignment: textAlignment,
        text_color: textColor || '#FFFFFF',
        aspect_ratio: aspectRatio,
        crop_settings: cropSettings,
        object_fit: objectFit,
        is_active: isActive,
      })

      onSaved()
      onClose()
    } catch (err: any) {
      console.error('Save banner error:', err)
      setErrorMsg(err.message || 'Failed to save banner.')
    } finally {
      setSaving(false)
    }
  }

  const desktopPreviewUrl = mediaPath ? getBannerPublicUrl(mediaPath) : ''
  const mobilePreviewUrl = mobileMediaPath ? getBannerPublicUrl(mobileMediaPath) : ''
  const currentPreviewUrl = activeCropTarget === 'mobile' && mobilePreviewUrl ? mobilePreviewUrl : desktopPreviewUrl

  const is169 = aspectRatio === '16:9' || aspectRatio === 'widescreen'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white border border-neutral-200 shadow-2xl rounded-none my-8 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 sticky top-0 z-20">
          <div>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-black">
              {editingBanner ? 'Edit Banner Slide' : 'Create New Banner Slide'}
            </h2>
            <p className="text-[11px] text-neutral-500 uppercase tracking-wider mt-0.5">
              Aspect ratio presets, live drag-and-zoom cropping, and playback settings.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-black p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h3 className="font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-1 flex items-center justify-between">
              <span>1. Slide Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block font-bold uppercase tracking-wider text-neutral-700">
                  Internal Title <span className="text-neutral-400 font-normal">(Optional admin reference)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. DOOM IS HERE Drop 9 (leave empty for Untitled Banner)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold uppercase tracking-wider text-neutral-700">
                  Storefront Visibility
                </label>
                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-black rounded-none cursor-pointer"
                  />
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
                    Active & Published
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-bold uppercase tracking-wider text-neutral-700">
                Editorial Heading <span className="text-neutral-400 font-normal">(Optional — shown on storefront overlay)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. PHASE 1 | DROP 9"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                className="input-field w-full text-xs font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold uppercase tracking-wider text-neutral-700">
                Description / Subtitle <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Member early access live now..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field w-full text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold uppercase tracking-wider text-neutral-700">
                Button Text <span className="text-neutral-400 font-normal">(Optional CTA)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. SHOP NOW"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                className="input-field w-full text-xs font-semibold"
              />
            </div>
          </div>

          {/* Section 2: Media Upload */}
          <div className="space-y-4">
            <h3 className="font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-1">
              2. Media & Uploads
            </h3>

            {/* Media Type Selection */}
            <div className="space-y-1">
              <label className="block font-bold uppercase tracking-wider text-neutral-700">
                Media Format
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <button
                  type="button"
                  onClick={() => setMediaType('image')}
                  className={`flex items-center justify-center gap-2 p-2.5 border transition-all text-xs font-bold uppercase tracking-wider ${
                    mediaType === 'image'
                      ? 'bg-black text-white border-black shadow-xs'
                      : 'bg-neutral-50 text-neutral-600 border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>High-Res Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType('video')}
                  className={`flex items-center justify-center gap-2 p-2.5 border transition-all text-xs font-bold uppercase tracking-wider ${
                    mediaType === 'video'
                      ? 'bg-black text-white border-black shadow-xs'
                      : 'bg-neutral-50 text-neutral-600 border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>Cinema Video</span>
                </button>
              </div>
            </div>

            {/* Desktop Media Upload */}
            <div className="space-y-2">
              <label className="block font-bold uppercase tracking-wider text-neutral-700">
                Desktop Media <span className="text-red-500">*</span>
              </label>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1 w-full space-y-2">
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 hover:border-black p-4 text-center cursor-pointer bg-neutral-50 hover:bg-neutral-100 transition-colors">
                    {uploadingDesktop ? (
                      <div className="flex items-center gap-2 text-neutral-600">
                        <Loader2 className="w-5 h-5 animate-spin text-black" />
                        <span className="font-bold">Uploading {mediaType}...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-neutral-500 mb-1" />
                        <span className="font-bold uppercase tracking-wider text-neutral-800">
                          Click to upload desktop {mediaType}
                        </span>
                        <span className="text-[10px] text-neutral-400 mt-0.5">
                          {mediaType === 'image'
                            ? 'JPG, PNG, WebP, GIF (Max 10MB)'
                            : 'MP4, WebM (Max 100MB)'}
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      disabled={uploadingDesktop}
                      accept={mediaType === 'image' ? 'image/*' : 'video/mp4,video/webm'}
                      onChange={(e) => handleFileUpload(e, 'desktop')}
                      className="hidden"
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">Or URL:</span>
                    <input
                      type="text"
                      placeholder="Storage path or direct CDN URL"
                      value={mediaPath}
                      onChange={(e) => setMediaPath(e.target.value)}
                      className="input-field flex-1 text-xs"
                    />
                  </div>
                </div>

                {mediaPath && (
                  <div className="w-36 h-24 bg-neutral-900 border border-neutral-300 overflow-hidden relative flex-shrink-0 flex items-center justify-center">
                    {mediaType === 'video' ? (
                      <video
                        src={desktopPreviewUrl}
                        muted
                        autoPlay
                        loop
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={desktopPreviewUrl}
                        alt="Desktop Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setMediaPath('')}
                      className="absolute top-1 right-1 bg-black/80 hover:bg-red-600 text-white p-0.5 transition-colors"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Media Upload (Optional) */}
            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <label className="block font-bold uppercase tracking-wider text-neutral-700">
                Mobile Media <span className="text-neutral-400 font-normal">(Optional Portrait / Mobile Override)</span>
              </label>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1 w-full space-y-2">
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 hover:border-black p-3 text-center cursor-pointer bg-neutral-50 hover:bg-neutral-100 transition-colors">
                    {uploadingMobile ? (
                      <div className="flex items-center gap-2 text-neutral-600">
                        <Loader2 className="w-5 h-5 animate-spin text-black" />
                        <span className="font-bold">Uploading mobile media...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-neutral-500 mb-1" />
                        <span className="font-bold uppercase tracking-wider text-neutral-800">
                          Upload optional mobile media
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      disabled={uploadingMobile}
                      accept={mediaType === 'image' ? 'image/*' : 'video/mp4,video/webm'}
                      onChange={(e) => handleFileUpload(e, 'mobile')}
                      className="hidden"
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">Or URL:</span>
                    <input
                      type="text"
                      placeholder="Storage path or direct URL"
                      value={mobileMediaPath}
                      onChange={(e) => setMobileMediaPath(e.target.value)}
                      className="input-field flex-1 text-xs"
                    />
                  </div>
                </div>

                {mobileMediaPath && (
                  <div className="w-20 h-24 bg-neutral-900 border border-neutral-300 overflow-hidden relative flex-shrink-0 flex items-center justify-center">
                    {mediaType === 'video' ? (
                      <video
                        src={mobilePreviewUrl}
                        muted
                        autoPlay
                        loop
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={mobilePreviewUrl}
                        alt="Mobile Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setMobileMediaPath('')}
                      className="absolute top-1 right-1 bg-black/80 hover:bg-red-600 text-white p-0.5 transition-colors"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Aspect Ratio & Live Drag-and-Zoom Crop Editor */}
          <div className="space-y-4 bg-neutral-50 p-4 border border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <div className="flex items-center gap-2 text-neutral-900 font-bold uppercase tracking-wider">
                <Crop className="w-4 h-4 text-black" />
                <span>3. Aspect Ratio & Live Interactive Crop</span>
              </div>
              <span className="text-[10px] text-neutral-500 uppercase font-mono">Instagram-Style Pan & Zoom</span>
            </div>

            {/* Aspect Ratio Selector — EXACTLY TWO PRESETS */}
            <div className="space-y-2">
              <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[11px]">
                Aspect Ratio / Format Preset
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAspectRatio('3:1')}
                  className={`p-3 border text-left transition-all ${
                    aspectRatio === '3:1' || aspectRatio === 'banner'
                      ? 'bg-black text-white border-black shadow-xs ring-2 ring-black/20'
                      : 'bg-white text-neutral-800 border-neutral-300 hover:border-black'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-xs">Standard Website Banner</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        aspectRatio === '3:1' || aspectRatio === 'banner'
                          ? 'bg-white/20 text-white'
                          : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      DEFAULT
                    </span>
                  </div>
                  <div
                    className={`text-[11px] font-mono mt-1 ${
                      aspectRatio === '3:1' || aspectRatio === 'banner'
                        ? 'text-neutral-200'
                        : 'text-neutral-500'
                    }`}
                  >
                    3:1 Aspect Ratio (1440 × 491px)
                  </div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      aspectRatio === '3:1' || aspectRatio === 'banner'
                        ? 'text-neutral-300'
                        : 'text-neutral-400'
                    }`}
                  >
                    Standard e-commerce hero banner
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={`p-3 border text-left transition-all ${
                    aspectRatio === '16:9' || aspectRatio === 'widescreen'
                      ? 'bg-black text-white border-black shadow-xs ring-2 ring-black/20'
                      : 'bg-white text-neutral-800 border-neutral-300 hover:border-black'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-xs">Landscape</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        aspectRatio === '16:9' || aspectRatio === 'widescreen'
                          ? 'bg-white/20 text-white'
                          : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      16:9
                    </span>
                  </div>
                  <div
                    className={`text-[11px] font-mono mt-1 ${
                      aspectRatio === '16:9' || aspectRatio === 'widescreen'
                        ? 'text-neutral-200'
                        : 'text-neutral-500'
                    }`}
                  >
                    16:9 Aspect Ratio (1920 × 1080px)
                  </div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      aspectRatio === '16:9' || aspectRatio === 'widescreen'
                        ? 'text-neutral-300'
                        : 'text-neutral-400'
                    }`}
                  >
                    Widescreen cinematic format
                  </div>
                </button>
              </div>
            </div>

            {/* Framing Mode: Cover vs Contain */}
            <div className="space-y-1.5 pt-1">
              <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[11px]">
                Framing Mode
              </label>
              <div className="grid grid-cols-2 gap-2 max-w-sm">
                <button
                  type="button"
                  onClick={() => setObjectFit('cover')}
                  className={`p-2 border text-center font-bold uppercase tracking-wider text-[11px] transition-all ${
                    objectFit === 'cover'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  Cover (Fill Area)
                </button>
                <button
                  type="button"
                  onClick={() => setObjectFit('contain')}
                  className={`p-2 border text-center font-bold uppercase tracking-wider text-[11px] transition-all ${
                    objectFit === 'contain'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  Contain (Full Image)
                </button>
              </div>
            </div>

            {/* Target Selector (Desktop vs Mobile Media Crop) */}
            {mobileMediaPath && (
              <div className="flex items-center gap-2 pt-2 border-t border-neutral-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">
                  Editing Crop For:
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveCropTarget('desktop')}
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border transition-colors ${
                      activeCropTarget === 'desktop'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-neutral-600 border-neutral-300 hover:border-black'
                    }`}
                  >
                    Desktop Media Crop
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCropTarget('mobile')}
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border transition-colors ${
                      activeCropTarget === 'mobile'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-neutral-600 border-neutral-300 hover:border-black'
                    }`}
                  >
                    Mobile Media Crop
                  </button>
                </div>
              </div>
            )}

            {/* Live Interactive Crop Canvas */}
            {mediaPath ? (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-neutral-600 text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold uppercase">
                    <Move className="w-3.5 h-3.5 text-black" />
                    <span>
                      Live Interactive Crop Preview ({is169 ? '16:9 Landscape' : '3:1 Standard Website Banner'})
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    {mediaType === 'image' ? 'Drag image to reposition • Use slider to zoom' : 'Video Framing Preview'}
                  </span>
                </div>

                {/* Aspect-Locked Canvas */}
                <div
                  ref={cropContainerRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{
                    aspectRatio: is169 ? '16 / 9' : '1440 / 491',
                  }}
                  className={`w-full max-h-[300px] bg-neutral-950 border border-neutral-300 overflow-hidden relative select-none touch-none rounded-none flex items-center justify-center ${
                    mediaType === 'image'
                      ? isDragging
                        ? 'cursor-grabbing'
                        : 'cursor-grab'
                      : 'cursor-default'
                  }`}
                >
                  {mediaType === 'video' ? (
                    <video
                      src={currentPreviewUrl}
                      muted
                      autoPlay
                      loop
                      className={`w-full h-full pointer-events-none ${
                        objectFit === 'contain' ? 'object-contain' : 'object-cover'
                      }`}
                    />
                  ) : (
                    <img
                      src={currentPreviewUrl}
                      alt="Live Crop Preview"
                      draggable={false}
                      className={`w-full h-full pointer-events-none select-none transition-transform duration-75 ease-out ${
                        objectFit === 'contain' ? 'object-contain' : 'object-cover'
                      }`}
                      style={{
                        transform: `translate(${currentCrop.x}%, ${currentCrop.y}%) scale(${currentCrop.zoom})`,
                        transformOrigin: 'center center',
                      }}
                    />
                  )}

                  {/* Instagram-style 3x3 Rule-of-Thirds Grid Overlay */}
                  {mediaType === 'image' && (
                    <div
                      className={`absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 transition-opacity duration-200 ${
                        isDragging ? 'opacity-40' : 'opacity-20 hover:opacity-35'
                      }`}
                    >
                      <div className="border-r border-b border-white/60" />
                      <div className="border-r border-b border-white/60" />
                      <div className="border-b border-white/60" />
                      <div className="border-r border-b border-white/60" />
                      <div className="border-r border-b border-white/60" />
                      <div className="border-b border-white/60" />
                      <div className="border-r border-white/60" />
                      <div className="border-r border-white/60" />
                      <div />
                    </div>
                  )}

                  {/* Heading Overlay Preview */}
                  {heading && (
                    <div className="absolute inset-0 bg-black/25 flex items-center p-4 pointer-events-none">
                      <div className="text-white font-black uppercase text-sm drop-shadow">
                        {heading}
                      </div>
                    </div>
                  )}
                </div>

                {/* Crop Controls: Zoom Slider + Reset Button */}
                {mediaType === 'image' && (
                  <div className="bg-white p-3 border border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5 flex-shrink-0">
                        <Sliders className="w-3.5 h-3.5" />
                        Zoom:
                      </span>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.05"
                        value={currentCrop.zoom}
                        onChange={(e) => updateCurrentCrop({ zoom: Number(e.target.value) })}
                        className="flex-1 accent-black cursor-pointer"
                      />
                      <span className="text-xs font-mono font-bold w-12 text-right text-neutral-800">
                        {currentCrop.zoom.toFixed(2)}x
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-[10px] font-mono text-neutral-500">
                        X: {currentCrop.x > 0 ? `+${currentCrop.x}` : currentCrop.x}% | Y:{' '}
                        {currentCrop.y > 0 ? `+${currentCrop.y}` : currentCrop.y}%
                      </div>
                      <button
                        type="button"
                        onClick={handleResetCrop}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Crop</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 border-2 border-dashed border-neutral-200 text-center text-neutral-400 uppercase tracking-wider text-xs">
                Upload desktop media above to enable interactive crop editor
              </div>
            )}
          </div>

          {/* Section 4: Click Destination */}
          <div className="space-y-4">
            <h3 className="font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-1">
              4. Click Destination & Linking
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block font-bold uppercase tracking-wider text-neutral-700">
                  Destination Type
                </label>
                <select
                  value={destinationType}
                  onChange={(e) => setDestinationType(e.target.value as BannerDestinationType)}
                  className="input-field w-full text-xs"
                >
                  <option value="none">None (Display Only / Non-Clickable)</option>
                  <option value="product">Specific Product</option>
                  <option value="category">Category / Collection</option>
                  <option value="custom_url">Custom Link (URL)</option>
                </select>
              </div>

              {destinationType === 'product' && (
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700">
                    Select Target Product
                  </label>
                  <select
                    value={destinationProductId}
                    onChange={(e) => setDestinationProductId(e.target.value)}
                    className="input-field w-full text-xs"
                  >
                    <option value="">Select a product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.price})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {destinationType === 'category' && (
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700">
                    Select Target Category
                  </label>
                  <select
                    value={destinationCategoryId}
                    onChange={(e) => setDestinationCategoryId(e.target.value)}
                    className="input-field w-full text-xs"
                  >
                    <option value="">Select a category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {destinationType === 'custom_url' && (
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700">
                    Target URL
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /shop or https://..."
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    className="input-field w-full text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Playback & Colors */}
          <div className="space-y-4">
            <h3 className="font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-1">
              5. Slideshow Rules & Timing
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block font-bold uppercase tracking-wider text-neutral-700">
                  Slide Duration (ms)
                </label>
                <input
                  type="number"
                  min="2000"
                  max="60000"
                  step="500"
                  value={durationMs}
                  onChange={(e) => setDurationMs(Number(e.target.value))}
                  className="input-field w-full text-xs"
                />
                <span className="text-[10px] text-neutral-400">e.g. 5000 = 5 seconds</span>
              </div>

              {mediaType === 'video' && (
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700">
                    Video Advancement
                  </label>
                  <select
                    value={videoAdvanceMode}
                    onChange={(e) => setVideoAdvanceMode(e.target.value as BannerVideoAdvanceMode)}
                    className="input-field w-full text-xs"
                  >
                    <option value="duration">Fixed Timer Duration</option>
                    <option value="on_end">When Video Completes (on_end)</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="block font-bold uppercase tracking-wider text-neutral-700">
                  Display Order
                </label>
                <input
                  type="number"
                  min="1"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  className="input-field w-full text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1">
                <label className="block font-bold uppercase tracking-wider text-neutral-700">
                  Dark Overlay ({Math.round(overlayOpacity * 100)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.9"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                  className="w-full accent-black cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold uppercase tracking-wider text-neutral-700">
                  Text Alignment
                </label>
                <select
                  value={textAlignment}
                  onChange={(e) => setTextAlignment(e.target.value as BannerTextAlignment)}
                  className="input-field w-full text-xs"
                >
                  <option value="left">Left Aligned</option>
                  <option value="center">Centered</option>
                  <option value="right">Right Aligned</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold uppercase tracking-wider text-neutral-700">
                  Text Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-8 h-8 p-0 border border-neutral-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="input-field flex-1 text-xs uppercase font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 border border-neutral-300 text-neutral-700 font-bold uppercase tracking-wider text-xs hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingDesktop || uploadingMobile}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editingBanner ? 'Update Banner' : 'Create Banner'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
