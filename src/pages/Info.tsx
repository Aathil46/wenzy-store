import React from 'react'

export function About() {
  return (
    <div className="wrap py-16 max-w-3xl space-y-6">
      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-neutral-400">
        About WENZY®
      </div>
      <h1 className="text-4xl font-black uppercase tracking-tight">Bold Streetwear for the Limitless</h1>
      <p className="text-sm text-neutral-600 leading-relaxed">
        WENZY was forged with a singular obsession: to build authentic, heavyweight streetwear in India without
        compromising on fabric weight, craftsmanship, or graphic artistry.
      </p>
      <p className="text-sm text-neutral-600 leading-relaxed">
        Every t-shirt is cut from custom-milled 240+ GSM French Terry and heavy jersey combed cotton, tailored with a
        proportional drop-shoulder boxy drape, and cured at high temperatures to ensure zero post-wash shrinkage.
      </p>
      <div className="p-6 bg-neutral-50 border border-neutral-200 mt-8 space-y-2">
        <div className="font-heading font-black text-sm uppercase">Our Craftsmanship Promise</div>
        <p className="text-xs text-neutral-600 leading-relaxed">
          100% Cotton • Bio-Washed • Anti-Pilling • Reinforced Ribbed Collars • High-Density Screen Prints
        </p>
      </div>
    </div>
  )
}

export function Contact() {
  return (
    <div className="wrap py-16 max-w-2xl space-y-6">
      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-neutral-400">
        Customer Support
      </div>
      <h1 className="text-4xl font-black uppercase tracking-tight">Contact WENZY</h1>
      <p className="text-xs text-neutral-500 leading-relaxed">
        Have questions regarding an order, size recommendations, or drop dates? Our team is active Monday–Saturday, 10
        AM – 7 PM IST.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
        <div className="p-5 border border-neutral-200 bg-neutral-50 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Email Inquiries</div>
          <div className="text-xs font-bold text-black">support@wenzy.store</div>
          <div className="text-[11px] text-neutral-500">Replies within 24 hours</div>
        </div>
        <div className="p-5 border border-neutral-200 bg-neutral-50 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">WhatsApp & Phone</div>
          <div className="text-xs font-bold text-black">+91 98765 43210</div>
          <div className="text-[11px] text-neutral-500">Mon-Sat, 10 AM - 7 PM</div>
        </div>
      </div>
    </div>
  )
}

export function ShippingPolicy() {
  return (
    <div className="wrap py-16 max-w-3xl space-y-6">
      <h1 className="text-3xl font-black uppercase tracking-tight">Shipping & Delivery Policy</h1>
      <div className="text-xs text-neutral-600 leading-relaxed space-y-4">
        <p>• All orders are dispatched from our fulfillment facility within 24–48 hours of order confirmation.</p>
        <p>• We offer FREE standard delivery on all domestic orders across India above ₹999. Orders below ₹999 carry a nominal shipping charge of ₹99.</p>
        <p>• Estimated delivery timelines: Metro cities 2–4 business days; rest of India 4–6 business days.</p>
        <p>• Tracking IDs are dispatched via SMS and Email as soon as your package is scanned by our logistics partners (BlueDart, Delhivery, Xpressbees).</p>
      </div>
    </div>
  )
}

export function ReturnsPolicy() {
  return (
    <div className="wrap py-16 max-w-3xl space-y-6">
      <h1 className="text-3xl font-black uppercase tracking-tight">Refund & Exchange Policy</h1>
      <div className="text-xs text-neutral-600 leading-relaxed space-y-4">
        <p>• We accept size exchanges and returns within 7 calendar days from the date of recorded delivery.</p>
        <p>• To be eligible, the piece must be unworn, unwashed, and in its original packaging with all brand tags intact.</p>
        <p>• Reverse pickup will be arranged by our logistics team. Once inspected at our warehouse, your exchange piece or refund will be processed within 48 hours.</p>
      </div>
    </div>
  )
}

export function TermsPolicy() {
  return (
    <div className="wrap py-16 max-w-3xl space-y-6">
      <h1 className="text-3xl font-black uppercase tracking-tight">Terms of Service</h1>
      <div className="text-xs text-neutral-600 leading-relaxed space-y-4">
        <p>Welcome to WENZY. By browsing or purchasing from our platform, you agree to comply with our commercial terms and conditions.</p>
        <p>All prices listed on the storefront are in Indian Rupees (INR) and are inclusive of applicable goods and services taxes (GST).</p>
        <p>WENZY reserves the right to modify pricing, cancel suspected fraudulent orders, and limit order quantities on limited-edition drop releases.</p>
      </div>
    </div>
  )
}

export function PrivacyPolicy() {
  return (
    <div className="wrap py-16 max-w-3xl space-y-6">
      <h1 className="text-3xl font-black uppercase tracking-tight">Privacy Policy</h1>
      <div className="text-xs text-neutral-600 leading-relaxed space-y-4">
        <p>At WENZY, your personal data (name, email, phone number, and delivery address) is handled with utmost security and confidentiality.</p>
        <p>We do not store your raw credit/debit card credentials or banking passwords on our servers. All digital transactions are processed through encrypted, PCI-DSS certified payment gateways.</p>
      </div>
    </div>
  )
}
