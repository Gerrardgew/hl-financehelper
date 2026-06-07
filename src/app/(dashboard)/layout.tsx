'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Customers', path: '/customers' },
  { label: 'Products', path: '/products' },
  { label: 'Transaksi', path: '/transactions' },
  { label: 'Recap', path: '/recap' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    try {
      const supabase = createClient()
      await supabase.auth.signOut({ scope: 'local' })
    } catch (e) {
      // ignore error
    } finally {
      // Hard redirect — bypass semua middleware dan cache
      window.location.href = 'http://localhost:3000/login'
    }
  }

  function isActive(path: string) {
    if (path === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(path)
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed left-0 top-0 bottom-0 w-60 bg-surface border-r border-border flex flex-col z-10">
        <div className="px-6 py-5 border-b border-border">
          <h1 className="text-xl font-mono font-medium text-accent tracking-wide">
            HL
          </h1>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors border-l-2 ${
                  active
                    ? 'bg-emerald-900/40 text-emerald-400 border-l-emerald-400'
                    : 'text-text-secondary hover:text-text hover:bg-surface-2 border-transparent'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center w-full px-3 py-2.5 text-sm text-text-secondary hover:text-danger hover:bg-danger-dim/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loggingOut ? 'Keluar...' : 'Logout'}
          </button>
        </div>
      </aside>

      <main className="ml-60 flex-1 min-h-screen">{children}</main>
    </div>
  )
}
