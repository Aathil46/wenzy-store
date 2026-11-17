# WENZY — Modern Streetwear E-Commerce Platform

> **Bold Streetwear for the Limitless**  
> Built with React 18, TypeScript, Tailwind CSS, and Supabase.  
> Architecture designed from in-depth Reverse Engineer Anything (REA) analysis of [Normless Store](https://normless.store/).

---

## Overview

**WENZY** is a high-performance, production-ready direct-to-consumer (D2C) clothing brand storefront and management system. Inspired by modern streetwear aesthetic principles (Inter & Bricolage Grotesque typography, high-contrast monochrome design, 1:1 responsive product showcases, and friction-free micro-interactions), WENZY combines a lightning-fast customer storefront with an enterprise-grade administrator dashboard powered by Supabase.

### Launch Configuration
- **Initial Category:** Strictly **T-Shirts** (`/t-shirts`), fully populated with oversized graphic tees, 240+ GSM fabric specifications, and multi-size inventory.
- **Dynamic Category Engine:** Zero hardcoded category trees. The entire catalog, navigation menus, and category routing adapt dynamically to Supabase database tables. Adding new collections (e.g. Hoodies, Sweaters, Pants, Caps) in the Admin dashboard automatically exposes them across the storefront without modifying a single line of code.

---

## Architecture & Technology Stack

| Domain | Technology / Library |
| :--- | :--- |
| **Framework & Build** | React 18, Vite 5, TypeScript |
| **Styling & Design System** | Tailwind CSS 3, Lucide React icons, Inter & Bricolage Grotesque fonts |
| **State Management** | React Context (`AuthContext`, `CartContext`), LocalStorage persistence |
| **Routing** | React Router v6 |
| **Backend & Database** | Supabase (PostgreSQL 15, Row Level Security, RPC functions) |
| **Storage** | Supabase Storage (`product-images`, `category-images`, `store-assets`) |
| **Auth** | Supabase GoTrue Auth with role-based profiles (`customer` vs `admin`) |
| **Reverse Engineering Tooling**| Reverse Engineer Anything (REA) CDP browser automation & scenarios |

---

## Database Architecture & Security

The platform utilizes a normalized PostgreSQL database hosted on Supabase (Project: `dmmdcbpgyxgtrvhdildo`).

### Core Schema
1. **`profiles`**: Linked to `auth.users(id)` via Foreign Key with `ON DELETE CASCADE`. Stores `full_name`, `phone`, and `role` (`customer` \| `admin`).
2. **`categories`**: Dynamic collections with `name`, `slug`, `description`, `image_url`, `is_active`, and `display_order`. Protected against accidental deletion when products are linked.
3. **`products`**: Streetwear apparel records with `name`, `slug`, `price`, `compare_at_price`, `details` (JSONB: GSM, fabric, fit, care), `is_featured`, and `is_active`.
4. **`product_images`**: High-resolution gallery images with `display_order` and `is_primary`.
5. **`product_variants`**: Stock-keeping units tracking `size` (XS–2XL), `color`, `sku`, and `stock_quantity`.
6. **`orders`**: Customer order receipts with `order_number` (e.g. `WNZ-953752`), `shipping_address` (JSONB), `subtotal`, `shipping_fee`, `tax`, `total`, `status`, and `payment_status`.
7. **`order_items`**: Line items snapshotting product name, variant title, price, quantity, and image at time of purchase.
8. **`addresses`**: Customer saved shipping addresses with default address flag.
9. **`store_settings`**: Global store configuration including announcement bar text, tax rates, shipping fees, and free shipping threshold (₹999).

### Row Level Security (RLS) & Concurrency Safety
- **Public & Guest Access:** Anonymous users (`anon`) can view active products, active categories, product images, and product variants.
- **Order Placement:** Guests can place orders and create line items. Atomic inventory decrement is handled via the stored procedure `reduce_inventory(UUID, INT)` which employs row-level locking (`SELECT ... FOR UPDATE`) to prevent race conditions and overselling.
- **Customer Privacy:** Customers can only read and update their own profiles, saved addresses, and order histories (`auth.uid() = user_id`).
- **Admin Security:** Sensitive administrative mutations (catalog changes, category management, order fulfillment updates, store settings) are guarded both in the database via `is_admin()` and in the client via route protection in `AdminLayout`.

---

## Customer-Facing Storefront Features

- **Announcement Marquee:** Dynamic shipping notice and promotion bar (`Free shipping on orders over ₹999`).
- **Responsive Streetwear Header:** Brand logo, dynamic category links fetched from Supabase, instant Search modal trigger, User Profile link, and Cart drawer trigger with live item count badge.
- **Hero Drop Spotlight:** High-impact streetwear visual with Season 01 drop pill, typographic headline, and quick navigation.
- **Product Grid & Cards:** 1:1 aspect ratio cards, alternate image flip on mouse hover, discount percentage pills, and interactive Quick Add size drawer.
- **Product Detail Page (PDP):**
  - Left thumbnail vertical slider + high-res active gallery with zoom/flip.
  - Live variant selectors for Sizes (XS, S, M, L, XL, 2XL) and Colors.
  - Real-time stock status badge (In Stock vs Low Stock vs Sold Out).
  - Sticky purchase bar for mobile/desktop scrolling.
  - Expandable accordion drawers: Size Guide, Fabric & 240+ GSM Specifications, Free Delivery & Returns.
- **Slideout Cart Drawer & Full Bag Page:**
  - Dynamic free shipping calculation bar with live progress indicator.
  - Quantity steppers with maximum stock clamping.
  - Clean order subtotal and taxes disclaimer.
- **Checkout & Payment:**
  - Multi-step customer and shipping address collection (India Pincode, State, City).
  - Real payment status integration with Verified Gateway sandbox / Cash on Delivery options.
- **Order Receipt & Tracking:** Order confirmation page with real-time status tracker (Placed -> Processing -> Shipped -> Delivered) and customer receipt.
- **Customer Dashboard:** Authentication forms (Login / Sign Up) and Customer Account portal with past orders dossier.

---

## Admin Management Portal (`/admin`)

- **Telemetry & KPIs:** Real-time revenue from verified paid orders, total order count, catalog product count, registered customers, and low-inventory restock alerts.
- **Catalog Management:** Create and edit streetwear items, upload multi-angle photography to Supabase Storage, define GSM and fabric details, manage per-size inventory, set featured pieces.
- **Category Management:** Create new categories, configure slugs and banner visuals, toggle active status, and reorder display sequence.
- **Fulfillment Management:** Order dossier search and filter by status (`Pending`, `Confirmed`, `Processing`, `Shipped`, `Delivered`, `Cancelled`, `Refunded`), customer shipping address inspector, payment status updates.
- **Customer Directory:** View registered customers and customer telemetry.
- **Store Settings:** Configure announcement text, currency symbol (`₹`), base shipping fee, free shipping qualification threshold, and support contacts.

---

## Local Development & Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your Supabase project keys are configured:
```ini
VITE_SUPABASE_URL=https://dmmdcbpgyxgtrvhdildo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
```
Verify the production build locally:
```bash
npm run preview
```

---

## Git Repository
- Remote: `https://github.com/Aathil46/wenzy-store.git`
- Branch: `main`

---

## License
Private & Proprietary — WENZY Streetwear 2026.
