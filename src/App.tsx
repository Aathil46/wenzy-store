import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'

// Storefront Components
import Layout from './components/Layout'
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductPage from './pages/ProductPage'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Confirmation from './pages/Confirmation'
import Account from './pages/Account'
import Auth from './pages/Auth'
import { About, Contact, ShippingPolicy, ReturnsPolicy, TermsPolicy, PrivacyPolicy } from './pages/Info'
import NotFound from './pages/NotFound'

// Admin Components
import AdminLayout from './admin/AdminLayout'
import AdminDashboard from './admin/AdminDashboard'
import AdminProducts from './admin/AdminProducts'
import AdminCategories from './admin/AdminCategories'
import AdminOrders from './admin/AdminOrders'
import AdminCustomers from './admin/AdminCustomers'
import AdminSettings from './admin/AdminSettings'
import AdminBanners from './admin/AdminBanners'

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          {/* Customer Storefront Routes */}
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="shop" element={<Shop />} />
            <Route path="category/:slug" element={<Shop />} />
            <Route path="product/:slug" element={<ProductPage />} />
            <Route path="bag" element={<Cart />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order-confirmation/:orderId" element={<Confirmation />} />
            <Route path="account" element={<Account />} />
            <Route path="login" element={<Auth mode="login" />} />
            <Route path="signup" element={<Auth mode="signup" />} />
            
            {/* Informational & Policy Pages */}
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="policies/shipping" element={<ShippingPolicy />} />
            <Route path="policies/returns" element={<ReturnsPolicy />} />
            <Route path="policies/terms" element={<TermsPolicy />} />
            <Route path="policies/privacy" element={<PrivacyPolicy />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Dedicated Admin Portal Routes */}
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </CartProvider>
    </AuthProvider>
  )
}
