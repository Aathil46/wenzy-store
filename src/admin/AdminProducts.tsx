import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Edit2,
  Trash2,
  Upload,
  Check,
  X,
  Loader2,
  Search,
  ExternalLink,
  AlertCircle,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import {
  adminGetProducts,
  getCategories,
  adminSaveProduct,
  adminDeleteProduct,
  uploadImageToStorage,
} from '../lib/storeApi'
import type { Category, Product, ProductImage, ProductVariant } from '../types/database'

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL']

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Edit / Create Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: 999,
    compare_at_price: 1799,
    category_id: '',
    is_active: true,
    is_featured: false,
    is_new: true,
    in_clothing_rail: false,
    rail_display_order: 0,
    fabric: '100% Combed Cotton French Terry',
    gsm: 240,
    fit: 'Oversized Boxy Fit',
    care: 'Machine wash cold inside out. Do not iron on print.',
  })

  // Catalog images (standard view)
  const [images, setImages] = useState<{ image_url: string; alt_text?: string; is_primary?: boolean }[]>([])
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  // Dedicated WENZY RACK Cutout images
  const [rackSideImage, setRackSideImage] = useState('')
  const [rackFrontImage, setRackFrontImage] = useState('')
  const [rackBackImage, setRackBackImage] = useState('')
  const [rackDetailImage, setRackDetailImage] = useState('')
  const [uploadingRackSlot, setUploadingRackSlot] = useState<'side' | 'front' | 'back' | 'detail' | null>(null)

  const [variants, setVariants] = useState<
    { size: string; color: string; sku?: string; stock_quantity: number }[]
  >([])

  const loadData = async () => {
    setLoading(true)
    try {
      const [prods, cats] = await Promise.all([adminGetProducts(), getCategories(false)])
      setProducts(prods)
      setCategories(cats)
    } catch (err) {
      console.error('Failed to load products:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openCreateModal = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      slug: '',
      description: '',
      price: 0,
      compare_at_price: 0,
      category_id: categories[0]?.id || '',
      is_active: true,
      is_featured: false,
      is_new: true,
      in_clothing_rail: false,
      rail_display_order: 0,
      fabric: '100% Combed Cotton French Terry',
      gsm: 240,
      fit: 'Oversized Drop-Shoulder Fit',
      care: 'Machine wash cold inside out. Do not iron on print.',
    })
    setImages([])
    setRackSideImage('')
    setRackFrontImage('')
    setRackBackImage('')
    setRackDetailImage('')
    setVariants(
      DEFAULT_SIZES.map((s) => ({
        size: s,
        color: 'Black',
        sku: '',
        stock_quantity: 0,
      }))
    )
    setErrorMsg('')
    setModalOpen(true)
  }

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod)
    setFormData({
      name: prod.name,
      slug: prod.slug,
      description: prod.description,
      price: prod.price,
      compare_at_price: prod.compare_at_price || 0,
      category_id: prod.category_id || '',
      is_active: prod.is_active,
      is_featured: prod.is_featured,
      is_new: prod.is_new,
      in_clothing_rail: prod.in_clothing_rail ?? false,
      rail_display_order: prod.rail_display_order ?? 0,
      fabric: prod.details?.fabric || '100% Combed Cotton',
      gsm: prod.details?.gsm || 240,
      fit: prod.details?.fit || 'Oversized Boxy Fit',
      care: prod.details?.care || 'Machine wash cold inside out.',
    })

    // Separate standard catalog gallery images from WENZY RACK cutout images
    const allImgs = prod.images || []
    const standardImgs = allImgs.filter((img) => !img.view_type || img.view_type === 'standard')
    setImages(
      standardImgs.map((img) => ({
        image_url: img.image_url,
        alt_text: img.alt_text || '',
        is_primary: img.is_primary,
      }))
    )

    // Populate dedicated rack image slots
    setRackSideImage(allImgs.find((img) => img.view_type === 'side')?.image_url || '')
    setRackFrontImage(allImgs.find((img) => img.view_type === 'front')?.image_url || '')
    setRackBackImage(allImgs.find((img) => img.view_type === 'back')?.image_url || '')
    setRackDetailImage(allImgs.find((img) => img.view_type === 'detail')?.image_url || '')

    setVariants(
      prod.variants && prod.variants.length > 0
        ? prod.variants.map((v) => ({
            size: v.size,
            color: v.color,
            sku: v.sku || '',
            stock_quantity: v.stock_quantity,
          }))
        : DEFAULT_SIZES.map((s) => ({ size: s, color: 'Black', sku: `${prod.slug}-${s}`, stock_quantity: 10 }))
    )
    setErrorMsg('')
    setModalOpen(true)
  }

  const handleRackImageUpload = async (
    slot: 'side' | 'front' | 'back' | 'detail',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingRackSlot(slot)
    const res = await uploadImageToStorage(file, 'product-images')
    setUploadingRackSlot(null)

    if (res.error) {
      alert(`Upload error: ${res.error}`)
      return
    }

    if (res.url) {
      if (slot === 'side') setRackSideImage(res.url)
      else if (slot === 'front') setRackFrontImage(res.url)
      else if (slot === 'back') setRackBackImage(res.url)
      else if (slot === 'detail') setRackDetailImage(res.url)
    }
  }

  const handleRemoveRackImage = (slot: 'side' | 'front' | 'back' | 'detail') => {
    if (slot === 'side') setRackSideImage('')
    else if (slot === 'front') setRackFrontImage('')
    else if (slot === 'back') setRackBackImage('')
    else if (slot === 'detail') setRackDetailImage('')
  }

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingProduct ? prev.slug : slug,
    }))
  }

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    const res = await uploadImageToStorage(file, 'product-images')
    setUploadingImage(false)

    if (res.error) {
      alert(`Upload error: ${res.error}`)
      return
    }

    if (res.url) {
      setImages((prev) => [...prev, { image_url: res.url!, is_primary: prev.length === 0 }])
    }
  }

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return
    setImages((prev) => [...prev, { image_url: imageUrlInput.trim(), is_primary: prev.length === 0 }])
    setImageUrlInput('')
  }

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const filtered = prev.filter((_, i) => i !== index)
      if (filtered.length > 0 && !filtered.some((img) => img.is_primary)) {
        filtered[0].is_primary = true
      }
      return filtered
    })
  }

  const handleSetPrimaryImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        is_primary: i === index,
      }))
    )
  }

  const handleVariantStockChange = (index: number, stock: number) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, stock_quantity: Math.max(0, stock) } : v))
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!formData.name || !formData.slug || !formData.price) {
      setErrorMsg('Please complete product name, slug, and price.')
      return
    }

    if (images.length === 0) {
      setErrorMsg('Please attach at least one product image.')
      return
    }

    setSaving(true)
    try {
      // Assemble catalog images + dedicated WENZY RACK cutout images
      const allImagesToSave = [
        ...images.map((img) => ({
          image_url: img.image_url,
          alt_text: img.alt_text || formData.name,
          is_primary: img.is_primary,
          view_type: 'standard' as const,
        })),
        ...(rackSideImage
          ? [
              {
                image_url: rackSideImage,
                alt_text: `${formData.name} - Side Profile (Rail)`,
                is_primary: false,
                view_type: 'side' as const,
              },
            ]
          : []),
        ...(rackFrontImage
          ? [
              {
                image_url: rackFrontImage,
                alt_text: `${formData.name} - Front View`,
                is_primary: false,
                view_type: 'front' as const,
              },
            ]
          : []),
        ...(rackBackImage
          ? [
              {
                image_url: rackBackImage,
                alt_text: `${formData.name} - Back View`,
                is_primary: false,
                view_type: 'back' as const,
              },
            ]
          : []),
        ...(rackDetailImage
          ? [
              {
                image_url: rackDetailImage,
                alt_text: `${formData.name} - Detail View`,
                is_primary: false,
                view_type: 'detail' as const,
              },
            ]
          : []),
      ]

      await adminSaveProduct(
        {
          id: editingProduct?.id,
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          price: Number(formData.price),
          compare_at_price: Number(formData.compare_at_price) || null,
          category_id: formData.category_id || null,
          is_active: formData.is_active,
          is_featured: formData.is_featured,
          is_new: formData.is_new,
          in_clothing_rail: formData.in_clothing_rail,
          rail_display_order: Number(formData.rail_display_order) || 0,
          details: {
            fabric: formData.fabric,
            gsm: Number(formData.gsm),
            fit: formData.fit,
            care: formData.care,
          },
        },
        allImagesToSave,
        variants
      )

      await loadData()
      setModalOpen(false)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save product.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (prod: Product) => {
    if (!confirm(`Are you sure you want to delete product "${prod.name}"? This action is permanent.`)) {
      return
    }

    try {
      await adminDeleteProduct(prod.id)
      await loadData()
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`)
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
            Product Management
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
            Manage catalog pieces, imagery, sizing variants, and stock levels
          </p>
        </div>

        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-white p-3 border border-neutral-200">
        <Search className="w-4 h-4 text-neutral-400 ml-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="SEARCH PRODUCTS BY NAME OR SLUG..."
          className="w-full text-xs font-bold uppercase tracking-wider text-black outline-none placeholder-neutral-400"
        />
      </div>

      {/* 3. Products Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-black" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white p-12 text-center border border-neutral-200 space-y-3">
          <div className="text-sm font-bold uppercase tracking-wider text-black">No Products Found</div>
          <button onClick={openCreateModal} className="btn-primary text-xs">
            Create First Product
          </button>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price / Compare</th>
                <th className="py-3 px-4">Total Stock</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredProducts.map((p) => {
                const primary = p.images?.find((img) => img.is_primary)?.image_url || p.images?.[0]?.image_url
                const totalStock = p.variants?.reduce((s, v) => s + v.stock_quantity, 0) ?? 0

                return (
                  <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                    {/* Item Image + Title */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={primary || '/assets/wenzy_front_texture.png'}
                          alt={p.name}
                          className="w-12 h-14 object-cover bg-neutral-100 border border-neutral-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-black uppercase tracking-wider truncate max-w-xs">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-neutral-400 font-mono">{p.slug}</div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 font-bold uppercase text-[10px] rounded">
                        {p.category?.name || 'Unassigned'}
                      </span>
                    </td>

                    {/* Pricing */}
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-black">₹{p.price.toLocaleString('en-IN')}</div>
                      {p.compare_at_price && (
                        <div className="text-[11px] text-neutral-400 line-through">
                          ₹{p.compare_at_price.toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>

                    {/* Inventory */}
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold ${
                          totalStock === 0
                            ? 'text-red-600'
                            : totalStock <= 10
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {totalStock} units
                      </span>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        {p.variants?.length || 0} size variants
                      </div>
                    </td>

                    {/* Status Badges */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-block w-fit px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                            p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
                          }`}
                        >
                          {p.is_active ? 'Published' : 'Draft'}
                        </span>
                        {p.is_featured && (
                          <span className="inline-block w-fit px-2 py-0.5 text-[9px] font-bold uppercase bg-black text-white rounded">
                            Featured
                          </span>
                        )}
                        {p.in_clothing_rail && (
                          (() => {
                            const imgs = p.images || []
                            const hasSide = imgs.some((i) => i.view_type === 'side' && Boolean(i.image_url?.trim()))
                            const hasFront = imgs.some((i) => i.view_type === 'front' && Boolean(i.image_url?.trim()))
                            const hasBack = imgs.some((i) => i.view_type === 'back' && Boolean(i.image_url?.trim()))
                            const isReady = hasSide && hasFront && hasBack
                            return isReady ? (
                              <span
                                className="inline-block w-fit px-2 py-0.5 text-[9px] font-black uppercase bg-neutral-900 text-white rounded"
                                title={`Live on WENZY RACK (Position ${p.rail_display_order || 0})`}
                              >
                                ★ Rack Ready #{p.rail_display_order || 0}
                              </span>
                            ) : (
                              <span
                                className="inline-block w-fit px-2 py-0.5 text-[9px] font-bold uppercase bg-amber-100 text-amber-800 rounded border border-amber-300"
                                title="Missing required images: Side, Front, or Back cutout"
                              >
                                Rack Incomplete
                              </span>
                            )
                          })()
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/product/${p.slug}`}
                          target="_blank"
                          className="p-1.5 text-neutral-400 hover:text-black transition-colors"
                          title="View on Storefront"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-neutral-600 hover:text-black transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* 4. Create / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />

          <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6">
            <div className="relative w-full max-w-3xl bg-white shadow-2xl border border-neutral-300 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
                <h2 className="text-xl font-heading font-black uppercase tracking-wider text-black">
                  {editingProduct ? 'Edit Streetwear Piece' : 'Add New Streetwear Piece'}
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
                {/* Basic Details */}
                <div className="space-y-3">
                  <div className="font-bold uppercase tracking-wider text-black">General Information</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="e.g. Oversized Graphic T-Shirt"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                        URL Slug *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.slug}
                        onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                        placeholder="oversized-graphic-t-shirt"
                        className="input-field font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                      Category Assignment *
                    </label>
                    {categories.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                        <span>No categories found in database. Create a category first.</span>
                        <Link to="/admin/categories" className="btn-primary py-1 px-3 text-[10px]">
                          Create Category
                        </Link>
                      </div>
                    ) : (
                      <select
                        value={formData.category_id}
                        onChange={(e) => setFormData((prev) => ({ ...prev, category_id: e.target.value }))}
                        className="input-field cursor-pointer"
                      >
                        <option value="">Select a Category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.is_active ? '' : '(Inactive)'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                      Description & Concept
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="High-density back screen print, 240 GSM drop shoulder cut..."
                      className="w-full border border-neutral-300 p-3 text-xs outline-none focus:border-black"
                    />
                  </div>
                </div>

                {/* Pricing & Visibility */}
                <div className="space-y-3 pt-3 border-t border-neutral-200">
                  <div className="font-bold uppercase tracking-wider text-black">Pricing & Flags</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                        Sale Price (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={formData.price}
                        onChange={(e) => setFormData((prev) => ({ ...prev, price: Number(e.target.value) }))}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                        Compare-at Price (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.compare_at_price}
                        onChange={(e) => setFormData((prev) => ({ ...prev, compare_at_price: Number(e.target.value) }))}
                        className="input-field"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                        className="w-4 h-4 text-black focus:ring-black"
                      />
                      <label htmlFor="is_active" className="font-bold uppercase text-[11px] cursor-pointer">
                        Published
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="is_featured"
                        checked={formData.is_featured}
                        onChange={(e) => setFormData((prev) => ({ ...prev, is_featured: e.target.checked }))}
                        className="w-4 h-4 text-black focus:ring-black"
                      />
                      <label htmlFor="is_featured" className="font-bold uppercase text-[11px] cursor-pointer">
                        Featured Drop
                      </label>
                    </div>
                  </div>
                </div>

                {/* Fabric & Fit Details */}
                <div className="space-y-3 pt-3 border-t border-neutral-200">
                  <div className="font-bold uppercase tracking-wider text-black">Specifications</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">Fabric</label>
                      <input
                        type="text"
                        value={formData.fabric}
                        onChange={(e) => setFormData((prev) => ({ ...prev, fabric: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">GSM Weight</label>
                      <input
                        type="number"
                        value={formData.gsm}
                        onChange={(e) => setFormData((prev) => ({ ...prev, gsm: Number(e.target.value) }))}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">Fit Type</label>
                      <input
                        type="text"
                        value={formData.fit}
                        onChange={(e) => setFormData((prev) => ({ ...prev, fit: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>

                {/* WENZY RACK (Interactive Clothing Rail) Configuration */}
                <div className="space-y-4 pt-4 border-t-2 border-neutral-900 bg-neutral-50 p-4 border rounded">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-black text-white rounded">
                        <Sparkles className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="font-heading font-black uppercase tracking-wider text-black text-sm">
                          WENZY RACK (Interactive Clothing Rail)
                        </div>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
                          Configure 2.5D studio photographic cutouts for the homepage rail experience
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="in_clothing_rail"
                          checked={formData.in_clothing_rail}
                          onChange={(e) => setFormData((prev) => ({ ...prev, in_clothing_rail: e.target.checked }))}
                          className="w-4 h-4 text-black focus:ring-black rounded"
                        />
                        <label htmlFor="in_clothing_rail" className="font-black uppercase text-[11px] cursor-pointer text-black">
                          Feature on WENZY RACK
                        </label>
                      </div>

                      {formData.in_clothing_rail && (
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-bold uppercase text-neutral-500">
                            Position:
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={formData.rail_display_order}
                            onChange={(e) => setFormData((prev) => ({ ...prev, rail_display_order: Number(e.target.value) }))}
                            className="w-14 border border-neutral-300 px-2 py-1 text-xs font-black text-center bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {formData.in_clothing_rail && (
                    <>
                      {/* Rack Readiness Status Banner */}
                      {(() => {
                        const hasSide = Boolean(rackSideImage?.trim())
                        const hasFront = Boolean(rackFrontImage?.trim())
                        const hasBack = Boolean(rackBackImage?.trim())
                        const isReady = hasSide && hasFront && hasBack
                        const missing: string[] = []
                        if (!hasSide) missing.push('Side-Profile Cutout')
                        if (!hasFront) missing.push('Front View Cutout')
                        if (!hasBack) missing.push('Back View Cutout')

                        return isReady ? (
                          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] flex items-center gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              <strong>READY FOR WENZY RACK:</strong> All 3 required photographic cutouts are attached. This garment will be actively displayed on the homepage clothing rail.
                            </span>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 text-[11px] flex items-center gap-2.5">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <div>
                              <strong className="uppercase">Incomplete for Storefront Rail:</strong> Missing{' '}
                              <span className="font-bold underline">{missing.join(', ')}</span>.
                              <div className="text-[10px] text-amber-700 mt-0.5">
                                Note: WENZY RACK strictly hides garments missing required images. You can save your draft now and upload cutouts later.
                              </div>
                            </div>
                          </div>
                        )
                      })()}

                      {/* 3 Dedicated Cutout Upload Slots */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                        {/* Slot 1: Side Profile */}
                        <div className="bg-white border border-neutral-300 p-3 flex flex-col justify-between space-y-2">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold uppercase tracking-wider text-black text-[11px]">
                                1. Side Profile
                              </span>
                              <span className="px-1.5 py-0.5 bg-neutral-900 text-white text-[8px] font-black uppercase rounded">
                                Mandatory for Rail
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-500 leading-tight">
                              Transparent cutout hanging sideways on rail in resting state.
                            </p>
                          </div>

                          <div className="relative aspect-3/4 w-full bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:8px_8px] bg-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden">
                            {rackSideImage ? (
                              <>
                                <img src={rackSideImage} alt="Side Profile Cutout" className="h-full w-full object-contain p-2" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRackImage('side')}
                                  className="absolute top-1 right-1 bg-black text-white p-1 rounded-full opacity-80 hover:opacity-100"
                                  title="Remove side image"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <div className="text-center p-3 text-neutral-400">
                                <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-40" />
                                <span className="text-[9px] uppercase font-bold block">No Side Cutout</span>
                              </div>
                            )}
                          </div>

                          <label className="btn-secondary text-[10px] flex items-center justify-center gap-1.5 cursor-pointer py-1.5">
                            <Upload className="w-3 h-3" />
                            <span>{uploadingRackSlot === 'side' ? 'Uploading...' : rackSideImage ? 'Replace Side Cutout' : 'Upload Side Cutout'}</span>
                            <input
                              type="file"
                              accept="image/webp,image/png,image/*"
                              disabled={uploadingRackSlot === 'side'}
                              onChange={(e) => handleRackImageUpload('side', e)}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Slot 2: Front View */}
                        <div className="bg-white border border-neutral-300 p-3 flex flex-col justify-between space-y-2">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold uppercase tracking-wider text-black text-[11px]">
                                2. Front View
                              </span>
                              <span className="px-1.5 py-0.5 bg-neutral-900 text-white text-[8px] font-black uppercase rounded">
                                Mandatory for Focus
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-500 leading-tight">
                              High-definition transparent front cutout for 3D modal view.
                            </p>
                          </div>

                          <div className="relative aspect-3/4 w-full bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:8px_8px] bg-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden">
                            {rackFrontImage ? (
                              <>
                                <img src={rackFrontImage} alt="Front View Cutout" className="h-full w-full object-contain p-2" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRackImage('front')}
                                  className="absolute top-1 right-1 bg-black text-white p-1 rounded-full opacity-80 hover:opacity-100"
                                  title="Remove front image"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <div className="text-center p-3 text-neutral-400">
                                <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-40" />
                                <span className="text-[9px] uppercase font-bold block">No Front Cutout</span>
                              </div>
                            )}
                          </div>

                          <label className="btn-secondary text-[10px] flex items-center justify-center gap-1.5 cursor-pointer py-1.5">
                            <Upload className="w-3 h-3" />
                            <span>{uploadingRackSlot === 'front' ? 'Uploading...' : rackFrontImage ? 'Replace Front Cutout' : 'Upload Front Cutout'}</span>
                            <input
                              type="file"
                              accept="image/webp,image/png,image/*"
                              disabled={uploadingRackSlot === 'front'}
                              onChange={(e) => handleRackImageUpload('front', e)}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Slot 3: Back View */}
                        <div className="bg-white border border-neutral-300 p-3 flex flex-col justify-between space-y-2">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold uppercase tracking-wider text-black text-[11px]">
                                3. Back View
                              </span>
                              <span className="px-1.5 py-0.5 bg-neutral-900 text-white text-[8px] font-black uppercase rounded">
                                Mandatory for Focus
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-500 leading-tight">
                              Oversized back graphic cutout for interactive 3D flip.
                            </p>
                          </div>

                          <div className="relative aspect-3/4 w-full bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:8px_8px] bg-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden">
                            {rackBackImage ? (
                              <>
                                <img src={rackBackImage} alt="Back View Cutout" className="h-full w-full object-contain p-2" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRackImage('back')}
                                  className="absolute top-1 right-1 bg-black text-white p-1 rounded-full opacity-80 hover:opacity-100"
                                  title="Remove back image"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <div className="text-center p-3 text-neutral-400">
                                <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-40" />
                                <span className="text-[9px] uppercase font-bold block">No Back Cutout</span>
                              </div>
                            )}
                          </div>

                          <label className="btn-secondary text-[10px] flex items-center justify-center gap-1.5 cursor-pointer py-1.5">
                            <Upload className="w-3 h-3" />
                            <span>{uploadingRackSlot === 'back' ? 'Uploading...' : rackBackImage ? 'Replace Back Cutout' : 'Upload Back Cutout'}</span>
                            <input
                              type="file"
                              accept="image/webp,image/png,image/*"
                              disabled={uploadingRackSlot === 'back'}
                              onChange={(e) => handleRackImageUpload('back', e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Imagery Management */}
                <div className="space-y-3 pt-3 border-t border-neutral-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold uppercase tracking-wider text-black">Standard Catalog Photography</span>
                      <p className="text-[10px] text-neutral-400 uppercase">Regular model and lookbook gallery images</p>
                    </div>
                    <span className="text-neutral-400 text-[10px] uppercase font-bold">
                      {images.length} images attached
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-24 bg-neutral-100 border border-neutral-300 overflow-hidden group">
                        <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 bg-black text-white p-1 rounded-full opacity-80 hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryImage(idx)}
                          className={`absolute bottom-0 inset-x-0 py-0.5 text-[8px] font-bold uppercase text-center ${
                            img.is_primary ? 'bg-black text-white' : 'bg-white/80 text-black hover:bg-black hover:text-white'
                          }`}
                        >
                          {img.is_primary ? 'Primary' : 'Make Primary'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <label className="btn-secondary text-[11px] flex items-center justify-center gap-2 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingImage ? 'Uploading...' : 'Upload Image File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingImage}
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>

                    <div className="flex-1 flex gap-2">
                      <input
                        type="url"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        placeholder="OR PASTE IMAGE URL..."
                        className="input-field text-xs"
                      />
                      <button type="button" onClick={handleAddImageUrl} className="btn-secondary px-4 text-xs">
                        Add URL
                      </button>
                    </div>
                  </div>
                </div>

                {/* Size & Inventory Variant Grid */}
                <div className="space-y-3 pt-3 border-t border-neutral-200">
                  <div className="font-bold uppercase tracking-wider text-black">Inventory Per Size</div>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    {variants.map((v, idx) => (
                      <div key={v.size} className="bg-neutral-50 p-2.5 border border-neutral-200 text-center space-y-1">
                        <div className="font-black text-sm uppercase">{v.size}</div>
                        <label className="block text-[9px] text-neutral-400 font-bold uppercase">Stock Units</label>
                        <input
                          type="number"
                          min={0}
                          value={v.stock_quantity}
                          onChange={(e) => handleVariantStockChange(idx, Number(e.target.value))}
                          className="w-full text-center border border-neutral-300 py-1 text-xs font-bold outline-none focus:border-black"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-6 border-t border-neutral-200 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary min-w-36 flex items-center justify-center gap-2">
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>{editingProduct ? 'Save Changes' : 'Create Piece'}</span>
                    )}
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
