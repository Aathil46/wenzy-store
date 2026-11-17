import React, { useEffect, useState } from 'react'
import { Search, Eye, Filter, Loader2, X, CheckCircle, Package, Truck, AlertCircle } from 'lucide-react'
import { adminGetOrders, adminUpdateOrderStatus } from '../lib/storeApi'
import type { Order, OrderStatus, PaymentStatus } from '../types/database'

const STATUS_OPTIONS: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
  'Refunded',
]

const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ['Pending', 'Paid', 'Failed', 'Refunded']

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updating, setUpdating] = useState(false)

  const loadOrders = async () => {
    setLoading(true)
    try {
      const data = await adminGetOrders()
      setOrders(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus, newPaymentStatus?: PaymentStatus) => {
    setUpdating(true)
    try {
      await adminUpdateOrderStatus(orderId, newStatus, newPaymentStatus)
      await loadOrders()
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus, payment_status: newPaymentStatus || prev.payment_status } : null))
      }
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`)
    } finally {
      setUpdating(false)
    }
  }

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_email.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
            Order Fulfillment
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
            Track customer deliveries, update fulfillment statuses, and manage payments
          </p>
        </div>
      </div>

      {/* 2. Search & Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 border border-neutral-200">
        <div className="flex-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-neutral-400 ml-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SEARCH ORDERS BY NUMBER, CUSTOMER OR EMAIL..."
            className="w-full text-xs font-bold uppercase tracking-wider outline-none placeholder-neutral-400"
          />
        </div>

        <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-neutral-200 pt-2 sm:pt-0 sm:pl-3">
          <Filter className="w-3.5 h-3.5 text-neutral-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-bold uppercase tracking-wider bg-transparent outline-none cursor-pointer"
          >
            <option value="all">All Statuses ({orders.length})</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Orders Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-black" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white p-12 text-center border border-neutral-200 text-neutral-400 text-xs font-bold uppercase tracking-wider">
          No orders found matching filter criteria
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Fulfillment Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-black">{order.order_number}</td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-black">{order.customer_name}</div>
                    <div className="text-[11px] text-neutral-400">{order.customer_email}</div>
                  </td>

                  <td className="py-3 px-4 text-neutral-600">
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>

                  <td className="py-3 px-4 font-extrabold text-black">
                    ₹{order.total.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                        order.payment_status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {order.payment_status} ({order.payment_method})
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <select
                      value={order.status}
                      disabled={updating}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      className="text-[11px] font-bold uppercase tracking-wider border border-neutral-300 py-1 px-2 bg-white cursor-pointer rounded"
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-1.5 text-neutral-500 hover:text-black transition-colors"
                      title="View Order Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setSelectedOrder(null)} />

          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-white shadow-2xl border border-neutral-300 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
                <div>
                  <span className="font-mono text-sm font-bold text-neutral-500">
                    ORDER {selectedOrder.order_number}
                  </span>
                  <div className="text-lg font-heading font-black uppercase tracking-tight text-black">
                    Fulfillment Dossier
                  </div>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="text-neutral-400 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Update Quick Toggles */}
              <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 border border-neutral-200 text-xs">
                <div>
                  <label className="block text-neutral-500 font-bold uppercase text-[10px] mb-1">
                    Order Status
                  </label>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)}
                    className="input-field text-xs cursor-pointer font-bold uppercase"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-500 font-bold uppercase text-[10px] mb-1">
                    Payment Status
                  </label>
                  <select
                    value={selectedOrder.payment_status}
                    onChange={(e) => handleStatusChange(selectedOrder.id, selectedOrder.status, e.target.value as PaymentStatus)}
                    className="input-field text-xs cursor-pointer font-bold uppercase"
                  >
                    {PAYMENT_STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="font-bold uppercase tracking-wider text-xs">
                  Purchased Items ({selectedOrder.items?.length || 0})
                </div>
                <div className="divide-y divide-neutral-100 max-h-56 overflow-y-auto">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        {item.image_url && (
                          <img src={item.image_url} alt="" className="w-10 h-12 object-cover border" />
                        )}
                        <div>
                          <div className="font-bold uppercase">{item.product_name}</div>
                          <div className="text-[11px] text-neutral-500">
                            {item.variant_title} • Qty: {item.quantity}
                          </div>
                        </div>
                      </div>
                      <div className="font-bold">₹{(item.price * item.quantity).toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Details */}
              <div className="p-4 border border-neutral-200 text-xs space-y-1">
                <div className="font-bold uppercase tracking-wider text-[10px] text-neutral-500">
                  Delivery Destination
                </div>
                <div className="font-bold text-black">{selectedOrder.shipping_address?.full_name}</div>
                <div className="text-neutral-600">
                  {selectedOrder.shipping_address?.street_address} {selectedOrder.shipping_address?.apartment}
                </div>
                <div className="text-neutral-600">
                  {selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state} - {selectedOrder.shipping_address?.postal_code}
                </div>
                <div className="text-neutral-600">
                  Phone: {selectedOrder.shipping_address?.phone || selectedOrder.customer_phone}
                </div>
              </div>

              {/* Financials */}
              <div className="space-y-1.5 text-xs border-t border-neutral-200 pt-3">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-bold">₹{selectedOrder.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Shipping Fee</span>
                  <span className="font-bold">₹{selectedOrder.shipping_fee}</span>
                </div>
                <div className="flex justify-between text-base font-black text-black pt-2 border-t border-neutral-200">
                  <span>Total Amount</span>
                  <span>₹{selectedOrder.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
