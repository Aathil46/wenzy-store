import React, { useEffect, useState } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Video,
  ExternalLink,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  adminGetBanners,
  adminToggleBannerActive,
  adminDeleteBanner,
  adminReorderBanners,
  getBannerPublicUrl,
} from '../lib/storeApi'
import type { StorefrontBanner } from '../types/database'
import BannerFormModal from './BannerFormModal'

// Sortable Banner Row Component
interface SortableBannerItemProps {
  banner: StorefrontBanner
  onEdit: (banner: StorefrontBanner) => void
  onDelete: (banner: StorefrontBanner) => void
  onToggleActive: (banner: StorefrontBanner) => void
}

function SortableBannerItem({
  banner,
  onEdit,
  onDelete,
  onToggleActive,
}: SortableBannerItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : undefined,
  }

  const mediaUrl = getBannerPublicUrl(banner.media_path)

  const destinationBadge = () => {
    switch (banner.destination_type) {
      case 'product':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
            Product: {banner.destination_product?.name || banner.destination_product_id}
          </span>
        )
      case 'category':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold uppercase tracking-wider">
            Category: {banner.destination_category?.name || banner.destination_category_id}
          </span>
        )
      case 'custom_url':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
            URL: {banner.destination_url}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 text-neutral-600 border border-neutral-200 text-[10px] font-bold uppercase tracking-wider">
            No Link
          </span>
        )
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border transition-shadow ${
        banner.is_active ? 'border-neutral-200 shadow-sm' : 'border-neutral-200 bg-neutral-50/70 opacity-75'
      } flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 gap-4`}
    >
      {/* Left side: Drag handle + Thumbnail + Meta */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-neutral-400 hover:text-black cursor-grab active:cursor-grabbing p-1 -ml-1 transition-colors"
          title="Drag to reorder"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Media Preview Thumbnail */}
        <div className="w-20 h-14 bg-neutral-900 border border-neutral-200 overflow-hidden relative flex-shrink-0 flex items-center justify-center">
          {banner.media_type === 'video' ? (
            <video
              src={mediaUrl}
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={mediaUrl}
              alt={banner.title}
              className="w-full h-full object-cover"
            />
          )}

          {/* Media type icon badge */}
          <div className="absolute bottom-1 right-1 bg-black/80 text-white p-0.5 text-[9px] rounded-none">
            {banner.media_type === 'video' ? (
              <Video className="w-3 h-3 text-emerald-400" />
            ) : (
              <ImageIcon className="w-3 h-3 text-neutral-200" />
            )}
          </div>
        </div>

        {/* Banner Details */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-neutral-400">
              #{banner.display_order}
            </span>
            <h3 className="text-sm font-black uppercase tracking-tight text-black truncate">
              {banner.title}
            </h3>
            {banner.heading && (
              <span className="text-xs text-neutral-500 truncate hidden md:inline">
                — "{banner.heading}"
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {destinationBadge()}

            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-neutral-500">
              <Clock className="w-3 h-3 text-neutral-400" />
              {banner.media_type === 'video' && banner.video_advance_mode === 'on_end'
                ? 'On End'
                : `${(banner.duration_ms / 1000).toFixed(1)}s`}
            </span>

            <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-neutral-100 text-neutral-700 px-1.5 py-0.5 border border-neutral-200 uppercase font-bold">
              {banner.aspect_ratio || 'Banner (3.2:1)'}
              {banner.object_fit === 'contain' ? ' • Fit' : ''}
            </span>

            {banner.mobile_media_path && (
              <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 font-bold uppercase tracking-wider">
                Mobile Media
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Active toggle + Edit + Delete */}
      <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 flex-shrink-0">
        {/* Toggle visibility */}
        <button
          onClick={() => onToggleActive(banner)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
            banner.is_active
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200'
          }`}
          title={banner.is_active ? 'Click to deactivate' : 'Click to activate'}
        >
          {banner.is_active ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Active</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hidden</span>
            </>
          )}
        </button>

        {/* Edit */}
        <button
          onClick={() => onEdit(banner)}
          className="p-2 border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition-colors"
          title="Edit Banner"
        >
          <Edit2 className="w-4 h-4" />
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(banner)}
          className="p-2 border border-neutral-200 text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
          title="Delete Banner"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<StorefrontBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<StorefrontBanner | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await adminGetBanners()
      setBanners(data)
    } catch (err: any) {
      console.error('Failed to load banners:', err)
      setStatusMessage(`Error loading banners: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openCreateModal = () => {
    setEditingBanner(null)
    setModalOpen(true)
  }

  const openEditModal = (banner: StorefrontBanner) => {
    setEditingBanner(banner)
    setModalOpen(true)
  }

  const handleToggleActive = async (banner: StorefrontBanner) => {
    const newStatus = !banner.is_active
    // Optimistic UI update
    setBanners((prev) =>
      prev.map((b) => (b.id === banner.id ? { ...b, is_active: newStatus } : b))
    )

    try {
      await adminToggleBannerActive(banner.id, newStatus)
      showNotification(`Banner "${banner.title}" is now ${newStatus ? 'active' : 'hidden'}.`)
    } catch (err: any) {
      console.error('Error toggling banner status:', err)
      // Rollback
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, is_active: !newStatus } : b))
      )
      alert(`Failed to update banner status: ${err.message}`)
    }
  }

  const handleDelete = async (banner: StorefrontBanner) => {
    if (!confirm(`Are you sure you want to delete banner "${banner.title}"? This cannot be undone.`)) {
      return
    }

    try {
      await adminDeleteBanner(banner.id, banner.media_path, banner.mobile_media_path)
      setBanners((prev) => prev.filter((b) => b.id !== banner.id))
      showNotification(`Banner "${banner.title}" deleted successfully.`)
    } catch (err: any) {
      console.error('Failed to delete banner:', err)
      alert(`Failed to delete banner: ${err.message}`)
    }
  }

  // Handle Drag & Drop reordering with optimistic updates & rollback
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = banners.findIndex((b) => b.id === active.id)
    const newIndex = banners.findIndex((b) => b.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const previousBanners = [...banners]
    const newBanners = arrayMove(banners, oldIndex, newIndex).map((b, idx) => ({
      ...b,
      display_order: idx + 1,
    }))

    // Optimistic update
    setBanners(newBanners)

    try {
      const orderedIds = newBanners.map((b) => b.id)
      await adminReorderBanners(orderedIds)
      showNotification('Banner display order updated successfully.')
    } catch (err: any) {
      console.error('Failed to reorder banners:', err)
      // Rollback to previous order
      setBanners(previousBanners)
      alert(`Failed to save banner reordering: ${err.message}`)
    }
  }

  const showNotification = (msg: string) => {
    setStatusMessage(msg)
    setTimeout(() => {
      setStatusMessage(null)
    }, 4000)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
            Hero Banner & Slideshow Management
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
            Manage high-res photography and cinematic video slides displayed on the storefront hero.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Slide</span>
        </button>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-neutral-400 hover:text-black font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Feature notice / info card */}
      <div className="bg-neutral-50 p-4 border border-neutral-200 text-xs text-neutral-700 flex items-start gap-3">
        <Sparkles className="w-5 h-5 flex-shrink-0 text-black mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold uppercase tracking-wider text-black">
            Drag-and-Drop Ordering & Slideshow Rules
          </div>
          <p className="text-neutral-600 leading-relaxed">
            Drag the handle (⋮⋮) on any banner to reorder how slides appear on the homepage.
            Each banner supports custom durations, video auto-advance on completion, responsive mobile media, and clickable destinations to products or categories.
          </p>
        </div>
      </div>

      {/* Content list */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
          <span className="text-xs font-mono uppercase tracking-widest">
            Loading Hero Banners from Supabase...
          </span>
        </div>
      ) : banners.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-neutral-200 bg-white p-8 space-y-4">
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-400">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-black uppercase tracking-wider text-black">
              No Hero Banners Found
            </h3>
            <p className="text-xs text-neutral-500">
              Create your first dynamic image or video banner slide to replace the default storefront placeholder.
            </p>
          </div>
          <button onClick={openCreateModal} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Create First Banner</span>
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={banners.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {banners.map((banner) => (
                <SortableBannerItem
                  key={banner.id}
                  banner={banner}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Form Modal */}
      <BannerFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={loadData}
        editingBanner={editingBanner}
        currentCount={banners.length}
      />
    </div>
  )
}
