'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { label: 'Beranda', path: '/dashboard', icon: '\uD83C\uDFE0' },
  { label: 'Pelanggan', path: '/customers', icon: '\uD83D\uDC65' },
  { label: 'Produk', path: '/products', icon: '\uD83D\uDCE6' },
  { label: 'Transaksi', path: '/transactions', icon: '\uD83E\uDDFE' },
  { label: 'Laporan', path: '/recap', icon: '\uD83D\uDCC8' },
]

function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const isDark = document.documentElement.classList.toggle('dark')
    setDark(isDark)
    localStorage.setItem('hl-theme', isDark ? 'dark' : 'light')
  }

  if (!mounted) return (
    <button className="flex items-center justify-center w-full gap-3 px-4 py-3 rounded-xl opacity-0">
      <span className="text-xl">☀️</span>
    </button>
  )

  return (
    <button onClick={toggle} className="flex items-center justify-center w-full gap-3 px-4 py-3 rounded-xl hover:bg-surface-2 transition-colors">
      <span className="text-xl">{dark ? '☀️' : '🌙'}</span>
      <span className="font-medium inline">{dark ? 'Mode Terang' : 'Mode Gelap'}</span>
    </button>
  )
}

function Sidebar() {
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email)
    })
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // ignore
    } finally {
      window.location.href = '/login'
    }
  }

  function isActive(path: string) {
    if (path === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(path)
  }

  return (
    <aside className="hidden md:flex fixed top-0 bottom-0 left-0 z-30 w-[200px] lg:w-[260px] bg-surface border-r border-border flex-col transition-all">
      {/* Logo */}
      <div className="px-4 lg:px-6 pt-6 pb-4 border-b border-border shrink-0">
        <h1 className="text-[32px] font-bold text-accent tracking-tight leading-none">
          HL
        </h1>
        <p className="text-sm text-text-secondary mt-1 font-medium truncate">
          Manajemen Penjualan
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 lg:px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`
                flex items-center gap-3 px-3 lg:px-4 py-3 lg:py-3.5 rounded-xl text-[14px] lg:text-[15px] font-medium transition-colors
                border-l-[4px]
                ${active
                  ? 'bg-accent-light text-accent border-l-accent'
                  : 'text-text-secondary hover:text-text hover:bg-surface-2 border-l-transparent'
                }
              `}
            >
              <span className="text-xl shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 lg:px-3 pb-4 space-y-2 border-t border-border pt-4 shrink-0">
        <ThemeToggle />
        {userEmail && (
          <div className="px-3 lg:px-4 py-2 text-sm text-text-muted">
            {userEmail}
          </div>
        )}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-3 w-full px-3 lg:px-4 py-3 lg:py-3.5 rounded-xl text-[14px] lg:text-[15px] font-medium text-danger hover:bg-danger-bg transition-colors disabled:opacity-50"
        >
          <span className="text-xl shrink-0">{'\uD83D\uDEAA'}</span>
          <span>{loggingOut ? 'Keluar...' : 'Keluar'}</span>
        </button>
      </div>
    </aside>
  )
}

function BottomNav() {
  const pathname = usePathname()

  function isActive(path: string) {
    if (path === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-surface border-t border-border md:hidden safe-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 flex-1 min-h-[48px] transition-colors ${
                active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <span className="text-[24px] leading-none">{item.icon}</span>
              <span className={`text-[11px] font-medium leading-tight ${active ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />

      <div className={`
        md:ml-[200px] lg:ml-[260px] 
        min-h-screen 
        pb-20 md:pb-0 
        transition-all
      `}>
        <main className="flex-1 min-w-0 px-4 py-4 md:px-6 md:py-5 lg:px-8 lg:py-6 pb-24 md:pb-6">
          <div className="max-w-screen-xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
