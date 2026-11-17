import React, { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Upload, Loader2, AlertCircle, Check, X, Layers, Sparkles, Navigation } from 'lucide-react'
import { getCategories, adminSaveCategory, adminDeleteCategory, uploadImageToStorage } from '../lib/storeApi'
import type { Category } from '../types/database'

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

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
  })

  const [uploadingImage, setUploadingImage] = useState(false)

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

  const openCreateModal = (presetName?: string) => {
    setEditingCategory(null)
    const name = presetName || ''
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    setFormData({
      name,
      slug,
      description: '',
      image_url: '',
      is_active: true,
      display_order: categories.length + 1,
      show_in_header: true,
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

    setUploadingImage(true)
    const res = await uploadImageToStorage(file, 'category-images')
    setUploadingImage(false)

    if (res.error) {
      alert(`Image upload error: ${res.error}`)
      return
    }

    if (res.url) {
      setFormData((prev) => ({ ...prev, image_url: res.url! }))
    }
  }

  const handleToggleHeader = async (cat: Category) => {
    const newStatus = !(cat.show_in_header ?? true)
    // Optimistic update
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
      })
    } catch (err: any) {
      alert(`Failed to update header display: ${err.message}`)
      loadData()
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
            Category & Header Navigation Management
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
            Manage your store collections and the top header navigation tabs (e.g. MEN, WOMEN, SNEAKERS).
          </p>
        </div>

        <button onClick={() => openCreateModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Add Custom Category</span>
        </button>
      </div>

      {/* Quick Add Presets Bar */}
      <div className="bg-neutral-50 p-4 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-neutral-700 font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-red-600" />
          <span>Quick Add Header Category:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {['WOMEN', 'SNEAKERS', 'HOODIES', 'OVERSIZED TEES', 'ACCESSORIES'].map((preset) => {
            const alreadyExists = categories.some((c) => c.name.toUpperCase() === preset)
            return (
              <button
                key={preset}
                disabled={alreadyExists}
                onClick={() => openCreateModal(preset)}
                className={`px-3 py-1.5 border text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${
                  alreadyExists
                    ? 'bg-neutral-200 text-neutral-400 border-neutral-200 cursor-not-allowed'
                    : 'bg-white hover:bg-black hover:text-white border-neutral-300 text-neutral-900 shadow-2xs'
                }`}
                title={alreadyExists ? `${preset} already created` : `Add ${preset} category`}
              >
                <span>+ {preset}</span>
                {alreadyExists && <span className="text-[9px] text-emerald-600 font-mono">(Added)</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Notice Box */}
      <div className="bg-neutral-50 p-4 border border-neutral-200 text-xs text-neutral-700 flex items-start gap-3">
        <Navigation className="w-5 h-5 text-black shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold uppercase tracking-wider text-black">
            Top Header Navigation Integration
          </div>
          <p className="leading-relaxed">
            Categories marked as <strong className="text-red-600">Header Tab</strong> will immediately appear in the storefront's top sticky navigation bar (with active red underline). You can reorder them using the Display Order sequence.
          </p>
        </div>
      </div>

      {/* 3. Categories List */}
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
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Name / Slug</th>
                <th className="py-3 px-4">Header Navigation</th>
                <th className="py-3 px-4">Catalog Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold">#{cat.display_order}</td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-black uppercase">{cat.name}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">/category/{cat.slug}</div>
                  </td>

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

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-1.5 hover:bg-neutral-200 text-neutral-700 transition-colors"
                        title="Edit Category"
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white border border-neutral-200 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h2 className="text-base font-black uppercase tracking-wider text-black">
                {editingCategory ? 'Edit Category' : 'Create Category'}
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

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-700 uppercase font-bold text-[10px] mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. WOMEN"
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
                  placeholder="e.g. women"
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
                  placeholder="Womenswear drop collection..."
                  className="w-full border border-neutral-300 p-3 text-xs outline-none focus:border-black"
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
                  When checked, this category appears as a primary tab in the top header (like MEN, WOMEN).
                </p>
              </div>

              <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary min-w-32 flex items-center justify-center gap-2">
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
