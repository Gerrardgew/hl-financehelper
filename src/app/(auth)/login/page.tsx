'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      const message =
        authError.message === 'Invalid login credentials'
          ? 'Email atau password salah'
          : authError.message
      setError(message)
      setLoading(false)
      return
    }

    if (data.session) {
      await new Promise(resolve => setTimeout(resolve, 300))
      window.location.href = '/dashboard'
      return
    }

    setError('Login gagal, coba lagi.')
    setLoading(false)
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px] bg-surface border border-border rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <div className="mb-8 text-center">
          <h1 className="text-[48px] font-bold text-accent leading-none tracking-tight">
            HL
          </h1>
          <p className="text-[17px] text-text-secondary mt-3 font-medium">
            Selamat Datang
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-[15px] font-semibold text-text mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-[16px] text-text placeholder-text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
              placeholder="admin@hl.com"
              style={{ height: '52px' }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[15px] font-semibold text-text mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-[16px] text-text placeholder-text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
              placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
              style={{ height: '52px' }}
            />
          </div>

          {error && (
            <div className="bg-danger-bg border border-danger/30 rounded-xl px-4 py-3 text-[15px] text-danger font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-[#256F28] text-white font-semibold rounded-xl px-6 py-3 text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ height: '52px' }}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
