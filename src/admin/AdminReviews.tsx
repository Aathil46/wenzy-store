import React, { useEffect, useState } from 'react'
import {
  Star,
  Trash2,
  CheckCircle2,
  XCircle,
  Plus,
  Loader2,
  X,
  Play,
  Upload,
  MessageSquare,
  Search,
  ExternalLink,
} from 'lucide-react'
import {
  adminGetAllReviews,
  adminSaveReview,
  adminDeleteReview,
  adminGetProducts,
  uploadReviewMedia,
} from '../lib/storeApi'
import type { Product, ProductReview, ReviewMediaItem } from '../types/database'

export default function AdminReviews() {
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRating, setFilterRating] = useState<'all' | number>('all')

  // Create/Edit Review Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingReview, setEditingReview] = useState<ProductReview | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Form State
  const [formData, setFormData] = useState<{
    product_id: string
    author_name: string
    author_email: string
    rating: number
    title: string
    content: string
    is_verified_buyer: boolean
    is_approved: boolean
    media_urls: ReviewMediaItem[]
  }>({
    product_id: '',
    author_name: '',
    author_email: '',
    rating: 5,
    title: '',
    content: '',
    is_verified_buyer: true,
    is_approved: true,
    media_urls: [],
  })

  // Media upload in admin
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [mediaUrlInput, setMediaUrlInput] = useState('')
  const [mediaTypeInput, setMediaTypeInput] = useState<'image' | 'video'>('image')

  // Lightbox
  const [previewMedia, setPreviewMedia] = useState<ReviewMediaItem | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [revs, prods] = await Promise.all([adminGetAllReviews(), adminGetProducts()])
      setReviews(revs)
      setProducts(prods)
      if (prods.length > 0 && !formData.product_id) {
        setFormData((prev) => ({ ...prev, product_id: prods[0].id }))
      }
    } catch (err) {
      console.error('Failed to load reviews data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openCreateModal = () => {
    setEditingReview(null)
    setFormData({
      product_id: products[0]?.id || '',
      author_name: '',
      author_email: '',
      rating: 5,
      title: '',
      content: '',
      is_verified_buyer: true,
      is_approved: true,
      media_urls: [],
    })
    setErrorMsg('')
    setModalOpen(true)
  }

  const openEditModal = (rev: ProductReview) => {
    setEditingReview(rev)
    setFormData({
      product_id: rev.product_id,
      author_name: rev.author_name,
      author_email: rev.author_email || '',
      rating: rev.rating,
      title: rev.title || '',
      content: rev.content,
      is_verified_buyer: rev.is_verified_buyer,
      is_approved: rev.is_approved,
      media_urls: rev.media_urls || [],
    })
    setErrorMsg('')
    setModalOpen(true)
  }

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isVideo = file.type.startsWith('video/')
    const type = isVideo ? 'video' : 'image'

    // Video duration and size validation
    if (isVideo) {
      if (file.size > 20 * 1024 * 1024) {
        setErrorMsg('Video file must be under 20MB.')
        return
      }

      // Check duration
      const videoEl = document.createElement('video')
      videoEl.preload = 'metadata'
      videoEl.src = URL.createObjectURL(file)
      await new Promise<void>((resolve) => {
        videoEl.onloadedmetadata = () => {
          if (videoEl.duration > 30.5) {
            setErrorMsg(`Video duration exceeds 30 seconds limit (${Math.round(videoEl.duration)}s).`)
            resolve()
          } else {
            resolve()
          }
        }
        videoEl.onerror = () => resolve()
      })

      if (videoEl.duration > 30.5) {
        return
      }
    }

    setUploadingMedia(true)
    setErrorMsg('')
    try {
      const uploaded = await uploadReviewMedia(file, type)
      setFormData((prev) => ({
        ...prev,
        media_urls: [...prev.media_urls, uploaded],
      }))
    } catch (err: any) {
      setErrorMsg(err.message || 'Media upload failed')
    } finally {
      setUploadingMedia(false)
      e.target.value = ''
    }
  }

  const handleAddMediaUrl = () => {
    if (!mediaUrlInput.trim()) return
    setFormData((prev) => ({
      ...prev,
      media_urls: [...prev.media_urls, { type: mediaTypeInput, url: mediaUrlInput.trim() }],
    }))
    setMediaUrlInput('')
  }

  const handleRemoveMedia = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      media_urls: prev.media_urls.filter((_, i) => i !== index),
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.product_id || !formData.author_name.trim() || !formData.content.trim()) {
      setErrorMsg('Product, author name, and review content are required.')
      return
    }

    setSaving(true)
    setErrorMsg('')
    try {
      await adminSaveReview({
        id: editingReview?.id,
        product_id: formData.product_id,
        author_name: formData.author_name.trim(),
        author_email: formData.author_email.trim() || null,
        rating: formData.rating,
        title: formData.title.trim() || null,
        content: formData.content.trim(),
        is_verified_buyer: formData.is_verified_buyer,
        is_approved: formData.is_approved,
        media_urls: formData.media_urls,
      })
      await loadData()
      setModalOpen(false)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save review.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this review?')) return
    try {
      await adminDeleteReview(id)
      await loadData()
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`)
    }
  }

  const handleToggleApproval = async (rev: ProductReview) => {
    try {
      await adminSaveReview({
        id: rev.id,
        is_approved: !rev.is_approved,
      })
      await loadData()
    } catch (err: any) {
      alert(`Update failed: ${err.message}`)
    }
  }

  const filteredReviews = reviews.filter((r) => {
    const matchesSearch =
      r.author_name.toLowerCase().includes(search.toLowerCase()) ||
      r.content.toLowerCase().includes(search.toLowerCase()) ||
      (r.title && r.title.toLowerCase().includes(search.toLowerCase())) ||
      (r.product?.name && r.product.name.toLowerCase().includes(search.toLowerCase()))

    const matchesRating = filterRating === 'all' || r.rating === filterRating
    return matchesSearch && matchesRating
  })

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-neutral-200">
        <div>
          <h1 className="text-xl font-heading font-black uppercase tracking-wider flex items-center gap-2 text-black">
            <MessageSquare className="w-6 h-6 text-black" />
            Customer Reviews Management
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Manage, curate, add and moderate customer ratings, photo & video reviews for WENZY products.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto py-2.5 px-4 text-xs font-bold uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          Add Review
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-neutral-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by author, product, or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded focus:border-black focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Rating:</span>
          <button
            onClick={() => setFilterRating('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded ${
              filterRating === 'all' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            All ({reviews.length})
          </button>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = reviews.filter((r) => r.rating === stars).length
            return (
              <button
                key={stars}
                onClick={() => setFilterRating(stars)}
                className={`px-2.5 py-1.5 text-xs font-bold rounded flex items-center gap-1 ${
                  filterRating === stars ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                <span>{stars}★</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
            <div className="text-xs font-mono text-neutral-400">Loading customer reviews...</div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-neutral-300 mx-auto" />
            <p className="text-sm font-bold text-neutral-700">No reviews found</p>
            <p className="text-xs text-neutral-400">No customer reviews match your search or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Reviewer</th>
                  <th className="py-3 px-4">Title & Comment</th>
                  <th className="py-3 px-4">Media</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredReviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-neutral-900 max-w-xs truncate">
                      {rev.product?.name || 'Unknown Product'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'}`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-black flex items-center gap-1">
                        {rev.author_name}
                        {rev.is_verified_buyer && (
                          <span title="Verified Buyer">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          </span>
                        )}
                      </div>
                      {rev.author_email && (
                        <div className="text-[10px] text-neutral-400">{rev.author_email}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-md">
                      {rev.title && <div className="font-bold text-black mb-0.5">{rev.title}</div>}
                      <p className="text-neutral-600 line-clamp-2 leading-relaxed">{rev.content}</p>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {rev.media_urls && rev.media_urls.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          {rev.media_urls.map((m, mIdx) => (
                            <button
                              key={mIdx}
                              onClick={() => setPreviewMedia(m)}
                              className="relative w-9 h-9 rounded bg-neutral-100 overflow-hidden border border-neutral-200 hover:border-black shrink-0"
                            >
                              {m.type === 'video' ? (
                                <div className="w-full h-full flex items-center justify-center bg-black/80 text-white">
                                  <Play className="w-3.5 h-3.5 fill-white" />
                                </div>
                              ) : (
                                <img src={m.url} alt="" className="w-full h-full object-cover" />
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-neutral-300 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleApproval(rev)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          rev.is_approved
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {rev.is_approved ? 'Approved' : 'Pending'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-400 text-[11px] whitespace-nowrap">
                      {new Date(rev.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(rev)}
                          className="px-2.5 py-1 text-xs border border-neutral-300 rounded hover:border-black font-semibold text-neutral-700 hover:text-black"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(rev.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors"
                          title="Delete review"
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
      </div>

      {/* Review Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-neutral-300 w-full max-w-xl my-8 overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h2 className="text-sm font-heading font-black uppercase tracking-wider text-black">
                {editingReview ? 'Edit Review' : 'Add New Customer Review'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Product Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Product *
                </label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, product_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:border-black focus:outline-hidden"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Star Rating */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Rating (1 to 5 Stars) *
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, rating: star }))}
                      className="p-1 text-neutral-300 hover:text-amber-400 focus:outline-hidden"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= formData.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-neutral-700">{formData.rating} out of 5</span>
                </div>
              </div>

              {/* Author & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Reviewer Name *
                  </label>
                  <input
                    type="text"
                    value={formData.author_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, author_name: e.target.value }))}
                    placeholder="e.g. Aryan Sharma"
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:border-black focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Reviewer Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={formData.author_email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, author_email: e.target.value }))}
                    placeholder="e.g. aryan@example.com"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:border-black focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Title & Content */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Review Headline / Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Heavyweight quality is next level!"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:border-black focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Review Content / Feedback *
                </label>
                <textarea
                  rows={3}
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Share details on cut, GSM weight, collar fit, wash experience..."
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:border-black focus:outline-hidden"
                />
              </div>

              {/* Media Section: Images & Videos */}
              <div className="space-y-2 pt-2 border-t border-neutral-200">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                  Review Media (Photos & Videos up to 30s)
                </label>

                {/* Upload or Add URL */}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded cursor-pointer border border-neutral-300">
                    {uploadingMedia ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleMediaUpload}
                      disabled={uploadingMedia}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-neutral-400">or add direct URL:</span>
                  <select
                    value={mediaTypeInput}
                    onChange={(e) => setMediaTypeInput(e.target.value as any)}
                    className="px-2 py-1.5 text-xs border border-neutral-300 rounded"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={mediaUrlInput}
                    onChange={(e) => setMediaUrlInput(e.target.value)}
                    className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs border border-neutral-300 rounded"
                  />
                  <button
                    type="button"
                    onClick={handleAddMediaUrl}
                    className="px-3 py-1.5 text-xs font-bold bg-neutral-800 text-white rounded hover:bg-black"
                  >
                    Add
                  </button>
                </div>
                <div className="text-[10px] text-neutral-400">
                  Videos must be maximum 30 seconds and under 20MB.
                </div>

                {/* Media Previews List */}
                {formData.media_urls.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 overflow-x-auto">
                    {formData.media_urls.map((m, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded border border-neutral-200 overflow-hidden bg-neutral-100 shrink-0">
                        {m.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-black/80 text-white">
                            <Play className="w-4 h-4 fill-white" />
                          </div>
                        ) : (
                          <img src={m.url} alt="" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(idx)}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Checkboxes */}
              <div className="flex items-center gap-6 pt-2 border-t border-neutral-200 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_verified_buyer}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_verified_buyer: e.target.checked }))}
                    className="rounded text-black focus:ring-black"
                  />
                  <span className="font-semibold text-neutral-700">Verified Buyer Badge</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_approved}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_approved: e.target.checked }))}
                    className="rounded text-black focus:ring-black"
                  />
                  <span className="font-semibold text-neutral-700">Published / Approved</span>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary py-2 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingReview ? 'Save Changes' : 'Publish Review'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Lightbox */}
      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
            >
              <X className="w-4 h-4" />
            </button>
            {previewMedia.type === 'video' ? (
              <video src={previewMedia.url} controls autoPlay className="max-w-full max-h-[80vh] rounded shadow-2xl" />
            ) : (
              <img src={previewMedia.url} alt="Review Media" className="max-w-full max-h-[80vh] object-contain rounded shadow-2xl" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
