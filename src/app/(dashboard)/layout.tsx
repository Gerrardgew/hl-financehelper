'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '\uD83D\uDCCA' },
  { label: 'Pelanggan', path: '/customers', icon: '\uD83D\uDC65' },
  { label: 'Produk', path: '/products', icon: '\uD83D\uDCE6' },
  { label: 'Transaksi', path: '/transactions', icon: '\uD83E\uDDFE' },
  { label: 'Laporan', path: '/recap', icon: '\uD83D\uDCC8' },
]

const bottomNavItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '\uD83D\uDCCA' },
  { label: 'Pelanggan', path: '/customers', icon: '\uD83D\uDC65' },
  { label: 'Produk', path: '/products', icon: '\uD83D\uDCE6' },
  { label: 'Transaksi', path: '/transactions', icon: '\uD83E\uDDFE' },
  { label: 'Laporan', path: '/recap', icon: '\uD83D\uDCC8' },
]

function ThemeToggle({ compact }: { compact?: boolean }) {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  )

  function toggle() {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('hl-theme', next ? 'dark' : 'light')
    setDark(next)
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        className="w-12 h-12 flex items-center justify-center rounded-xl text-xl hover:bg-surface-2 transition-colors"
        aria-label={dark ? 'Mode Terang' : 'Mode Gelap'}
      >
        {dark ? '\u2600\uFE0F' : '\uD83C\uDF19'}
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center w-full gap-3 px-4 py-3 rounded-xl text-[15px] text-text-secondary hover:text-text hover:bg-surface-2 transition-colors"
    >
      <span className="text-xl">{dark ? '\u2600\uFE0F' : '\uD83C\uDF19'}</span>
      <span className="font-medium hidden md:inline">{dark ? 'Mode Terang' : 'Mode Gelap'}</span>
    </button>
  )
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-30
          bg-surface border-r border-border
          flex flex-col
          transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          md:w-[72px] lg:w-[260px]
          ${open ? 'w-[280px]' : 'w-[280px] md:w-[72px] lg:w-[260px]'}
        `}
      >
        {/* Logo */}
        <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-[32px] font-bold text-accent tracking-tight leading-none">
              HL
            </h1>
            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="md:hidden w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text rounded-xl hover:bg-surface-2 transition-colors text-2xl"
            >
              {'\u2715'}
            </button>
          </div>
          <p className="text-sm text-text-secondary mt-1 font-medium truncate hidden lg:block">
            Manajemen Penjualan
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium transition-colors
                  border-l-[4px] group relative
                  ${active
                    ? 'bg-accent-light text-accent border-l-accent'
                    : 'text-text-secondary hover:text-text hover:bg-surface-2 border-l-transparent'
                  }
                `}
              >
                <span className="text-xl shrink-0">{item.icon}</span>
                <span className="hidden lg:inline">{item.label}</span>
                {/* Tooltip on tablet hover */}
                <span className="
                  absolute left-[68px] top-1/2 -translate-y-1/2
                  bg-surface border border-border text-text text-[13px]
                  px-3 py-1.5 rounded-lg whitespace-nowrap
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible
                  transition-opacity
                  lg:hidden shadow-lg z-50
                ">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 space-y-2 border-t border-border pt-4 shrink-0">
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
          <div className="hidden lg:block">
            {userEmail && (
              <div className="px-4 py-2 text-sm text-text-muted truncate">
                {userEmail}
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-[15px] font-medium text-danger hover:bg-danger-bg transition-colors disabled:opacity-50"
          >
            <span className="text-xl shrink-0">{'\uD83D\uDEAA'}</span>
            <span className="hidden lg:inline">{loggingOut ? 'Keluar...' : 'Keluar'}</span>
          </button>
        </div>
      </aside>
    </>
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
        {bottomNavItems.map((item) => {
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-[48px] min-h-[48px] rounded-xl transition-colors ${
                active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <span className="text-[22px] leading-none">{item.icon}</span>
              <span className={`text-[10px] font-medium leading-tight ${active ? 'font-semibold' : ''}`}>
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-surface border-b border-border md:hidden safe-pt">
        <div className="flex items-center justify-between h-16 px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-surface-2 transition-colors text-2xl"
            aria-label="Buka menu"
          >
            {'\u2630'}
          </button>
          <Link href="/dashboard" className="text-[22px] font-bold text-accent">
            HL
          </Link>
          <ThemeToggle compact />
        </div>
      </div>

      {/* Spacer for mobile header */}
      <div className="h-16 md:hidden" />

      {/* Main content area */}
      <div className={`
        md:ml-[72px] lg:ml-[260px]
        min-h-screen
        pb-20 md:pb-0
      `}>
        {children}
      </div>

      {/* Bottom navigation (mobile only) */}
      <BottomNav />
    </div>
  )
}
