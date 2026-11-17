import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, ShoppingBag, User, Heart, Menu, X, ArrowRight, ShieldCheck, Mic } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { getCategories } from '../lib/storeApi'
import type { Category } from '../types/database'

interface HeaderProps {
  onOpenSearch: () => void
}

export default function Header({ onOpenSearch }: HeaderProps) {
  const { itemCount, openCart } = useCart()
  const { user, isAdmin } = useAuth()
  const location = useLocation()

  const [categories, setCategories] = useState<Category[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('')

  useEffect(() => {
    getCategories(true, true).then((cats) => {
      setCategories(cats)
      if (cats.length > 0 && !activeTab) {
        setActiveTab(cats[0].slug)
      }
    })
  }, [])

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-neutral-200">
      {/* Main Navigation Bar — Starts directly at top (No black announcement bar) */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Hamburger menu + Primary Category Tabs */}
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1 text-neutral-800 hover:text-black focus:outline-none"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Navigation Tabs from Supabase with Reference Active Indicator */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-bold uppercase tracking-wider">
              {categories.map((cat, idx) => {
                const isSelected = activeTab === cat.slug || (!activeTab && idx === 0)
                return (
                  <Link
                    key={cat.id}
                    to={`/category/${cat.slug}`}
                    onClick={() => setActiveTab(cat.slug)}
                    className={`py-2 transition-colors relative ${
                      isSelected
                        ? "text-black font-extrabold after:content-[''] after:absolute after:bottom-[-14px] after:left-0 after:right-0 after:h-0.5 after:bg-red-600"
                        : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    {cat.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Center: Brand Logo */}
          <div className="flex items-center justify-center">
            <Link to="/" className="flex items-center gap-1.5 group">
              <span className="font-heading font-black text-xl sm:text-2xl tracking-[0.18em] uppercase text-black group-hover:opacity-85 transition-opacity">
                WENZY<span className="text-[10px] align-super text-red-600 font-bold ml-0.5">®</span>
              </span>
            </Link>
          </div>

          {/* Right: Search Pill Input + Account + Wishlist + Cart */}
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-5">
            {/* Pill Search Input */}
            <div
              onClick={onOpenSearch}
              className="hidden sm:flex items-center justify-between bg-neutral-100 hover:bg-neutral-200/70 border border-neutral-200 rounded-full px-4 py-1.5 w-44 md:w-56 lg:w-64 cursor-pointer transition-all text-xs"
              title="Search WENZY"
            >
              <span className="text-neutral-500 font-medium truncate">
                What are you looking for?
              </span>
              <div className="flex items-center gap-2 text-neutral-400 pl-2">
                <Mic className="w-3.5 h-3.5 hover:text-black transition-colors" />
                <Search className="w-3.5 h-3.5 text-neutral-600" />
              </div>
            </div>

            {/* Mobile Search Icon Button */}
            <button
              onClick={onOpenSearch}
              className="sm:hidden p-1 text-neutral-800 hover:text-black focus:outline-none"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Admin Quick Switch (if authenticated as admin) */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden xl:inline-flex items-center gap-1 bg-neutral-900 text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Admin
              </Link>
            )}

            {/* User Account */}
            <Link
              to={user ? '/account' : '/login'}
              className="p-1 text-neutral-800 hover:text-black transition-colors"
              aria-label="User Account"
            >
              <User className="w-5 h-5" />
            </Link>

            {/* Wishlist / Heart */}
            <Link
              to="/shop"
              className="p-1 text-neutral-800 hover:text-black transition-colors hidden xs:block"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
            </Link>

            {/* Shopping Cart Bag */}
            <button
              onClick={openCart}
              className="relative p-1 text-neutral-800 hover:text-black transition-colors focus:outline-none"
              aria-label="Shopping Bag"
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center font-mono">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Menu */}
          <div className="relative w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col p-6 animate-slide-in-right">
            <div className="flex items-center justify-between pb-6 border-b border-neutral-200">
              <span className="font-heading font-black text-xl tracking-[0.2em] uppercase">
                WENZY<span className="text-xs align-super ml-0.5 text-red-600">®</span>
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-black hover:opacity-70 focus:outline-none"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 py-6 space-y-4 overflow-y-auto">
              <div className="flex flex-wrap gap-2 pb-4 border-b border-neutral-200 text-center text-xs font-bold uppercase tracking-wider">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/category/${cat.slug}`}
                    onClick={() => {
                      setActiveTab(cat.slug)
                      setMobileMenuOpen(false)
                    }}
                    className={`px-3 py-2 rounded transition-colors ${
                      activeTab === cat.slug
                        ? 'bg-black text-white'
                        : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
                    }`}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>

              <Link
                to="/shop"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between text-sm font-bold uppercase tracking-[0.16em] py-2 border-b border-neutral-100"
              >
                <span>All Products</span>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
              </Link>

              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/category/${cat.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between text-sm font-bold uppercase tracking-[0.16em] py-2 border-b border-neutral-100"
                >
                  <span>{cat.name}</span>
                  <ArrowRight className="w-4 h-4 text-neutral-400" />
                </Link>
              ))}

              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-bold uppercase tracking-[0.16em] py-2 text-neutral-600 hover:text-black"
              >
                Brand Story
              </Link>
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-bold uppercase tracking-[0.16em] py-2 text-neutral-600 hover:text-black"
              >
                Contact & Support
              </Link>
            </div>

            <div className="pt-6 border-t border-neutral-200 space-y-3">
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider rounded"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Admin Dashboard
                </Link>
              )}

              <Link
                to={user ? '/account' : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="btn-secondary w-full text-center"
              >
                {user ? 'My Account' : 'Sign In / Register'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
