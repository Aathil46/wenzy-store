import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  Loader2,
} from 'lucide-react'
import { adminGetDashboardMetrics } from '../lib/storeApi'

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMetrics = () => {
    setLoading(true)
    setError(null)
    adminGetDashboardMetrics()
      .then(setMetrics)
      .catch((err: any) => {
        console.error('Failed to load metrics:', err)
        setError(err.message || 'Unable to connect to Supabase database.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadMetrics()
  }, [])

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
        <div className="text-xs uppercase font-bold tracking-widest text-neutral-400">
          Compiling Real-Time Database Metrics...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 text-center space-y-3 max-w-lg mx-auto my-12">
        <div className="text-sm font-bold uppercase tracking-wider text-red-900">
          Database Connection Error
        </div>
        <p className="text-xs text-red-700 leading-relaxed">{error}</p>
        <button onClick={loadMetrics} className="btn-secondary text-xs">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
          Dashboard Overview
        </h1>
        <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
          Live Storefront Metrics & Inventory Health
        </p>
      </div>

      {/* 2. Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="bg-white p-6 border border-neutral-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-black">
            ₹{metrics?.totalRevenue?.toLocaleString('en-IN') || 0}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Verified Paid Orders</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-6 border border-neutral-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-black">
            {metrics?.totalOrders || 0}
          </div>
          <div className="text-[11px] text-neutral-500">
            Across online & cash on delivery
          </div>
        </div>

        {/* Total Products */}
        <div className="bg-white p-6 border border-neutral-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Catalog Products</span>
            <Package className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-black">
            {metrics?.totalProducts || 0}
          </div>
          <div className="text-[11px] text-neutral-500">
            {metrics?.totalCategories || 0} active categories configured
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white p-6 border border-neutral-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Registered Customers</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-black">
            {metrics?.totalCustomers || 0}
          </div>
          <div className="text-[11px] text-neutral-500">
            Synced user profiles in Supabase
          </div>
        </div>
      </div>

      {/* 3. Low Stock Alerts & Recent Orders Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Orders (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <h2 className="font-heading font-black text-sm uppercase tracking-wider">
              Recent Store Orders
            </h2>
            <Link
              to="/admin/orders"
              className="text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-black flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {metrics?.recentOrders?.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400 uppercase tracking-wider">
              No orders logged in database yet
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {metrics?.recentOrders?.map((order: any) => (
                <div key={order.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="font-bold text-black uppercase font-mono">{order.order_number}</div>
                    <div className="text-[11px] text-neutral-500">{order.customer_name} ({order.customer_email})</div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-black">₹{Number(order.total).toLocaleString('en-IN')}</div>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-neutral-100 rounded">
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Warning List (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="font-heading font-black text-sm uppercase tracking-wider">
                Low Inventory Alerts
              </h2>
            </div>
            <Link
              to="/admin/products"
              className="text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-black"
            >
              Manage Stock
            </Link>
          </div>

          {metrics?.lowStockVariants?.length === 0 ? (
            <div className="py-12 text-center text-xs text-emerald-600 font-bold uppercase tracking-wider">
              ✓ All product variants are healthy in stock
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {metrics?.lowStockVariants?.map((v: any) => (
                <div key={v.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-black uppercase">{v.product?.name}</div>
                    <div className="text-[11px] text-neutral-500">
                      Size: {v.size} • SKU: {v.sku}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                        v.stock_quantity === 0
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {v.stock_quantity === 0 ? 'Out of Stock' : `${v.stock_quantity} Left`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
