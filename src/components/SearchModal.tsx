import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Search, X, ArrowRight, Loader2 } from 'lucide-react'
import { getCategories, getProducts } from '../lib/storeApi'
import type { Category, Product } from '../types/database'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      document.body.style.overflow = 'hidden'
      getCategories(true).then(setCategories).catch(() => {})
    } else {
      document.body.style.overflow = 'unset'
      setQuery('')
      setResults([])
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      const prods = await getProducts({ search: query.trim() })
      setResults(prods)
      setLoading(false)
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative min-h-screen flex items-start justify-center p-4 sm:p-6 lg:p-8 pt-16 sm:pt-24">
        <div className="relative w-full max-w-2xl bg-white shadow-2xl border border-neutral-200 animate-fade-in p-6 sm:p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-neutral-400 hover:text-black transition-colors focus:outline-none"
            aria-label="Close search"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Search Form */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
              Instant Catalog Search
            </div>

            <div className="relative flex items-center border-b-2 border-black pb-2">
              <Search className="w-6 h-6 text-black mr-3 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SEARCH STREETWEAR APPAREL..."
                className="w-full text-base sm:text-lg font-bold tracking-wider placeholder-neutral-400 uppercase outline-none"
              />
              {loading && <Loader2 className="w-5 h-5 animate-spin text-neutral-500 ml-2 shrink-0" />}
            </div>

            {/* Quick Search Tag Shortcuts (Dynamic Categories from Supabase) */}
            {categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Collections:
                </span>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setQuery(cat.name)}
                    className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-neutral-100 hover:bg-black hover:text-white transition-colors"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Results Display */}
          <div className="mt-8 divide-y divide-neutral-100 max-h-96 overflow-y-auto">
            {loading && results.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400 uppercase tracking-wider">
                Searching catalog...
              </div>
            ) : query.trim() && results.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="text-sm font-bold uppercase tracking-wider">No products found</div>
                <p className="text-xs text-neutral-500">
                  No catalog items match your search. Check back soon for new releases.
                </p>
              </div>
            ) : (
              results.map((product) => {
                const img = product.images?.[0]?.image_url || '/assets/wenzy_front_texture.png'
                return (
                  <Link
                    key={product.id}
                    to={`/product/${product.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-4 py-3 group hover:bg-neutral-50 px-2 transition-colors"
                  >
                    <div className="w-14 h-14 bg-neutral-100 shrink-0 overflow-hidden border border-neutral-200">
                      <img src={img} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold uppercase tracking-wider text-black group-hover:underline truncate">
                        {product.name}
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        ₹{product.price.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
