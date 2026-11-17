import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingBag, User, Menu, X, ArrowRight, ShieldCheck } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { getCategories, getStoreSettings } from '../lib/storeApi'
import type { Category, StoreSettings } from '../types/database'

interface HeaderProps {
  onOpenSearch: () => void
}

export default function Header({ onOpenSearch }: HeaderProps) {
  const { itemCount, openCart } = useCart()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    getCategories(true).then(setCategories)
    getStoreSettings().then(setSettings)

    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className="sticky top-0 z-40 w-full bg-white transition-shadow duration-200">
      {/* 1. Announcement Bar */}
      <div className="bg-black text-white text-[11px] font-bold tracking-[0.18em] py-2 px-4 text-center overflow-hidden">
        <div className="animate-pulse">
          {settings?.announcement ||
            'BOLD STREETWEAR FOR THE LIMITLESS • FREE SHIPPING ACROSS INDIA ON ORDERS OVER ₹999 • CASH ON DELIVERY AVAILABLE'}
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div
        className={`w-full border-b border-neutral-200 transition-all duration-200 ${
          scrolled ? 'py-3 shadow-sm' : 'py-4'
        }`}
      >
        <div className="wrap flex items-center justify-between">
          {/* Left: Mobile Menu Trigger & Desktop Links */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1 text-black hover:opacity-70 focus:outline-none"
              aria-label="Open mobile menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Desktop Navigation Links (Dynamically populated from Supabase) */}
            <nav className="hidden lg:flex items-center gap-8 text-xs font-bold uppercase tracking-[0.16em]">
              <Link to="/shop" className="text-black hover:opacity-60 transition-opacity">
                All Products
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/category/${cat.slug}`}
                  className="text-black hover:opacity-60 transition-opacity"
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Center: Brand Wordmark / Logo */}
          <div className="flex items-center justify-center">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="font-heading font-black text-2xl tracking-[0.2em] uppercase text-black group-hover:opacity-80 transition-opacity">
                WENZY<span className="text-xs align-super ml-0.5">®</span>
              </span>
            </Link>
          </div>

          {/* Right: Actions (Search, Account, Admin Pill, Cart) */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Search Trigger */}
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2 text-black hover:opacity-60 transition-opacity focus:outline-none"
              aria-label="Search store"
            >
              <Search className="w-5 h-5" />
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-[0.14em]">Search</span>
            </button>

            {/* Admin Quick Switch (if authenticated as admin) */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden md:inline-flex items-center gap-1.5 bg-neutral-900 text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Admin
              </Link>
            )}

            {/* User Account */}
            <Link
              to={user ? '/account' : '/login'}
              className="text-black hover:opacity-60 transition-opacity"
              aria-label="User account"
            >
              <User className="w-5 h-5" />
            </Link>

            {/* Slideout Cart Drawer Trigger */}
            <button
              onClick={openCart}
              className="relative flex items-center gap-2 text-black hover:opacity-60 transition-opacity focus:outline-none"
              aria-label="Shopping bag"
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-black text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center font-mono">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Mobile Navigation Drawer */}
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
                WENZY<span className="text-xs align-super ml-0.5">®</span>
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-black hover:opacity-70 focus:outline-none"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 py-6 space-y-5 overflow-y-auto">
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
