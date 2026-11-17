import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, ArrowRight, Loader2, CreditCard, Banknote, AlertCircle } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { createOrder } from '../lib/storeApi'

export default function Checkout() {
  const { items, subtotal, freeShippingThreshold, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    fullName: '',
    email: user?.email || '',
    phone: '',
    streetAddress: '',
    apartment: '',
    city: '',
    state: '',
    postalCode: '',
    paymentMethod: 'Cash on Delivery',
  })

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (items.length === 0) {
    return (
      <div className="wrap py-24 text-center space-y-4">
        <h1 className="text-2xl font-black uppercase tracking-wider">No Items to Checkout</h1>
        <p className="text-xs text-neutral-500">Your shopping bag is empty.</p>
        <Link to="/shop" className="btn-primary inline-flex">
          Explore T-Shirts
        </Link>
      </div>
    )
  }

  const shippingFee = subtotal >= freeShippingThreshold ? 0 : 99
  const tax = Math.round(subtotal * 0.05)
  const total = subtotal + shippingFee

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!formData.fullName || !formData.email || !formData.phone || !formData.streetAddress || !formData.city || !formData.postalCode) {
      setErrorMsg('Please complete all required shipping fields.')
      return
    }

    setLoading(true)

    try {
      const orderPayload = {
        userId: user?.id || null,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        customerName: formData.fullName,
        shippingAddress: {
          full_name: formData.fullName,
          phone: formData.phone,
          street_address: formData.streetAddress,
          apartment: formData.apartment || undefined,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postalCode,
          country: 'India',
        },
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          productName: i.name,
          variantTitle: `Size: ${i.size} | Color: ${i.color}`,
          price: i.price,
          quantity: i.quantity,
          imageUrl: i.image,
        })),
        subtotal,
        shippingFee,
        tax,
        total,
        paymentMethod: formData.paymentMethod,
        paymentId: formData.paymentMethod === 'Online Gateway (Test/Sandbox)' ? `PAY_${Date.now()}` : undefined,
      }

      const res = await createOrder(orderPayload)

      if (res.error || !res.order) {
        setErrorMsg(res.error || 'Failed to place order. Please try again.')
        setLoading(false)
        return
      }

      clearCart()
      navigate(`/order-confirmation/${res.order.id}`)
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <div className="wrap py-10 sm:py-16">
      <div className="mb-8 pb-4 border-b border-neutral-200">
        <h1 className="text-3xl font-black uppercase tracking-tight">Checkout</h1>
        <div className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
          Complete your delivery details to place your order
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Form Details (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* 1. Customer Information */}
          <div className="space-y-4">
            <h2 className="font-heading font-black text-sm uppercase tracking-wider text-black pb-2 border-b border-neutral-200">
              1. Customer Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                Phone Number (for Courier & Tracking) *
              </label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className="input-field"
              />
            </div>
          </div>

          {/* 2. Shipping Address */}
          <div className="space-y-4">
            <h2 className="font-heading font-black text-sm uppercase tracking-wider text-black pb-2 border-b border-neutral-200">
              2. Shipping Address
            </h2>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                Street Address *
              </label>
              <input
                type="text"
                name="streetAddress"
                required
                value={formData.streetAddress}
                onChange={handleChange}
                placeholder="House / Flat / Building, Street Name"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                Apartment, Suite, Unit, Landmark (Optional)
              </label>
              <input
                type="text"
                name="apartment"
                value={formData.apartment}
                onChange={handleChange}
                placeholder="Near Metro Station, 2nd Floor"
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Mumbai"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  required
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Maharashtra"
                  className="input-field"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  PIN Code *
                </label>
                <input
                  type="text"
                  name="postalCode"
                  required
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="400001"
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* 3. Payment Method */}
          <div className="space-y-4">
            <h2 className="font-heading font-black text-sm uppercase tracking-wider text-black pb-2 border-b border-neutral-200">
              3. Payment Method
            </h2>

            <div className="space-y-3">
              <label
                className={`flex items-center gap-3 p-4 border cursor-pointer transition-all ${
                  formData.paymentMethod === 'Cash on Delivery'
                    ? 'border-black bg-neutral-50 ring-1 ring-black'
                    : 'border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Cash on Delivery"
                  checked={formData.paymentMethod === 'Cash on Delivery'}
                  onChange={handleChange}
                  className="w-4 h-4 text-black focus:ring-black"
                />
                <Banknote className="w-5 h-5 text-neutral-700" />
                <div className="flex-1">
                  <div className="text-xs font-bold uppercase tracking-wider">Cash on Delivery (COD)</div>
                  <div className="text-[11px] text-neutral-500">Pay cash upon delivery at your doorstep across India</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-4 border cursor-pointer transition-all ${
                  formData.paymentMethod === 'Online Gateway (Test/Sandbox)'
                    ? 'border-black bg-neutral-50 ring-1 ring-black'
                    : 'border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Online Gateway (Test/Sandbox)"
                  checked={formData.paymentMethod === 'Online Gateway (Test/Sandbox)'}
                  onChange={handleChange}
                  className="w-4 h-4 text-black focus:ring-black"
                />
                <CreditCard className="w-5 h-5 text-neutral-700" />
                <div className="flex-1">
                  <div className="text-xs font-bold uppercase tracking-wider">
                    Online Payment (UPI, Cards, NetBanking Sandbox)
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Live Payment Gateway Gateway Provider (Razorpay / Cashfree Verified Placeholder)
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Order Review (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-neutral-50 p-6 border border-neutral-200 space-y-6 sticky top-28">
            <h2 className="font-heading font-black text-sm uppercase tracking-wider border-b border-neutral-200 pb-3">
              Order Review ({items.length} items)
            </h2>

            {/* Product items preview */}
            <div className="divide-y divide-neutral-200 max-h-64 overflow-y-auto space-y-3">
              {items.map((i) => (
                <div key={i.variantId} className="pt-3 first:pt-0 flex items-center gap-3">
                  <img src={i.image} alt={i.name} className="w-12 h-14 object-cover bg-neutral-200 shrink-0 border" />
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="font-bold uppercase truncate">{i.name}</div>
                    <div className="text-[11px] text-neutral-500">
                      {i.size} • Qty: {i.quantity}
                    </div>
                  </div>
                  <div className="text-xs font-extrabold">₹{(i.price * i.quantity).toLocaleString('en-IN')}</div>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="space-y-2 text-xs pt-3 border-t border-neutral-200">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="font-bold text-black">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Shipping</span>
                <span className="font-bold text-black">{shippingFee === 0 ? 'FREE' : '₹99.00'}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>GST (Included)</span>
                <span className="font-bold text-black">₹{tax.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-base font-black text-black pt-2 border-t border-neutral-300">
                <span className="uppercase">Total Payable</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Order...</span>
                </>
              ) : (
                <>
                  <span>Place Order • ₹{total.toLocaleString('en-IN')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Real Database Verified Order</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
