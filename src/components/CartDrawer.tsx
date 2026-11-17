import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Truck } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    itemCount,
    subtotal,
    freeShippingThreshold,
    freeShippingProgress,
    amountNeededForFreeShipping,
  } = useCart()

  const navigate = useNavigate()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-right">
          {/* 1. Header */}
          <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span className="font-heading font-black text-sm uppercase tracking-[0.16em]">
                Your Bag ({itemCount})
              </span>
            </div>
            <button
              onClick={closeCart}
              className="p-1 text-neutral-500 hover:text-black transition-colors focus:outline-none"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Free Shipping Threshold Bar */}
          <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-800">
              <Truck className="w-4 h-4 text-black shrink-0" />
              {amountNeededForFreeShipping > 0 ? (
                <span>
                  Add <strong className="text-black font-extrabold">₹{amountNeededForFreeShipping.toLocaleString('en-IN')}</strong> more for <span className="uppercase text-emerald-600">Free Shipping</span>
                </span>
              ) : (
                <span className="text-emerald-700 font-extrabold uppercase tracking-wider">
                  🎉 You unlocked FREE Shipping across India!
                </span>
              )}
            </div>
            <div className="mt-2 h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-black transition-all duration-300 rounded-full"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* 3. Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 divide-y divide-neutral-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-4">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <div className="font-heading font-bold text-base uppercase tracking-wider">Your Bag Is Empty</div>
                  <p className="text-xs text-neutral-500 max-w-xs">
                    Explore our latest heavyweight streetwear drops and find your edge.
                  </p>
                </div>
                <button
                  onClick={() => {
                    closeCart()
                    navigate('/shop')
                  }}
                  className="btn-primary"
                >
                  Shop T-Shirts
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.variantId} className="pt-4 first:pt-0 flex gap-4">
                  {/* Thumbnail */}
                  <Link
                    to={`/product/${item.slug}`}
                    onClick={closeCart}
                    className="w-20 h-24 bg-neutral-100 shrink-0 overflow-hidden border border-neutral-200"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover object-center"
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/product/${item.slug}`}
                          onClick={closeCart}
                          className="text-xs font-bold uppercase tracking-wider text-black hover:opacity-70 line-clamp-1"
                        >
                          {item.name}
                        </Link>
                        <button
                          onClick={() => removeItem(item.variantId)}
                          className="text-neutral-400 hover:text-red-600 transition-colors p-0.5"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mt-0.5">
                        Size: {item.size} • {item.color}
                      </div>

                      <div className="text-xs font-extrabold text-black mt-1">
                        ₹{item.price.toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Quantity Selector Component */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center border border-neutral-300">
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-neutral-100 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold font-mono">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          className="w-7 h-7 flex items-center justify-center hover:bg-neutral-100 disabled:opacity-30 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-xs font-extrabold text-neutral-900">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 4. Footer Summary & Checkout Action */}
          {items.length > 0 && (
            <div className="p-5 border-t border-neutral-200 bg-neutral-50 space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-black">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Shipping</span>
                  <span className="font-bold text-black">
                    {subtotal >= freeShippingThreshold ? 'FREE' : '₹99.00'}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-black pt-2 border-t border-neutral-200">
                  <span className="uppercase tracking-wider">Estimated Total</span>
                  <span>
                    ₹{(subtotal + (subtotal >= freeShippingThreshold ? 0 : 99)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    closeCart()
                    navigate('/checkout')
                  }}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-4"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-[10px] text-center text-neutral-400 tracking-wider uppercase">
                  Taxes calculated at checkout • 100% Secure Transaction
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
