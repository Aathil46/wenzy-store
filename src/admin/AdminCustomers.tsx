import React, { useEffect, useState } from 'react'
import { Search, Users, Loader2, ShieldCheck, Mail, Calendar } from 'lucide-react'
import { adminGetCustomers } from '../lib/storeApi'
import type { Profile } from '../types/database'

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    adminGetCustomers()
      .then(setCustomers)
      .finally(() => setLoading(false))
  }, [])

  const filtered = customers.filter(
    (c) =>
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.full_name && c.full_name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
            Customer Directory
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
            Registered customer accounts, profiles, and authenticated roles
          </p>
        </div>
      </div>

      {/* 2. Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 border border-neutral-200">
        <Search className="w-4 h-4 text-neutral-400 ml-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="SEARCH CUSTOMERS BY NAME OR EMAIL..."
          className="w-full text-xs font-bold uppercase tracking-wider outline-none placeholder-neutral-400"
        />
      </div>

      {/* 3. Customer List Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-black" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 text-center border border-neutral-200 text-neutral-400 text-xs uppercase tracking-wider font-bold">
          No customer accounts found
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Account ID</th>
                <th className="py-3 px-4 text-right">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((cust) => (
                <tr key={cust.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-black uppercase">
                    {cust.full_name || 'Guest / Unnamed'}
                  </td>

                  <td className="py-3 px-4 text-neutral-600 font-mono text-xs">
                    {cust.email}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                        cust.role === 'admin'
                          ? 'bg-black text-white'
                          : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {cust.role}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-[10px] font-mono text-neutral-400">
                    {cust.id}
                  </td>

                  <td className="py-3 px-4 text-right text-neutral-500">
                    {new Date(cust.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
