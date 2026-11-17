import React, { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Upload, Loader2, AlertCircle, Check, X, Layers } from 'lucide-react'
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

  const openCreateModal = () => {
    setEditingCategory(null)
    setFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      is_active: true,
      display_order: categories.length + 1,
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
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        image_url: formData.image_url || null,
        is_active: formData.is_active,
        display_order: Number(formData.display_order) || 0,
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
            Category Management
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
            Dynamic categories fetched from Supabase. Launch configured with T-Shirts.
          </p>
        </div>

        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* 2. Notice Box */}
      <div className="bg-neutral-50 p-4 border border-neutral-200 text-xs text-neutral-700 flex items-start gap-3">
        <Layers className="w-5 h-5 text-black shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold uppercase tracking-wider text-black">
            Architecture Rules
          </div>
          <p className="leading-relaxed">
            Categories are loaded dynamically throughout the storefront. You can add new collections (e.g. Hoodies, Pants, Accessories) at any time. Categories with assigned products are protected against accidental deletion.
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
          <button onClick={openCreateModal} className="btn-primary text-xs">
            Create First Category
          </button>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Banner</th>
                <th className="py-3 px-4">Name / Slug</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold">{cat.display_order}</td>

                  <td className="py-3 px-4">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt="" className="w-12 h-10 object-cover border" />
                    ) : (
                      <div className="w-12 h-10 bg-neutral-100 border flex items-center justify-center text-[9px] text-neutral-400 uppercase font-bold">
                        No Img
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-black uppercase tracking-wider">{cat.name}</div>
                    <div className="text-[11px] text-neutral-400 font-mono">/{cat.slug}</div>
                  </td>

                  <td className="py-3 px-4 max-w-xs text-neutral-600 truncate">
                    {cat.description || '—'}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                        cat.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {cat.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-1.5 text-neutral-600 hover:text-black transition-colors"
                        title="Edit Category"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
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
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />

          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-white shadow-2xl border border-neutral-300 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <h2 className="text-xl font-heading font-black uppercase tracking-wider">
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
                  <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. T-Shirts"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="t-shirts"
                    className="input-field font-mono"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Heavyweight 240+ GSM oversized graphic tees..."
                    className="w-full border border-neutral-300 p-3 text-xs outline-none focus:border-black"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
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
                      className="w-4 h-4 text-black focus:ring-black"
                    />
                    <label htmlFor="cat_active" className="font-bold uppercase text-[11px] cursor-pointer">
                      Active on Storefront
                    </label>
                  </div>
                </div>

                {/* Banner Image */}
                <div className="space-y-2 pt-2">
                  <label className="block text-neutral-600 uppercase font-bold text-[10px]">
                    Category Banner Image
                  </label>
                  {formData.image_url && (
                    <img src={formData.image_url} alt="" className="w-full h-24 object-cover border mb-2" />
                  )}
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                      placeholder="IMAGE URL..."
                      className="input-field text-xs"
                    />
                    <label className="btn-secondary text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingImage ? '...' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingImage}
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
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
        </div>
      )}
    </div>
  )
}
