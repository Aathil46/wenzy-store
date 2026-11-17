import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogOut, Package, User, ShieldCheck, ArrowRight, Clock, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getCustomerOrders } from '../lib/storeApi'
import type { Order } from '../types/database'

export default function Account() {
  const { user, profile, isAdmin, signOut, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
      return
    }

    if (user) {
      getCustomerOrders(user.id)
        .then(setOrders)
        .finally(() => setLoadingOrders(false))
    }
  }, [user, authLoading, navigate])

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    )
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="wrap py-10 sm:py-16 max-w-5xl">
      {/* Account Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-neutral-200">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">
            Customer Dashboard
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-black mt-1">
            {profile?.full_name || user?.email?.split('@')[0] || 'My Account'}
          </h1>
          <div className="text-xs text-neutral-500 mt-1">{user?.email}</div>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 bg-neutral-900 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Open Admin Portal
            </Link>
          )}

          <button
            onClick={handleSignOut}
            className="btn-secondary text-xs flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Account Content */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Orders History (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-black text-lg uppercase tracking-wider">
              Order History ({orders.length})
            </h2>
          </div>

          {loadingOrders ? (
            <div className="py-16 text-center text-xs text-neutral-400 uppercase tracking-widest">
              Loading your orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-neutral-50 border border-neutral-200 p-8 text-center space-y-4">
              <Package className="w-10 h-10 text-neutral-400 mx-auto" />
              <div className="space-y-1">
                <div className="text-sm font-bold uppercase tracking-wider">No Orders Placed Yet</div>
                <p className="text-xs text-neutral-500">
                  When you purchase pieces from WENZY, your live fulfillment tracking will appear here.
                </p>
              </div>
              <Link to="/shop" className="btn-primary inline-flex">
                Shop Streetwear
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border border-neutral-200 p-6 space-y-4 hover:border-black transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                    <div>
                      <span className="font-mono text-xs font-black tracking-wider text-black">
                        {order.order_number}
                      </span>
                      <div className="text-[11px] text-neutral-400">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm ${
                          order.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.status === 'Cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        {order.status}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm ${
                          order.payment_status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {order.payment_status}
                      </span>
                    </div>
                  </div>

                  {/* Items preview */}
                  <div className="space-y-2">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          {item.image_url && (
                            <img src={item.image_url} alt="" className="w-10 h-12 object-cover border" />
                          )}
                          <div>
                            <div className="font-bold uppercase tracking-wider">{item.product_name}</div>
                            <div className="text-[11px] text-neutral-500">
                              {item.variant_title} • Qty: {item.quantity}
                            </div>
                          </div>
                        </div>
                        <div className="font-bold">₹{(item.price * item.quantity).toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs">
                    <span className="text-neutral-500">Total Order Amount</span>
                    <span className="font-black text-sm">₹{order.total.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <Link
                      to={`/order-confirmation/${order.id}`}
                      className="text-xs font-bold uppercase tracking-wider text-black hover:opacity-60 flex items-center gap-1"
                    >
                      <span>View Full Receipt</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Profile & Addresses (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-neutral-50 border border-neutral-200 p-6 space-y-4">
            <h2 className="font-heading font-black text-sm uppercase tracking-wider text-black pb-2 border-b border-neutral-200">
              Account Profile
            </h2>
            <div className="text-xs space-y-2">
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider">
                  Email
                </span>
                <span className="font-bold text-black">{user?.email}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider">
                  Full Name
                </span>
                <span className="font-bold text-black">{profile?.full_name || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider">
                  Account Type
                </span>
                <span className="inline-block px-2 py-0.5 bg-black text-white text-[10px] font-bold uppercase tracking-wider mt-0.5">
                  {profile?.role || 'Customer'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
