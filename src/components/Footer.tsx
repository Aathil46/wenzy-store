import React from 'react'
import { Link } from 'react-router-dom'
import { Instagram, Twitter, Facebook, ArrowUpRight, ShieldCheck, Truck, RotateCcw, Award } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="w-full border-t border-neutral-200 bg-black text-white">
      {/* 1. Value Proposition Highlights (Matching REA Reference) */}
      <div className="border-b border-neutral-800 py-10">
        <div className="wrap grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <div className="flex items-center gap-4">
            <Award className="w-8 h-8 text-neutral-400 shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em]">240+ GSM Cotton</div>
              <div className="text-[12px] text-neutral-400 mt-0.5">Heavyweight French Terry & Single Jersey</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Truck className="w-8 h-8 text-neutral-400 shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em]">Pan-India Shipping</div>
              <div className="text-[12px] text-neutral-400 mt-0.5">Free delivery on all orders above ₹999</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <RotateCcw className="w-8 h-8 text-neutral-400 shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em]">7-Day Easy Returns</div>
              <div className="text-[12px] text-neutral-400 mt-0.5">Hassle-free size exchanges</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ShieldCheck className="w-8 h-8 text-neutral-400 shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em]">Verified Checkout</div>
              <div className="text-[12px] text-neutral-400 mt-0.5">UPI, Cards, NetBanking & COD</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Footer Navigation */}
      <div className="wrap py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        {/* Brand Mission Statement */}
        <div className="lg:col-span-2 space-y-4">
          <span className="font-heading font-black text-2xl tracking-[0.2em] uppercase">
            WENZY<span className="text-xs align-super ml-0.5">®</span>
          </span>
          <p className="text-xs text-neutral-400 leading-relaxed max-w-sm">
            Step into WENZY. Unapologetic, bold, and boundary-breaking streetwear engineered in India for those who refuse
            to blend in. Built with heavyweight fabrics and boxy drop-shoulder fits.
          </p>
          <div className="flex items-center gap-4 pt-2">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 border border-neutral-700 rounded-full flex items-center justify-center hover:bg-white hover:text-black hover:border-white transition-all"
              aria-label="Instagram"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 border border-neutral-700 rounded-full flex items-center justify-center hover:bg-white hover:text-black hover:border-white transition-all"
              aria-label="Twitter"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 border border-neutral-700 rounded-full flex items-center justify-center hover:bg-white hover:text-black hover:border-white transition-all"
              aria-label="Facebook"
            >
              <Facebook className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Collections */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-white">Collections</div>
          <ul className="space-y-2 text-xs text-neutral-400">
            <li>
              <Link to="/shop" className="hover:text-white transition-colors">
                All Streetwear
              </Link>
            </li>
            <li>
              <Link to="/shop?sort=newest" className="hover:text-white transition-colors">
                New Arrivals
              </Link>
            </li>
            <li>
              <Link to="/shop?sort=featured" className="hover:text-white transition-colors">
                Featured Pieces
              </Link>
            </li>
          </ul>
        </div>

        {/* Customer Care */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-white">Help & Support</div>
          <ul className="space-y-2 text-xs text-neutral-400">
            <li>
              <Link to="/account" className="hover:text-white transition-colors">
                Track Your Order
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-white transition-colors">
                Contact Customer Care
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-white transition-colors">
                About WENZY
              </Link>
            </li>
            <li>
              <Link to="/policies/shipping" className="hover:text-white transition-colors">
                Shipping Policy
              </Link>
            </li>
            <li>
              <Link to="/policies/returns" className="hover:text-white transition-colors">
                Refund & Exchange Policy
              </Link>
            </li>
          </ul>
        </div>

        {/* Newsletter Signup */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-white">The VIP Drop List</div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Subscribe for secret drops, limited restocks, and private discount codes.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              alert('Thank you for joining the WENZY VIP Drop List!')
            }}
            className="flex items-center border border-neutral-700 bg-neutral-900 focus-within:border-white transition-colors"
          >
            <input
              type="email"
              placeholder="ENTER YOUR EMAIL"
              required
              className="w-full bg-transparent px-3 py-2.5 text-xs text-white placeholder-neutral-500 outline-none"
            />
            <button
              type="submit"
              className="px-3 text-neutral-400 hover:text-white transition-colors focus:outline-none"
              aria-label="Subscribe"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* 3. Bottom Legal & Payment Badges */}
      <div className="border-t border-neutral-900 py-6">
        <div className="wrap flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
          <div>© {new Date().getFullYear()} WENZY® India. All rights reserved. Designed for the Limitless.</div>
          <div className="flex items-center gap-6">
            <Link to="/policies/terms" className="hover:text-neutral-300 transition-colors">
              Terms of Service
            </Link>
            <Link to="/policies/privacy" className="hover:text-neutral-300 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/admin" className="hover:text-neutral-300 transition-colors">
              Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
