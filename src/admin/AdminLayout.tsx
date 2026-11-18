import React, { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Users,
  Settings,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AdminLayout() {
  const { user, profile, isAdmin, loading, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white text-xs font-mono">
        Authenticating Admin Privileges...
      </div>
    )
  }

  // Admin access guard
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="max-w-md w-full bg-neutral-800 p-8 border border-neutral-700 shadow-2xl space-y-6 text-center">
          <div className="w-14 h-14 bg-red-950 border border-red-700 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-heading font-black uppercase tracking-wider">Access Restricted</h1>
            <p className="text-xs text-neutral-400">
              This area is restricted to verified administrators of WENZY. Your current account ({user?.email || 'Guest'}) does not hold administrator authorization.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-3">
            <Link to="/login" className="btn-primary bg-white text-black hover:bg-neutral-200">
              Sign In with Admin Account
            </Link>
            <Link to="/" className="text-xs text-neutral-400 hover:text-white uppercase tracking-wider font-bold">
              Return to Storefront
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const navItems = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Banners', path: '/admin/banners', icon: ImageIcon },
    { label: 'Products & WENZY RACK', path: '/admin/products', icon: Package },
    { label: 'Categories', path: '/admin/categories', icon: Layers },
    { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
    { label: 'Customers', path: '/admin/customers', icon: Users },
    { label: 'Store Settings', path: '/admin/settings', icon: Settings },
  ]

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex font-sans text-neutral-900">
      {/* 1. Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 2. Admin Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-black text-white flex flex-col border-r border-neutral-800 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Banner */}
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2">
            <span className="font-heading font-black text-xl tracking-[0.2em] uppercase text-white">
              WENZY<span className="text-[10px] text-emerald-400 ml-1">ADMIN</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                  active
                    ? 'bg-white text-black font-black'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-black' : 'text-neutral-400'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-neutral-800 space-y-2">
          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white rounded hover:bg-neutral-900 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              View Storefront
            </span>
          </Link>

          <button
            onClick={() => {
              signOut()
              navigate('/')
            }}
            className="flex items-center gap-2 w-full px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-red-400 hover:text-red-300 hover:bg-neutral-900 rounded transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 3. Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-black hover:opacity-70"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              Management Portal
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-neutral-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-bold">{user.email}</span>
            </div>
          </div>
        </header>

        {/* Viewport for Child Route */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
