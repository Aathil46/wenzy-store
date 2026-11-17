import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Truck } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function Cart() {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    freeShippingThreshold,
    freeShippingProgress,
    amountNeededForFreeShipping,
  } = useCart()

  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="wrap py-24 text-center space-y-6">
        <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-400">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tight">Your Bag is Empty</h1>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            You haven't added any streetwear pieces to your bag yet.
          </p>
        </div>
        <Link to="/shop" className="btn-primary inline-flex">
          Explore Collection
        </Link>
      </div>
    )
  }

  const shippingFee = subtotal >= freeShippingThreshold ? 0 : 99
  const total = subtotal + shippingFee

  return (
    <div className="wrap py-10 sm:py-16">
      <div className="mb-8 pb-4 border-b border-neutral-200 flex items-baseline justify-between">
        <h1 className="text-3xl font-black uppercase tracking-tight">Shopping Bag</h1>
        <button
          onClick={clearCart}
          className="text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-red-600 transition-colors"
        >
          Clear Bag
        </button>
      </div>

      {/* Free Shipping Alert */}
      <div className="bg-neutral-50 p-4 border border-neutral-200 mb-8 rounded-sm">
        <div className="flex items-center gap-2 text-xs font-bold">
          <Truck className="w-4 h-4 text-black shrink-0" />
          {amountNeededForFreeShipping > 0 ? (
            <span>
              Add <strong className="text-black">₹{amountNeededForFreeShipping.toLocaleString('en-IN')}</strong> more for <span className="uppercase text-emerald-600">Free Shipping across India</span>
            </span>
          ) : (
            <span className="text-emerald-700 font-extrabold uppercase">
              🎉 Congratulations! You qualify for Free Delivery across India.
            </span>
          )}
        </div>
        <div className="mt-2.5 h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
          <div className="h-full bg-black rounded-full transition-all" style={{ width: `${freeShippingProgress}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Line Items Table (8 cols) */}
        <div className="lg:col-span-8 divide-y divide-neutral-200">
          {items.map((item) => (
            <div key={item.variantId} className="py-6 first:pt-0 flex gap-4 sm:gap-6">
              <Link to={`/product/${item.slug}`} className="w-24 h-28 sm:w-28 sm:h-32 bg-neutral-100 shrink-0 border border-neutral-200 overflow-hidden">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </Link>

              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <Link to={`/product/${item.slug}`} className="font-heading font-black text-sm uppercase tracking-wider hover:opacity-70 transition-opacity">
                      {item.name}
                    </Link>
                    <button
                      onClick={() => removeItem(item.variantId)}
                      className="text-neutral-400 hover:text-red-600 p-1 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mt-1">
                    Size: {item.size} • Color: {item.color}
                  </div>
                  <div className="text-xs font-bold text-neutral-700 mt-1">
                    ₹{item.price.toLocaleString('en-IN')} each
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center border border-neutral-300">
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center text-xs font-bold font-mono">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      disabled={item.quantity >= item.maxStock}
                      className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 disabled:opacity-30 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-base font-black">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary (4 cols) */}
        <div className="lg:col-span-4">
          <div className="bg-neutral-50 p-6 border border-neutral-200 space-y-5">
            <h2 className="font-heading font-black text-base uppercase tracking-wider border-b border-neutral-200 pb-3">
              Order Summary
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="font-bold text-black">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Shipping</span>
                <span className="font-bold text-black">{shippingFee === 0 ? 'FREE' : '₹99.00'}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>GST (Estimated 5%)</span>
                <span className="font-bold text-black">Included</span>
              </div>
              <div className="flex justify-between text-base font-black text-black pt-3 border-t border-neutral-200">
                <span>Total</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-[10px] text-center text-neutral-400 uppercase tracking-widest">
              Secure SSL Encrypted Checkout
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
