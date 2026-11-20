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
  Copy,
} from 'lucide-react'
import {
  adminGetProducts,
  getCategories,
  getCollections,
  adminSaveProduct,
  adminDeleteProduct,
  uploadImageToStorage,
} from '../lib/storeApi'
import type { Category, Collection, Product, ProductImage, ProductVariant, ColorVariant } from '../types/database'

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL']

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [rackFilter, setRackFilter] = useState<'all' | 'rack'>('all')

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
    collection_id: '',
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

  // Additional PDP Customization Fields
  const [subtitle, setSubtitle] = useState('')
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([])
  const [newColorName, setNewColorName] = useState('')
  const [newColorHex, setNewColorHex] = useState('#000000')
  const [newColorSlug, setNewColorSlug] = useState('')
  const [sizeGuideImage, setSizeGuideImage] = useState('')
  const [returnPolicy, setReturnPolicy] = useState('')
  const [shippingInfo, setShippingInfo] = useState('')
  const [relatedProductsTitle, setRelatedProductsTitle] = useState('YOU MAY LIKE')
  const [selectedRelatedIds, setSelectedRelatedIds] = useState<string[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const [prods, cats, cols] = await Promise.all([adminGetProducts(), getCategories(false), getCollections(false)])
      setProducts(prods)
      setCategories(cats)
      setCollections(cols)
    } catch (err) {
      console.error('Failed to load products:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openCreateModal = (forRack = false) => {
    setEditingProduct(null)
    setFormData({
      name: '',
      slug: '',
      description: '',
      price: 0,
      compare_at_price: 0,
      category_id: categories[0]?.id || '',
      collection_id: '',
      is_active: true,
      is_featured: false,
      is_new: true,
      in_clothing_rail: forRack,
      rail_display_order: forRack ? (products.filter((p) => p.in_clothing_rail).length + 1) : 0,
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
    setSubtitle('')
    setColorVariants([])
    setNewColorName('')
    setNewColorHex('#000000')
    setNewColorSlug('')
    setSizeGuideImage('')
    setReturnPolicy('')
    setShippingInfo('')
    setRelatedProductsTitle('YOU MAY LIKE')
    setSelectedRelatedIds([])
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
      collection_id: prod.collection_id || '',
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
    setSubtitle(prod.details?.subtitle || '')
    setColorVariants(prod.details?.color_variants || [])
    setNewColorName('')
    setNewColorHex('#000000')
    setNewColorSlug('')
    setSizeGuideImage(prod.details?.size_guide_image || '')
    setReturnPolicy(prod.details?.return_policy || '')
    setShippingInfo(prod.details?.shipping_info || '')
    setRelatedProductsTitle(prod.details?.related_products_title || 'YOU MAY LIKE')
    setSelectedRelatedIds(prod.details?.related_product_ids || [])
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
    setImages((prev) => {
      if (index === 0) return prev
      const item = prev[index]
      const remaining = prev.filter((_, i) => i !== index)
      const reordered = [{ ...item, is_primary: true }, ...remaining.map(img => ({ ...img, is_primary: false }))]
      return reordered
    })
  }

  const handleSetHoverImage = (index: number) => {
    setImages((prev) => {
      if (index === 1 || prev.length < 2) return prev
      const item = prev[index]
      const remaining = prev.filter((_, i) => i !== index)
      // keep index 0 as primary, place item at index 1 as hover transition image
      return [remaining[0], { ...item, is_primary: false }, ...remaining.slice(1).map(img => ({ ...img, is_primary: false }))]
    })
  }

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    setImages((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      // Ensure first image is marked primary
      return updated.map((img, idx) => ({
        ...img,
        is_primary: idx === 0,
      }))
    })
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
        ...images
          .filter((img) => Boolean(img.image_url?.trim()))
          .map((img) => ({
            image_url: img.image_url.trim(),
            alt_text: img.alt_text || formData.name,
            is_primary: img.is_primary,
            view_type: 'standard' as const,
          })),
        ...(rackSideImage?.trim()
          ? [
              {
                image_url: rackSideImage.trim(),
                alt_text: `${formData.name} - Side Profile (Rail)`,
                is_primary: false,
                view_type: 'side' as const,
              },
            ]
          : []),
        ...(rackFrontImage?.trim()
          ? [
              {
                image_url: rackFrontImage.trim(),
                alt_text: `${formData.name} - Front View`,
                is_primary: false,
                view_type: 'front' as const,
              },
            ]
          : []),
        ...(rackBackImage?.trim()
          ? [
              {
                image_url: rackBackImage.trim(),
                alt_text: `${formData.name} - Back View`,
                is_primary: false,
                view_type: 'back' as const,
              },
            ]
          : []),
        ...(rackDetailImage?.trim()
          ? [
              {
                image_url: rackDetailImage.trim(),
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
          collection_id: formData.collection_id || null,
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
            subtitle: subtitle.trim() || undefined,
            color_variants: colorVariants.length > 0 ? colorVariants : undefined,
            size_guide_image: sizeGuideImage.trim() || undefined,
            return_policy: returnPolicy.trim() || undefined,
            shipping_info: shippingInfo.trim() || undefined,
            related_products_title: relatedProductsTitle.trim() || 'YOU MAY LIKE',
            related_product_ids: selectedRelatedIds.length > 0 ? selectedRelatedIds : undefined,
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

  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

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

  const handleDuplicate = async (prod: Product) => {
    try {
      setDuplicatingId(prod.id)

      // 1. Generate unique slug and name
      const randSuffix = Math.random().toString(36).substring(2, 6)
      const baseSlug = prod.slug.replace(/-copy(-\w+)?$/, '')
      const newSlug = `${baseSlug}-copy-${randSuffix}`
      const newName = `${prod.name} (Copy)`

      // 2. Prepare product data copy (omitting id so a new record is created)
      const newProductData: Partial<Product> = {
        name: newName,
        slug: newSlug,
        description: prod.description,
        price: prod.price,
        compare_at_price: prod.compare_at_price || null,
        category_id: prod.category_id || null,
        collection_id: prod.collection_id || null,
        is_active: prod.is_active,
        is_featured: prod.is_featured,
        is_new: true,
        in_clothing_rail: prod.in_clothing_rail ?? false,
        rail_display_order: (prod.rail_display_order ?? 0) + 1,
        details: prod.details ? { ...prod.details } : {},
      }

      // 3. Prepare images copy (copies standard images AND dedicated rack side/front/back/detail cutouts)
      const imagesToCopy = (prod.images || []).map((img) => ({
        image_url: img.image_url,
        alt_text: `${newName} – ${img.view_type || 'image'}`,
        is_primary: img.is_primary,
        view_type: (img.view_type as any) || 'standard',
      }))

      // 4. Prepare variants copy with unique SKU per size variant
      const variantsToCopy = (prod.variants || []).map((v) => ({
        size: v.size,
        color: v.color || 'Black',
        sku: `${newSlug.substring(0, 8).toUpperCase()}-${v.size}-${randSuffix.toUpperCase()}`,
        stock_quantity: v.stock_quantity ?? 10,
      }))

      const finalVariants =
        variantsToCopy.length > 0
          ? variantsToCopy
          : DEFAULT_SIZES.map((s) => ({
              size: s,
              color: 'Black',
              sku: `${newSlug.substring(0, 8).toUpperCase()}-${s}-${randSuffix.toUpperCase()}`,
              stock_quantity: 10,
            }))

      // 5. Save as separate product in database
      await adminSaveProduct(newProductData, imagesToCopy, finalVariants)

      // 6. Reload products list
      await loadData()
      if (modalOpen) setModalOpen(false)
    } catch (err: any) {
      console.error('Failed to duplicate product:', err)
      alert(`Duplication failed: ${err.message || 'Unknown error'}`)
    } finally {
      setDuplicatingId(null)
    }
  }

  const rackProductsCount = products.filter((p) => p.in_clothing_rail).length

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())

    if (rackFilter === 'rack') {
      return matchesSearch && p.in_clothing_rail
    }
    return matchesSearch
  })

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

        <div className="flex items-center gap-3">
          <button
            onClick={() => openCreateModal(true)}
            className="btn-secondary flex items-center gap-1.5 border-black text-xs font-black"
          >
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>+ Add to WENZY RACK</span>
          </button>

          <button onClick={() => openCreateModal(false)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* WENZY RACK (Interactive Clothing Rail) Dedicated Control Header */}
      <div className="bg-neutral-900 text-white p-5 border border-neutral-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-white text-black rounded-xs">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="font-heading font-black uppercase text-sm tracking-wider text-white">
              WENZY RACK (Interactive Clothing Rail Controls)
            </span>
            <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 text-[10px] font-mono rounded">
              {rackProductsCount} piece{rackProductsCount !== 1 ? 's' : ''} on rail
            </span>
          </div>
          <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
            Configure boutique pieces for the suspended clothing rail below the hero banner. Click <strong>&quot;+ Add to WENZY RACK&quot;</strong> (or edit any product) to set rail position and upload the 3 required transparent cutouts: <strong>Side-Profile</strong>, <strong>Front View</strong>, and <strong>Back View</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setRackFilter(rackFilter === 'rack' ? 'all' : 'rack')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border transition-colors ${
              rackFilter === 'rack'
                ? 'bg-white text-black border-white'
                : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'
            }`}
          >
            {rackFilter === 'rack' ? 'Show All Products' : 'Filter Rack Pieces Only'}
          </button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-3 border border-neutral-200">
        <div className="flex-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-neutral-400 ml-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SEARCH PRODUCTS BY NAME OR SLUG..."
            className="w-full text-xs font-bold uppercase tracking-wider text-black outline-none placeholder-neutral-400"
          />
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-1.5 border-t sm:border-t-0 sm:border-l border-neutral-200 pt-2 sm:pt-0 sm:pl-3">
          <button
            type="button"
            onClick={() => setRackFilter('all')}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
              rackFilter === 'all' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            All Products ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setRackFilter('rack')}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1 transition-colors ${
              rackFilter === 'rack' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <span>★ WENZY RACK</span>
            <span className="font-mono">({rackProductsCount})</span>
          </button>
        </div>
      </div>

      {/* 3. Products Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-black" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white p-12 text-center border border-neutral-200 space-y-3">
          <div className="text-sm font-bold uppercase tracking-wider text-black">No Products Found</div>
          <button onClick={() => openCreateModal(false)} className="btn-primary text-xs">
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
                          onClick={() => handleDuplicate(p)}
                          disabled={duplicatingId === p.id}
                          className="p-1.5 text-neutral-600 hover:text-black transition-colors disabled:opacity-50"
                          title="Duplicate Product (creates independent copy)"
                        >
                          {duplicatingId === p.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
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

                    <div className="sm:col-span-2">
                      <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                        Subtitle / Tagline (Optional non-bold text displayed under product name on PDP)
                      </label>
                      <input
                        type="text"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="e.g. Heavyweight drop-shoulder graphic tee in custom-milled French Terry"
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                      Collection (Homepage Filter Tab)
                    </label>
                    <select
                      value={formData.collection_id}
                      onChange={(e) => setFormData((prev) => ({ ...prev, collection_id: e.target.value }))}
                      className="input-field cursor-pointer"
                    >
                      <option value="">No Collection</option>
                      {collections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.is_active ? '' : '(Hidden)'}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Assigns this product to a homepage filter tab (Shop the Edit section).
                    </p>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-neutral-600 uppercase font-bold text-[10px]">
                        Description & Story
                      </label>
                      <span className="text-[10px] text-neutral-400 font-medium">
                        Supports **bold**, bullets (• or -), and paragraphs
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder={`**Discipline is a choice. Temptation is a test.**\n\nCrafted from heavyweight 240 GSM French terry cotton...\n\n• **Front:** clean chest print\n• **Back:** oversized artwork\n• **Fit:** oversized streetwear cut\n• **Fabric:** 100% combed cotton`}
                      className="w-full border border-neutral-300 p-3 text-xs outline-none focus:border-black font-sans leading-relaxed"
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
                      <div key={idx} className="relative w-28 h-36 bg-neutral-100 border border-neutral-300 rounded overflow-hidden group flex flex-col justify-between">
                        <img src={img.image_url} alt="" className="w-full h-24 object-cover" />
                        
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 bg-black/80 hover:bg-black text-white p-1 rounded-full opacity-80 hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>

                        {/* Badges for Primary and Hover Alternate */}
                        <div className="absolute top-1 left-1 flex flex-col gap-1">
                          {idx === 0 && (
                            <span className="bg-black text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-xs">
                              1. Primary
                            </span>
                          )}
                          {idx === 1 && (
                            <span className="bg-emerald-700 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-xs">
                              2. Hover View
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="bg-neutral-50 border-t border-neutral-200 p-1 flex items-center justify-between text-[8px] font-bold">
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(idx)}
                            className={`px-1.5 py-0.5 rounded transition-colors ${
                              idx === 0
                                ? 'bg-black text-white font-black'
                                : 'text-neutral-600 hover:text-black hover:bg-neutral-200'
                            }`}
                          >
                            {idx === 0 ? 'Primary' : 'Make Primary'}
                          </button>
                          {images.length > 1 && idx !== 1 && (
                            <button
                              type="button"
                              onClick={() => handleSetHoverImage(idx)}
                              className="px-1.5 py-0.5 text-neutral-600 hover:text-emerald-700 hover:bg-neutral-200 rounded transition-colors"
                            >
                              Make Hover
                            </button>
                          )}
                          <div className="flex gap-1 ml-auto">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMoveImage(idx, idx - 1)}
                                className="px-1 text-neutral-500 hover:text-black font-mono font-bold"
                                title="Move left"
                              >
                                ←
                              </button>
                            )}
                            {idx < images.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleMoveImage(idx, idx + 1)}
                                className="px-1 text-neutral-500 hover:text-black font-mono font-bold"
                                title="Move right"
                              >
                                →
                              </button>
                            )}
                          </div>
                        </div>
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

                {/* 1. Color Variants Section (Linked with products by admin, matching Image 3) */}
                <div className="space-y-3 pt-3 border-t border-neutral-200">
                  <div>
                    <div className="font-bold uppercase tracking-wider text-black">
                      Color Swatches & Linked Products
                    </div>
                    <p className="text-[10px] text-neutral-500">
                      Displays interactive circular color swatches on the PDP. When clicked, navigates to the linked product.
                    </p>
                  </div>

                  {/* Add Swatch */}
                  <div className="flex flex-wrap items-end gap-2 bg-neutral-50 p-3 border border-neutral-200 rounded">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Color Name</label>
                      <input
                        type="text"
                        value={newColorName}
                        onChange={(e) => setNewColorName(e.target.value)}
                        placeholder="e.g. Black"
                        className="w-28 px-2 py-1 text-xs border border-neutral-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Color Hex</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={newColorHex}
                          onChange={(e) => setNewColorHex(e.target.value)}
                          className="w-7 h-7 p-0 border border-neutral-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={newColorHex}
                          onChange={(e) => setNewColorHex(e.target.value)}
                          className="w-20 px-2 py-1 text-xs border border-neutral-300 rounded bg-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">Linked Product</label>
                      <select
                        value={newColorSlug}
                        onChange={(e) => setNewColorSlug(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-neutral-300 rounded bg-white"
                      >
                        <option value="">Select product to link...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.slug}>
                            {p.name} ({p.slug})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newColorName.trim()) return
                        setColorVariants((prev) => [
                          ...prev,
                          {
                            name: newColorName.trim(),
                            hex: newColorHex,
                            slug: newColorSlug || formData.slug,
                          },
                        ])
                        setNewColorName('')
                      }}
                      className="px-3 py-1.5 bg-black text-white rounded text-xs font-bold uppercase tracking-wider hover:bg-neutral-800"
                    >
                      Add Swatch
                    </button>
                  </div>

                  {/* Existing Swatches */}
                  {colorVariants.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {colorVariants.map((col, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-white px-3 py-1.5 border border-neutral-300 rounded shadow-xs"
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-neutral-400"
                            style={{ backgroundColor: col.hex }}
                          />
                          <span className="font-bold text-xs">{col.name}</span>
                          {col.slug && (
                            <span className="text-[10px] text-neutral-400 font-mono">→ {col.slug}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setColorVariants((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-neutral-400 hover:text-red-600 ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. PDP Accordion Details (Matching Image 1: Size Guide, Return Policy, Shipping) */}
                <div className="space-y-3 pt-3 border-t border-neutral-200">
                  <div className="font-bold uppercase tracking-wider text-black">
                    PDP Accordion Sections (Size Guide, Policies)
                  </div>

                  <div>
                    <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                      Size Guide Image URL (or upload custom chart)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={sizeGuideImage}
                        onChange={(e) => setSizeGuideImage(e.target.value)}
                        placeholder="https://... or leave empty for default WENZY chart"
                        className="input-field flex-1"
                      />
                      <label className="btn-secondary text-[11px] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Chart</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const f = e.target.files?.[0]
                            if (f) {
                              try {
                                const res = await uploadImageToStorage(f, 'product-images')
                                if (res.url) setSizeGuideImage(res.url)
                              } catch (err: any) {
                                alert(`Upload failed: ${err.message}`)
                              }
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                        Return Policy Custom Text
                      </label>
                      <textarea
                        rows={2}
                        value={returnPolicy}
                        onChange={(e) => setReturnPolicy(e.target.value)}
                        placeholder="Leave blank for standard 7-day hassle-free exchange policy..."
                        className="w-full border border-neutral-300 p-2 text-xs outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                        Shipping Information Custom Text
                      </label>
                      <textarea
                        rows={2}
                        value={shippingInfo}
                        onChange={(e) => setShippingInfo(e.target.value)}
                        placeholder="Leave blank for standard 24-48h dispatch & 2-4 day express delivery..."
                        className="w-full border border-neutral-300 p-2 text-xs outline-none focus:border-black"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Related Products ("YOU MAY LIKE") */}
                <div className="space-y-3 pt-3 border-t border-neutral-200">
                  <div className="font-bold uppercase tracking-wider text-black">
                    Related Products Section
                  </div>

                  <div>
                    <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                      Section Title
                    </label>
                    <input
                      type="text"
                      value={relatedProductsTitle}
                      onChange={(e) => setRelatedProductsTitle(e.target.value)}
                      placeholder="e.g. YOU MAY LIKE"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                      Choose Recommended Products (Optional — defaults to same category)
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-neutral-200 rounded p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-neutral-50">
                      {products
                        .filter((p) => p.id !== editingProduct?.id)
                        .map((p) => {
                          const isChecked = selectedRelatedIds.includes(p.id)
                          return (
                            <label
                              key={p.id}
                              className="flex items-center gap-2 p-1.5 bg-white border border-neutral-200 rounded cursor-pointer hover:border-black text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRelatedIds((prev) => [...prev, p.id])
                                  } else {
                                    setSelectedRelatedIds((prev) => prev.filter((id) => id !== p.id))
                                  }
                                }}
                                className="rounded text-black focus:ring-black"
                              />
                              <span className="font-bold truncate">{p.name}</span>
                            </label>
                          )
                        })}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-6 border-t border-neutral-200 flex items-center justify-between gap-3">
                  <div>
                    {editingProduct && (
                      <button
                        type="button"
                        disabled={saving || duplicatingId === editingProduct.id}
                        onClick={() => handleDuplicate(editingProduct)}
                        className="btn-secondary flex items-center gap-1.5 text-xs text-neutral-700 hover:text-black border-neutral-300"
                        title="Create an independent duplicate copy of this piece"
                      >
                        {duplicatingId === editingProduct.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>Duplicate Piece</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
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
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
