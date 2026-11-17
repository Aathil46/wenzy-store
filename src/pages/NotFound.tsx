import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="wrap py-28 text-center space-y-6">
      <div className="font-accent text-6xl sm:text-8xl font-black text-neutral-200">
        404
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
          Page Not Found
        </h1>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto">
          The page or drop collection you are looking for does not exist or has been relocated.
        </p>
      </div>
      <Link to="/" className="btn-primary inline-flex items-center gap-2">
        <span>Back to Storefront</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
