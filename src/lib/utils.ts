import { useEffect, useState } from 'react'

export const formatPrice = (n: number) => (n > 0 ? `₹${n.toLocaleString('en-IN')}` : 'Price TBA')
export const totalStock = (s?: Record<string, number>) =>
  s ? Object.values(s).reduce((a, b) => a + (Number(b) || 0), 0) : 0

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return initial
      const raw = localStorage.getItem(key)
      if (!raw || raw === 'undefined' || raw === 'null') return initial
      const parsed = JSON.parse(raw)
      if (parsed === null || parsed === undefined) return initial
      if (Array.isArray(initial) && !Array.isArray(parsed)) return initial
      return parsed as T
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, JSON.stringify(value))
      }
    } catch {
      /* storage unavailable */
    }
  }, [key, value])

  return [value, setValue] as const
}
