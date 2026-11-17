import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { SlidersHorizontal, ArrowUpDown, Loader2, AlertCircle, RefreshCw, Sparkles } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { getCategories, getProducts } from '../lib/storeApi'
import type { Category, Product } from '../types/database'

export default function Shop() {
  const { slug } = useParams<{ slug?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const activeCategorySlug = slug || searchParams.get('category') || 'all'
  const currentSort = (searchParams.get('sort') as any) || 'featured'

  useEffect(() => {
    getCategories(true)
      .then(setCategories)
      .catch((err) => console.error('Failed to fetch categories:', err))
  }, [])

  const fetchCatalog = () => {
    setLoading(true)
    setError(null)
    getProducts({
      categorySlug: activeCategorySlug === 'all' ? undefined : activeCategorySlug,
      sortBy: currentSort,
    })
      .then((data) => {
        setProducts(data)
      })
      .catch((err) => {
        console.error('getProducts error:', err)
        setError(err.message || 'Unable to retrieve products from database.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchCatalog()
  }, [activeCategorySlug, currentSort])

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('sort', e.target.value)
    setSearchParams(newParams)
  }

  // Find active category title
  const activeCategory = categories.find((c) => c.slug === activeCategorySlug)
  const pageTitle = activeCategory ? activeCategory.name : 'All Products'
  const pageDescription = activeCategory
    ? activeCategory.description
    : 'Heavyweight graphic and oversized streetwear apparel engineered in India.'

  return (
    <div className="wrap py-10 sm:py-16">
      {/* 1. Header Banner */}
      <div className="mb-10 space-y-3 pb-8 border-b border-neutral-200">
        <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-400">
          WENZY Catalog
        </div>
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-black">
          {pageTitle}
        </h1>
        {pageDescription && (
          <p className="text-xs sm:text-sm text-neutral-600 max-w-2xl leading-relaxed">
            {pageDescription}
          </p>
        )}
      </div>

      {/* 2. Controls & Dynamic Category Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        {/* Dynamic Category Pill Tabs (Fetched from Supabase) */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/shop"
            className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-all border ${
              activeCategorySlug === 'all'
                ? 'bg-black text-white border-black'
                : 'bg-white text-neutral-600 border-neutral-300 hover:border-black hover:text-black'
            }`}
          >
            All Products
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-all border ${
                activeCategorySlug === cat.slug
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-neutral-600 border-neutral-300 hover:border-black hover:text-black'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Sort Options & Count */}
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
            {products.length} {products.length === 1 ? 'Product' : 'Products'}
          </span>

          <div className="flex items-center gap-2 border border-neutral-300 px-3 py-1.5 bg-white">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
            <select
              value={currentSort}
              onChange={handleSortChange}
              className="bg-transparent text-xs font-bold uppercase tracking-wider text-black outline-none cursor-pointer"
            >
              <option value="featured">Featured Drop</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Product Grid / Error / Empty States */}
      {error ? (
        <div className="py-20 text-center max-w-md mx-auto space-y-4 bg-red-50/50 p-8 border border-red-200">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <div className="text-sm font-bold uppercase tracking-wider text-red-900">
            Database Connection Error
          </div>
          <p className="text-xs text-red-700 leading-relaxed">{error}</p>
          <button onClick={fetchCatalog} className="btn-secondary inline-flex items-center gap-2 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : loading ? (
        <div className="h-96 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
          <div className="text-xs uppercase font-bold tracking-widest text-neutral-400">Loading catalog...</div>
        </div>
      ) : products.length === 0 ? (
        <div className="py-24 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-black">Products Coming Soon</h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            There are currently no products available in this selection. New streetwear releases are dropping soon.
          </p>
          {activeCategorySlug !== 'all' && (
            <Link to="/shop" className="btn-primary inline-flex text-xs">
              View All Collections
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
