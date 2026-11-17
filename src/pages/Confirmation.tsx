import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, Package, Truck, ArrowRight, Loader2, Clock, ShieldAlert } from 'lucide-react'
import { getOrderById } from '../lib/storeApi'
import type { Order } from '../types/database'

export default function Confirmation() {
  const { orderId } = useParams<{ orderId: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || undefined
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId) {
      getOrderById(orderId, token).then((o) => {
        setOrder(o)
        setLoading(false)
      })
    }
  }, [orderId, token])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
        <div className="text-xs uppercase font-bold tracking-widest text-neutral-400">Loading Order Confirmation...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="wrap py-24 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-800">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Access Restricted</h1>
        <p className="text-xs text-neutral-500 leading-relaxed">
          Order receipts are protected for customer privacy. If you placed this order as a guest, please use the secure link with access token provided upon checkout. Registered customers can access all previous orders in their account dashboard.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link to="/shop" className="btn-secondary">
            Back to Store
          </Link>
          <Link to="/account" className="btn-primary">
            Customer Account
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap py-12 sm:py-20 max-w-3xl">
      {/* Success Badge */}
      <div className="text-center space-y-4 pb-10 border-b border-neutral-200">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div>
          <span className="font-accent text-xs font-bold uppercase tracking-widest text-emerald-700">
            Order Confirmed & Logged
          </span>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black mt-1">
            Thank You For Your Order
          </h1>
          <p className="text-xs text-neutral-500 mt-2">
            A confirmation receipt has been sent to <strong>{order.customer_email}</strong>.
          </p>
        </div>

        <div className="inline-block bg-neutral-100 px-4 py-2 border border-neutral-200 text-xs font-mono font-bold tracking-widest">
          ORDER NUMBER: {order.order_number}
        </div>
      </div>

      {/* Order Status Tracker */}
      <div className="py-8 border-b border-neutral-200">
        <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-6">
          Order Progress
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold uppercase tracking-wider">
          <div className="flex flex-col items-center gap-1.5 text-black">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">✓</div>
            <span>Placed</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-neutral-400">
            <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">2</div>
            <span>Processing</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-neutral-400">
            <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">3</div>
            <span>Shipped</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-neutral-400">
            <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">4</div>
            <span>Delivered</span>
          </div>
        </div>
      </div>

      {/* Order Items & Summary */}
      <div className="py-8 border-b border-neutral-200 space-y-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-black">
          Purchased Items ({order.items?.length || 0})
        </h2>

        <div className="divide-y divide-neutral-100">
          {order.items?.map((item) => (
            <div key={item.id} className="py-4 first:pt-0 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {item.image_url && (
                  <img src={item.image_url} alt={item.product_name} className="w-14 h-16 object-cover bg-neutral-100 border shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">{item.product_name}</div>
                  <div className="text-[11px] text-neutral-500">{item.variant_title}</div>
                  <div className="text-xs text-neutral-700 font-semibold mt-0.5">Qty: {item.quantity}</div>
                </div>
              </div>
              <div className="text-xs font-extrabold">₹{(item.price * item.quantity).toLocaleString('en-IN')}</div>
            </div>
          ))}
        </div>

        {/* Pricing Summary */}
        <div className="bg-neutral-50 p-4 border border-neutral-200 text-xs space-y-2">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span>
            <span className="font-bold text-black">₹{order.subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Shipping</span>
            <span className="font-bold text-black">{order.shipping_fee === 0 ? 'FREE' : `₹${order.shipping_fee}`}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Payment Method</span>
            <span className="font-bold text-black">{order.payment_method} ({order.payment_status})</span>
          </div>
          <div className="flex justify-between text-sm font-black text-black pt-2 border-t border-neutral-200">
            <span>Total Paid</span>
            <span>₹{order.total.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Shipping Address Display */}
      <div className="py-8 border-b border-neutral-200 space-y-2 text-xs">
        <h2 className="font-bold uppercase tracking-wider text-black">Shipping Destination</h2>
        <div className="text-neutral-600 leading-relaxed">
          <div>{order.shipping_address.full_name}</div>
          <div>{order.shipping_address.street_address} {order.shipping_address.apartment}</div>
          <div>{order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.postal_code}</div>
          <div>{order.shipping_address.country} • Phone: {order.shipping_address.phone}</div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link to="/account" className="btn-secondary w-full sm:w-auto">
          View in My Account
        </Link>
        <Link to="/shop" className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2">
          <span>Continue Shopping</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
