import { createClient } from '@/lib/supabase/server'
import { formatRupiah, formatDate } from '@/lib/utils'
import { calculateBonusAvailable } from '@/lib/bonus'
import BonusAlert from '@/components/bonus/BonusAlert'

function getMonthBoundaries() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const start = new Date(year, month, 1).toISOString().split('T')[0]
  const end = new Date(year, month + 1, 0).toISOString().split('T')[0]
  return { start, end }
}

interface OmzetLabaLine {
  omzet: number
  laba: number
}

interface OmzetLine {
  omzet: number
}

interface TransactionWithLines {
  id: string
  ongkir: number
  transaction_lines: OmzetLabaLine[] | OmzetLine[]
}

interface RecentTransaction {
  id: string
  nomor_bon: string
  tanggal: string
  status: string
  is_bonus: boolean
  ongkir: number
  customers: { nama: string } | null
  transaction_lines: OmzetLine[]
}

interface CustomerRecord {
  id: string
  nama: string
  bonus_threshold: number
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  colorClass,
}: {
  icon: string
  title: string
  value: string
  subtitle: string
  colorClass: string
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex items-center gap-4 md:gap-5 min-h-[100px]">
      <span className="text-[32px] md:text-[40px] shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] md:text-[14px] text-text-secondary font-medium truncate" title={title}>{title}</p>
        <p className={`text-base md:text-lg lg:text-xl font-mono font-bold leading-tight mt-0.5 md:mt-1 ${colorClass}`}>{value}</p>
        <p className="text-[11px] md:text-[13px] text-text-muted mt-0.5 truncate">{subtitle}</p>
      </div>
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { start, end } = getMonthBoundaries()

  const [lunasThisMonth, piutangData, recentData, customersData] =
    await Promise.all([
      supabase
        .from('transactions')
        .select('id, ongkir, transaction_lines(omzet, laba)')
        .eq('status', 'Lunas')
        .eq('is_bonus', false)
        .gte('tanggal', start)
        .lte('tanggal', end),

      supabase
        .from('transactions')
        .select('id, ongkir, transaction_lines(omzet)')
        .eq('status', 'Piutang')
        .eq('is_bonus', false),

      supabase
        .from('transactions')
        .select(
          'id, nomor_bon, tanggal, status, is_bonus, ongkir, customers(nama), transaction_lines(omzet)'
        )
        .order('created_at', { ascending: false })
        .limit(10),

      supabase
        .from('customers')
        .select('id, nama, bonus_threshold')
        .eq('is_deleted', false),
    ])

  const lunasTx = (lunasThisMonth.data ?? []) as TransactionWithLines[]
  const piutangTx = (piutangData.data ?? []) as TransactionWithLines[]
  const recentTx: RecentTransaction[] = (recentData.data ?? []).map(
    (tx: Record<string, unknown>) =>
      ({
        ...tx,
        customers: (tx as { customers: unknown }).customers ?? null,
      }) as RecentTransaction
  )
  const customers = (customersData.data ?? []) as CustomerRecord[]

  let totalOmzet = 0
  let totalLaba = 0
  for (const t of lunasTx) {
    for (const line of t.transaction_lines as OmzetLabaLine[]) {
      totalOmzet += line.omzet ?? 0
      totalLaba += line.laba ?? 0
    }
  }
  const totalDibayar =
    totalOmzet +
    lunasTx.reduce((s, t) => s + (t.ongkir ?? 0), 0)

  let totalPiutang = 0
  for (const t of piutangTx) {
    let lineSum = 0
    for (const line of t.transaction_lines as OmzetLine[]) {
      lineSum += line.omzet ?? 0
    }
    totalPiutang += lineSum + (t.ongkir ?? 0)
  }

  const eligibleCustomers: {
    id: string
    nama: string
    available: number
  }[] = []
  for (const customer of customers) {
    const { data: paidLines } = await supabase
      .from('transaction_lines')
      .select('omzet, transactions!inner(customer_id, status, is_bonus)')
      .eq('transactions.customer_id', customer.id)
      .eq('transactions.status', 'Lunas')
      .eq('transactions.is_bonus', false)

    const paidOmzet = (paidLines ?? []).reduce(
      (sum, l) => sum + ((l as { omzet: number }).omzet ?? 0),
      0
    )

    const { count: grantedCount } = await supabase
      .from('bonus_grants')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer.id)

    const available = calculateBonusAvailable(
      paidOmzet,
      customer.bonus_threshold,
      grantedCount ?? 0
    )

    if (available > 0) {
      eligibleCustomers.push({
        id: customer.id,
        nama: customer.nama,
        available,
      })
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Greeting */}
      <h1 className="text-[24px] md:text-[28px] font-bold text-text">
        {getGreeting()}! {'\uD83D\uDC4B'}
      </h1>

      {/* Bonus Alerts */}
      {eligibleCustomers.length > 0 && (
        <div className="space-y-3">
          {eligibleCustomers.map((c) => (
            <BonusAlert
              key={c.id}
              customerId={c.id}
              customerName={c.nama}
              available={c.available}
            />
          ))}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={'\uD83D\uDCB0'}
          title="Omzet"
          value={formatRupiah(totalOmzet)}
          subtitle={`${lunasTx.length} transaksi lunas`}
          colorClass="text-accent"
        />
        <StatCard
          icon={'\uD83D\uDCC8'}
          title="Laba"
          value={formatRupiah(totalLaba)}
          subtitle={`${lunasTx.length} transaksi`}
          colorClass="text-blue"
        />
        <StatCard
          icon={'\uD83D\uDCC4'}
          title="Piutang"
          value={formatRupiah(totalPiutang)}
          subtitle={`${piutangTx.length} transaksi`}
          colorClass="text-piutang"
        />
        <StatCard
          icon={'\u2705'}
          title="Dibayar"
          value={formatRupiah(totalDibayar)}
          subtitle="Bulan ini"
          colorClass="text-lunas"
        />
      </div>

      {/* Recent Transactions */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <h2 className="text-[18px] md:text-[22px] font-semibold text-text mb-4">
          Transaksi Terbaru
        </h2>

        {recentTx.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-[15px]">
            Belum ada transaksi
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="block md:hidden space-y-3">
              {recentTx.map((tx) => {
                const lineOmzet = tx.transaction_lines.reduce(
                  (s, l) => s + (l.omzet ?? 0),
                  0
                )
                const total = lineOmzet + (tx.ongkir ?? 0)

                let badge
                if (tx.is_bonus) {
                  badge = (
                    <span className="inline-block bg-bonus-bg text-bonus border border-bonus/30 rounded-full px-3.5 py-1.5 text-[13px] font-semibold">
                      Bonus
                    </span>
                  )
                } else if (tx.status === 'Lunas') {
                  badge = (
                    <span className="inline-block bg-lunas-bg text-lunas border border-lunas/30 rounded-full px-3.5 py-1.5 text-[13px] font-semibold">
                      Lunas
                    </span>
                  )
                } else {
                  badge = (
                    <span className="inline-block bg-piutang-bg text-piutang border border-piutang/30 rounded-full px-3.5 py-1.5 text-[13px] font-semibold">
                      Piutang
                    </span>
                  )
                }

                return (
                  <div key={tx.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono tracking-normal text-text font-semibold">{tx.nomor_bon}</span>
                      {badge}
                    </div>
                    <div className="space-y-1 text-[14px]">
                      <p className="text-text-secondary">
                        Pelanggan: <span className="text-text">{tx.customers?.nama ?? '-'}</span>
                      </p>
                      <p className="text-text-secondary">
                        Tanggal: <span className="text-text">{formatDate(tx.tanggal)}</span>
                      </p>
                      <p className="text-text-secondary">
                        Total: <span className="font-mono text-text font-semibold">{tx.is_bonus ? <span className="text-indigo-500">GRATIS</span> : formatRupiah(total)}</span>
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Tablet/Desktop table */}
            <div className="hidden md:block">
              <div className="relative">
                <div className="pointer-events-none absolute left-0 top-0 h-full w-8 z-10 opacity-0 transition-opacity bg-gradient-to-r from-surface to-transparent" />
                <div className="pointer-events-none absolute right-0 top-0 h-full w-8 z-10 transition-opacity bg-gradient-to-l from-surface to-transparent" />
                <div className="overflow-x-auto scroll-smooth table-scroll">
              <table className="w-full min-w-[750px]">
                <thead>
                  <tr className="text-left text-[13px] text-text-secondary uppercase tracking-wider font-semibold">
                    <th className="pb-3 pr-4 font-medium">Tanggal</th>
                    <th className="pb-3 pr-4 font-medium">Nomor Bon</th>
                    <th className="pb-3 pr-4 font-medium">Pelanggan</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="text-[15px]">
                  {recentTx.map((tx) => {
                    const lineOmzet = tx.transaction_lines.reduce(
                      (s, l) => s + (l.omzet ?? 0),
                      0
                    )
                    const total = lineOmzet + (tx.ongkir ?? 0)

                    let badge
                    if (tx.is_bonus) {
                      badge = (
                        <span className="inline-block bg-bonus-bg text-bonus border border-bonus/30 rounded-full px-3.5 py-1.5 text-[13px] font-semibold">
                          Bonus
                        </span>
                      )
                    } else if (tx.status === 'Lunas') {
                      badge = (
                        <span className="inline-block bg-lunas-bg text-lunas border border-lunas/30 rounded-full px-3.5 py-1.5 text-[13px] font-semibold">
                          Lunas
                        </span>
                      )
                    } else {
                      badge = (
                        <span className="inline-block bg-piutang-bg text-piutang border border-piutang/30 rounded-full px-3.5 py-1.5 text-[13px] font-semibold">
                          Piutang
                        </span>
                      )
                    }

                    return (
                      <tr
                        key={tx.id}
                        className="border-b border-border hover:bg-surface-2/50 transition-colors"
                        style={{ height: '64px' }}
                      >
                        <td className="pr-4 text-text-secondary whitespace-nowrap">
                          {formatDate(tx.tanggal)}
                        </td>
                        <td className="pr-4 font-mono tracking-normal text-text whitespace-nowrap">
                          {tx.nomor_bon}
                        </td>
                        <td className="pr-4 text-text">
                          {tx.customers?.nama ?? '-'}
                        </td>
                        <td className="pr-4">{badge}</td>
                        <td className="text-right font-mono text-text font-medium whitespace-nowrap">
                          {tx.is_bonus ? <span className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300 px-3 py-1 rounded-full text-sm font-semibold">GRATIS</span> : formatRupiah(total)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-text-muted text-right px-4 py-2 lg:hidden">
            &larr; Geser untuk lihat lebih &rarr;
          </p>
        </div>
          </>
        )}
      </div>
    </div>
  )
}
