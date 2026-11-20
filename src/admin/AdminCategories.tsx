import React, { useEffect, useState, useRef } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  Upload,
  Loader2,
  AlertCircle,
  Check,
  X,
  Navigation,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Move,
  Sliders,
  Image as ImageIcon,
} from 'lucide-react'
import {
  getCategories,
  adminSaveCategory,
  adminDeleteCategory,
  adminReorderCategories,
  uploadImageToStorage,
} from '../lib/storeApi'
import type { Category, CategoryCropSettings } from '../types/database'

const DEFAULT_CROP: CategoryCropSettings = { x: 0, y: 0, zoom: 1 }

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    is_active: true,
    display_order: 1,
    show_in_header: true,
    crop_settings: { ...DEFAULT_CROP },
  })

  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Interactive Live Drag Handlers for 4:5 frame (360x450 px)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ clientX: number; clientY: number; cropX: number; cropY: number } | null>(null)
  const cropContainerRef = useRef<HTMLDivElement | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const cats = await getCategories(false)
      setCategories(cats)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openCreateModal = () => {
    setEditingCategory(null)
    setFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      is_active: true,
      display_order: categories.length + 1,
      show_in_header: false,
      crop_settings: { ...DEFAULT_CROP },
    })
    setErrorMsg('')
    setModalOpen(true)
  }

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat)
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image_url: cat.image_url || '',
      is_active: cat.is_active,
      display_order: cat.display_order,
      show_in_header: cat.show_in_header ?? true,
      crop_settings: cat.crop_settings
        ? {
            x: Number(cat.crop_settings.x ?? 0),
            y: Number(cat.crop_settings.y ?? 0),
            zoom: Number(cat.crop_settings.zoom ?? 1),
          }
        : { ...DEFAULT_CROP },
    })
    setErrorMsg('')
    setModalOpen(true)
  }

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingCategory ? prev.slug : slug,
    }))
  }

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validImages.includes(file.type)) {
      setErrorMsg('Please upload a valid image file (JPG, PNG, WebP, or GIF).')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image file size must be less than 10MB.')
      return
    }

    setUploadingImage(true)
    setErrorMsg('')
    const res = await uploadImageToStorage(file, 'category-images')
    setUploadingImage(false)

    if (res.error) {
      setErrorMsg(`Image upload error: ${res.error}`)
      return
    }

    if (res.url) {
      setFormData((prev) => ({
        ...prev,
        image_url: res.url!,
        crop_settings: { ...DEFAULT_CROP },
      }))
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!formData.image_url) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      cropX: formData.crop_settings.x,
      cropY: formData.crop_settings.y,
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

    setFormData((prev) => ({
      ...prev,
      crop_settings: {
        ...prev.crop_settings,
        x: newX,
        y: newY,
      },
    }))
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false)
    dragStartRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handleResetCrop = () => {
    setFormData((prev) => ({
      ...prev,
      crop_settings: { ...DEFAULT_CROP },
    }))
  }

  const handleToggleHeader = async (cat: Category) => {
    const newStatus = !(cat.show_in_header ?? true)
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, show_in_header: newStatus } : c))
    )

    try {
      await adminSaveCategory({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image_url: cat.image_url,
        is_active: cat.is_active,
        display_order: cat.display_order,
        show_in_header: newStatus,
        crop_settings: cat.crop_settings,
      })
    } catch (err: any) {
      alert(`Failed to update header display: ${err.message}`)
      loadData()
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index <= 0 || reordering) return
    setReordering(true)
    const newCats = [...categories]
    const temp = newCats[index]
    newCats[index] = newCats[index - 1]
    newCats[index - 1] = temp
    const reordered = newCats.map((c, idx) => ({ ...c, display_order: idx + 1 }))
    setCategories(reordered)
    try {
      await adminReorderCategories(reordered.map((c) => c.id))
    } catch (err: any) {
      alert(`Reorder failed: ${err.message}`)
      await loadData()
    } finally {
      setReordering(false)
    }
  }

  const handleMoveDown = async (index: number) => {
    if (index >= categories.length - 1 || reordering) return
    setReordering(true)
    const newCats = [...categories]
    const temp = newCats[index]
    newCats[index] = newCats[index + 1]
    newCats[index + 1] = temp
    const reordered = newCats.map((c, idx) => ({ ...c, display_order: idx + 1 }))
    setCategories(reordered)
    try {
      await adminReorderCategories(reordered.map((c) => c.id))
    } catch (err: any) {
      alert(`Reorder failed: ${err.message}`)
      await loadData()
    } finally {
      setReordering(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!formData.name || !formData.slug) {
      setErrorMsg('Category name and slug are required.')
      return
    }

    setSaving(true)
    try {
      await adminSaveCategory({
        id: editingCategory?.id,
        name: formData.name.trim().toUpperCase(),
        slug: formData.slug.trim().toLowerCase(),
        description: formData.description,
        image_url: formData.image_url || null,
        is_active: formData.is_active,
        display_order: Number(formData.display_order) || 0,
        show_in_header: formData.show_in_header,
        crop_settings: formData.crop_settings,
      })

      await loadData()
      setModalOpen(false)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save category.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return

    const res = await adminDeleteCategory(cat.id)
    if (!res.success) {
      alert(res.error || 'Cannot delete category.')
      return
    }

    await loadData()
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
            Category & Collection Management
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
            Manage storefront category cards (360 × 450 px 4:5 ratio) and top header navigation tabs.
          </p>
        </div>

        <button onClick={() => openCreateModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* 2. Notice Box */}
      <div className="bg-neutral-50 p-4 border border-neutral-200 text-xs text-neutral-700 flex items-start gap-3">
        <Navigation className="w-5 h-5 text-black shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold uppercase tracking-wider text-black">
            Category Management & Navigation Control
          </div>
          <p className="leading-relaxed">
            Categories appear in the top-left menu drawer (and in the top navigation bar when marked as <strong>Header Tab</strong>). Click the edit icon to adjust the 4:5 image crop & zoom. Use the Up/Down arrows to reorder categories.
          </p>
        </div>
      </div>

      {/* 3. Categories List Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-black" />
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white p-12 text-center border border-neutral-200 space-y-3">
          <div className="text-sm font-bold uppercase tracking-wider">No Categories Found</div>
          <button onClick={() => openCreateModal()} className="btn-primary text-xs">
            Create First Category
          </button>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                <th className="py-3 px-4 w-28 text-center">Order</th>
                <th className="py-3 px-4 w-20">Card (4:5)</th>
                <th className="py-3 px-4">Name / Slug</th>
                <th className="py-3 px-4">Header Navigation</th>
                <th className="py-3 px-4">Catalog Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {categories.map((cat, index) => {
                const crop = cat.crop_settings || DEFAULT_CROP
                return (
                  <tr key={cat.id} className="hover:bg-neutral-50 transition-colors">
                    {/* Reorder Buttons & Display Order */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-mono font-bold text-neutral-700 w-6 text-right">#{cat.display_order}</span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={index === 0 || reordering}
                            onClick={() => handleMoveUp(index)}
                            className={`p-1 rounded hover:bg-neutral-200 transition-colors ${
                              index === 0 ? 'text-neutral-300 cursor-not-allowed' : 'text-neutral-700'
                            }`}
                            title="Move Category Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === categories.length - 1 || reordering}
                            onClick={() => handleMoveDown(index)}
                            className={`p-1 rounded hover:bg-neutral-200 transition-colors ${
                              index === categories.length - 1 ? 'text-neutral-300 cursor-not-allowed' : 'text-neutral-700'
                            }`}
                            title="Move Category Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Image Preview thumbnail (4:5 portrait) */}
                    <td className="py-3 px-4">
                      <div className="w-12 h-15 aspect-[4/5] bg-neutral-100 border border-neutral-200 overflow-hidden relative shadow-2xs">
                        {cat.image_url ? (
                          <img
                            src={cat.image_url}
                            alt={cat.name}
                            style={{
                              transform: `translate(${crop.x}%, ${crop.y}%) scale(${crop.zoom})`,
                              transformOrigin: 'center center',
                            }}
                            className="w-full h-full object-cover select-none pointer-events-none"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-300">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Name / Slug */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-black uppercase">{cat.name}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">/category/{cat.slug}</div>
                      {cat.description && (
                        <div className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">{cat.description}</div>
                      )}
                    </td>

                    {/* Header Nav Toggle */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleHeader(cat)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded transition-colors ${
                          cat.show_in_header ?? true
                            ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200'
                        }`}
                        title="Click to toggle top header display"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>{cat.show_in_header ?? true ? 'Header Tab' : 'Catalog Only'}</span>
                      </button>
                    </td>

                    {/* Catalog Status */}
                    <td className="py-3 px-4">
                      {cat.is_active ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                          Hidden
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 hover:bg-neutral-200 text-neutral-700 transition-colors"
                          title="Edit Category & Image Crop"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 hover:bg-red-50 text-red-600 transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Category Modal (Create / Edit with Interactive 4:5 Crop & Zoom Editor) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-3xl bg-white border border-neutral-200 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-black">
                {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-neutral-700 uppercase font-bold text-[10px] mb-1">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. T SHIRTS, HOODIES, SNEAKERS"
                      className="input-field font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-700 uppercase font-bold text-[10px] mb-1">
                      URL Slug <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="e.g. t-shirts"
                      className="input-field font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-700 uppercase font-bold text-[10px] mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Curated heavyweight streetwear essentials..."
                      className="w-full border border-neutral-300 p-2.5 text-xs outline-none focus:border-black"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-neutral-700 uppercase font-bold text-[10px] mb-1">
                        Display Order
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.display_order}
                        onChange={(e) => setFormData((prev) => ({ ...prev, display_order: Number(e.target.value) }))}
                        className="input-field"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="cat_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                        className="w-4 h-4 text-black focus:ring-black rounded-none"
                      />
                      <label htmlFor="cat_active" className="font-bold uppercase text-[11px] cursor-pointer">
                        Active Catalog
                      </label>
                    </div>
                  </div>

                  {/* Show in Top Header Navigation Checkbox */}
                  <div className="p-3 bg-red-50/50 border border-red-200 space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.show_in_header}
                        onChange={(e) => setFormData((prev) => ({ ...prev, show_in_header: e.target.checked }))}
                        className="w-4 h-4 text-red-600 focus:ring-red-600 rounded-none cursor-pointer"
                      />
                      <span className="font-bold uppercase tracking-wider text-neutral-900 text-[11px]">
                        Show in Top Header Navigation Tabs
                      </span>
                    </label>
                    <p className="text-[10px] text-neutral-500 pl-6">
                      When checked, this category appears as a primary tab in the top header.
                    </p>
                  </div>
                </div>

                {/* Column 2: Fixed 360 x 450 px (4:5 Ratio) Image Crop & Zoom Editor */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-neutral-900 uppercase font-black text-[11px] tracking-wider">
                      Card Image & Crop (360 × 450 px, 4:5 ratio)
                    </label>
                    {formData.image_url && (
                      <button
                        type="button"
                        onClick={handleResetCrop}
                        className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-black flex items-center gap-1"
                        title="Reset position and zoom"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Crop</span>
                      </button>
                    )}
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleImageFileUpload}
                  />

                  {/* Image container or Upload box */}
                  {formData.image_url ? (
                    <div className="space-y-3">
                      {/* Interactive Drag & Position Container (Fixed 4:5 ratio, 360x450 px frame) */}
                      <div className="flex justify-center bg-neutral-100 p-3 border border-neutral-200 rounded">
                        <div
                          ref={cropContainerRef}
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerUp}
                          className="relative w-[288px] h-[360px] sm:w-[320px] sm:h-[400px] overflow-hidden bg-neutral-900 border-2 border-neutral-400 shadow-inner select-none cursor-grab active:cursor-grabbing touch-none"
                          style={{ aspectRatio: '4/5' }}
                          title="Click and drag to adjust image position"
                        >
                          <img
                            src={formData.image_url}
                            alt="Category Preview"
                            style={{
                              transform: `translate(${formData.crop_settings.x}%, ${formData.crop_settings.y}%) scale(${formData.crop_settings.zoom})`,
                              transformOrigin: 'center center',
                            }}
                            className="w-full h-full object-cover select-none pointer-events-none"
                          />

                          {/* Top-left position indicator */}
                          <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[9px] font-mono px-2 py-0.5 rounded pointer-events-none flex items-center gap-1">
                            <Move className="w-3 h-3 text-red-400" />
                            <span>Drag image inside 4:5 frame</span>
                          </div>

                          {/* Offset coordinates badge */}
                          <div className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-xs text-white text-[9px] font-mono px-2 py-0.5 rounded pointer-events-none">
                            X: {formData.crop_settings.x}% | Y: {formData.crop_settings.y}%
                          </div>

                          {isDragging && (
                            <div className="absolute inset-0 bg-black/10 pointer-events-none flex items-center justify-center">
                              <div className="bg-black/85 text-white text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                                Repositioning...
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Zoom Slider */}
                      <div className="bg-neutral-50 p-3 border border-neutral-200 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700">
                          <span className="flex items-center gap-1.5 uppercase">
                            <Sliders className="w-3.5 h-3.5 text-neutral-500" />
                            Zoom Level
                          </span>
                          <span className="font-mono text-neutral-900 font-bold">
                            {formData.crop_settings.zoom.toFixed(2)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="3"
                          step="0.05"
                          value={formData.crop_settings.zoom}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              crop_settings: {
                                ...prev.crop_settings,
                                zoom: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full accent-black cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-neutral-400 font-mono">
                          <span>1.0x (Standard)</span>
                          <span>2.0x</span>
                          <span>3.0x (Max Zoom)</span>
                        </div>
                      </div>

                      {/* Replace / Remove Image Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={uploadingImage}
                          onClick={() => fileInputRef.current?.click()}
                          className="btn-secondary text-[11px] flex-1 flex items-center justify-center gap-1.5 py-2"
                        >
                          {uploadingImage ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <span>Replace Image</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              image_url: '',
                              crop_settings: { ...DEFAULT_CROP },
                            }))
                          }
                          className="px-3 py-2 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-[11px] font-bold uppercase transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Upload Placeholder Area */
                    <div className="space-y-3">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-[4/5] max-h-[300px] border-2 border-dashed border-neutral-300 hover:border-black flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors bg-neutral-50 hover:bg-neutral-100"
                      >
                        {uploadingImage ? (
                          <div className="space-y-2">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-black" />
                            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                              Uploading image to storage...
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 flex items-center justify-center mx-auto text-neutral-600 shadow-2xs">
                              <Upload className="w-5 h-5" />
                            </div>
                            <div className="font-bold text-xs uppercase tracking-wider text-black">
                              Upload Category Card Image
                            </div>
                            <p className="text-[10px] text-neutral-500 max-w-xs">
                              Recommended ratio 4:5 (360 × 450 px). JPG, PNG, or WebP up to 10MB.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Manual Image URL fallback */}
                      <div className="pt-2">
                        <label className="block text-neutral-600 uppercase font-bold text-[9px] mb-1">
                          Or Paste Image URL Directly
                        </label>
                        <input
                          type="url"
                          value={formData.image_url}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              image_url: e.target.value,
                              crop_settings: { ...DEFAULT_CROP },
                            }))
                          }
                          placeholder="https://..."
                          className="input-field text-xs font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Footer */}
              <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingImage}
                  className="btn-primary min-w-36 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Category</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
