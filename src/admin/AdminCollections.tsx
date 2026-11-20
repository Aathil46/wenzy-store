import React, { useEffect, useState } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  GripVertical,
  FolderOpen,
  Check,
} from 'lucide-react'
import {
  getCollections,
  adminSaveCollection,
  adminDeleteCollection,
  adminReorderCollections,
} from '../lib/storeApi'
import type { Collection } from '../types/database'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function AdminCollections() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [slugTouched, setSlugTouched] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reorderLoading, setReorderLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getCollections(false)
      setCollections(data)
    } catch (err) {
      console.error('Failed to load collections', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingCollection(null)
    setFormName('')
    setFormSlug('')
    setFormActive(true)
    setSlugTouched(false)
    setErrorMsg('')
    setModalOpen(true)
  }

  const openEdit = (c: Collection) => {
    setEditingCollection(c)
    setFormName(c.name)
    setFormSlug(c.slug)
    setFormActive(c.is_active)
    setSlugTouched(true)
    setErrorMsg('')
    setModalOpen(true)
  }

  const handleNameChange = (val: string) => {
    setFormName(val)
    if (!slugTouched) {
      setFormSlug(slugify(val))
    }
  }

  const handleSlugChange = (val: string) => {
    setFormSlug(slugify(val))
    setSlugTouched(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formSlug.trim()) {
      setErrorMsg('Name and slug are required.')
      return
    }

    setSaving(true)
    setErrorMsg('')
    try {
      await adminSaveCollection({
        id: editingCollection?.id,
        name: formName.trim(),
        slug: formSlug.trim(),
        is_active: formActive,
        display_order: editingCollection?.display_order ?? collections.length,
      })
      await load()
      setModalOpen(false)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save collection.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (c: Collection) => {
    if (!confirm(`Delete collection "${c.name}"? Products assigned to it will be unlinked.`)) return
    setDeletingId(c.id)
    try {
      await adminDeleteCollection(c.id)
      await load()
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const moveUp = async (index: number) => {
    if (index === 0) return
    const reordered = [...collections]
    ;[reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]]
    setCollections(reordered)
    setReorderLoading(true)
    try {
      await adminReorderCollections(reordered.map((c) => c.id))
      await load()
    } finally {
      setReorderLoading(false)
    }
  }

  const moveDown = async (index: number) => {
    if (index >= collections.length - 1) return
    const reordered = [...collections]
    ;[reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]]
    setCollections(reordered)
    setReorderLoading(true)
    try {
      await adminReorderCollections(reordered.map((c) => c.id))
      await load()
    } finally {
      setReorderLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Collections</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Manage filter tabs shown under WENZY RACK on the homepage. Assign products to a collection when editing them.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-xs">
          <Plus className="w-4 h-4" /> New Collection
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
        </div>
      ) : collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400 border border-dashed border-neutral-300 rounded-lg">
          <FolderOpen className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No collections yet</p>
          <p className="text-xs mt-1">Create your first collection to enable filter tabs on the homepage.</p>
          <button onClick={openCreate} className="btn-primary mt-4 text-xs">
            Create Collection
          </button>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-100 overflow-hidden">
          {collections.map((c, idx) => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors">
              {/* Reorder */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0 || reorderLoading}
                  className="text-neutral-300 hover:text-black disabled:opacity-20 p-0.5"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx >= collections.length - 1 || reorderLoading}
                  className="text-neutral-300 hover:text-black disabled:opacity-20 p-0.5"
                  title="Move down"
                >
                  ↓
                </button>
              </div>

              <GripVertical className="w-4 h-4 text-neutral-300" />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm uppercase tracking-wide">{c.name}</span>
                  {!c.is_active && (
                    <span className="text-[10px] font-bold bg-neutral-200 text-neutral-500 px-2 py-0.5 rounded uppercase tracking-wider">
                      Hidden
                    </span>
                  )}
                </div>
                <div className="text-xs text-neutral-400 font-mono mt-0.5">/{c.slug}</div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(c)}
                  className="p-2 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  disabled={deletingId === c.id}
                  className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  {deletingId === c.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200">
              <h2 className="font-black text-sm uppercase tracking-widest">
                {editingCollection ? 'Edit Collection' : 'New Collection'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">
                  Collection Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Trending, Marvel, Linen"
                  className="input-field w-full"
                  required
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">
                  Slug (URL key) *
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="e.g. trending"
                  className="input-field w-full font-mono text-sm"
                  required
                />
                <p className="text-[11px] text-neutral-400 mt-1">Auto-generated from name. Must be unique.</p>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormActive((v) => !v)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    formActive ? 'bg-black' : 'bg-neutral-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      formActive ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span className="text-xs font-bold uppercase tracking-wider">
                  {formActive ? 'Visible on storefront' : 'Hidden'}
                </span>
              </div>

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded p-3">
                  {errorMsg}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {saving ? 'Saving…' : editingCollection ? 'Update Collection' : 'Create Collection'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
