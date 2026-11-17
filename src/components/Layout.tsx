import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import CartDrawer from './CartDrawer'
import SearchModal from './SearchModal'

export default function Layout() {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-white text-black font-sans">
      <Header onOpenSearch={() => setSearchOpen(true)} />
      
      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />

      {/* Global Slideout Cart Drawer */}
      <CartDrawer />

      {/* Global Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
