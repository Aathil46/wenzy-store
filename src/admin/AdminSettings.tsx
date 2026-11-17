import React, { useEffect, useState } from 'react'
import { Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { getStoreSettings, adminSaveSettings } from '../lib/storeApi'
import type { StoreSettings } from '../types/database'

export default function AdminSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    getStoreSettings()
      .then(setSettings)
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setSettings((prev) => {
      if (!prev) return null
      return {
        ...prev,
        [name]: type === 'number' ? Number(value) : value,
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings) return

    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')

    try {
      await adminSaveSettings(settings)
      setSuccessMsg('Store settings saved successfully.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save store settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-black" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
            Store Settings
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
            Global store configuration, currencies, tax calculation, and logistics
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* General Store Details */}
        <div className="bg-white p-6 border border-neutral-200 shadow-xs space-y-4">
          <h2 className="font-heading font-black text-sm uppercase tracking-wider text-black pb-2 border-b border-neutral-100">
            Brand Identity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                Store Name
              </label>
              <input
                type="text"
                name="store_name"
                value={settings.store_name}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                Brand Tagline
              </label>
              <input
                type="text"
                name="tagline"
                value={settings.tagline}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Currency & Logistics */}
        <div className="bg-white p-6 border border-neutral-200 shadow-xs space-y-4">
          <h2 className="font-heading font-black text-sm uppercase tracking-wider text-black pb-2 border-b border-neutral-100">
            Logistics & Currency
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                Currency Code
              </label>
              <input
                type="text"
                name="currency"
                value={settings.currency}
                onChange={handleChange}
                className="input-field uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                Standard Shipping Fee (₹)
              </label>
              <input
                type="number"
                name="shipping_fee"
                value={settings.shipping_fee}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                Free Shipping Threshold (₹)
              </label>
              <input
                type="number"
                name="free_shipping_threshold"
                value={settings.free_shipping_threshold}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white p-6 border border-neutral-200 shadow-xs space-y-4">
          <h2 className="font-heading font-black text-sm uppercase tracking-wider text-black pb-2 border-b border-neutral-100">
            Support & Inquiries
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                Support Email
              </label>
              <input
                type="email"
                name="contact_email"
                value={settings.contact_email}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-neutral-600 uppercase font-bold text-[10px] mb-1">
                Support Phone / WhatsApp
              </label>
              <input
                type="text"
                name="contact_phone"
                value={settings.contact_phone}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 py-4 px-8">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  )
}
