import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ArrowRight, Loader2, AlertCircle, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface AuthProps {
  mode?: 'login' | 'signup'
}

export default function Auth({ mode = 'login' }: AuthProps) {
  const [isLogin, setIsLogin] = useState(mode === 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const { signIn, signUp, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || '/account'

  if (user) {
    navigate(from, { replace: true })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await signIn(email, password)
        if (error) {
          setErrorMsg(error.message || 'Invalid email or password.')
          setLoading(false)
          return
        }
      } else {
        if (!fullName.trim()) {
          setErrorMsg('Please enter your full name.')
          setLoading(false)
          return
        }
        const { error } = await signUp(email, password, fullName)
        if (error) {
          setErrorMsg(error.message || 'Signup failed. Please try again.')
          setLoading(false)
          return
        }
      }

      navigate(from, { replace: true })
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <div className="wrap py-16 sm:py-24 max-w-md">
      <div className="bg-white p-8 border border-neutral-200 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="font-heading font-black text-xl uppercase tracking-[0.2em]">
            WENZY<span className="text-xs align-super ml-0.5">®</span>
          </span>
          <h1 className="font-heading font-black text-2xl uppercase tracking-tight text-black">
            {isLogin ? 'Customer Sign In' : 'Create Account'}
          </h1>
          <p className="text-xs text-neutral-500">
            {isLogin
              ? 'Access your orders, saved addresses, and drop access.'
              : 'Join the WENZY community for exclusive drops.'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Rohan Sharma"
                className="input-field"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle between login and signup */}
        <div className="pt-4 border-t border-neutral-100 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin)
              setErrorMsg('')
            }}
            className="text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-black transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>

        {/* Admin hint */}
        <div className="p-3 bg-neutral-50 border border-neutral-200 text-center text-[11px] text-neutral-500">
          <div className="font-bold uppercase tracking-wider text-neutral-700 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Store Administrator</span>
          </div>
          <div className="mt-0.5">
            Log in with an authorized admin account to access the <Link to="/admin" className="text-black font-bold underline">Admin Dashboard</Link>.
          </div>
        </div>
      </div>
    </div>
  )
}
