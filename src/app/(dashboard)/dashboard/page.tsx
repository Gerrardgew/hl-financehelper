import { createClient } from '@/lib/supabase/server'
import { formatRupiah, formatDate } from '@/lib/utils'

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
  title,
  value,
  subtitle,
}: {
  title: string
  value: string
  subtitle: string
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="text-xs text-text-muted uppercase tracking-wider font-medium">
        {title}
      </p>
      <p className="text-2xl font-mono font-medium text-text mt-2">{value}</p>
      <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
    </div>
  )
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

  const eligibleCustomers: { nama: string; available: number }[] = []
  for (const customer of customers) {
    const { data: paidTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('customer_id', customer.id)
      .eq('status', 'Lunas')
      .eq('is_bonus', false)

    if (!paidTx || paidTx.length === 0) continue

    const txIds = paidTx.map((t) => t.id)
    const { data: lines } = await supabase
      .from('transaction_lines')
      .select('omzet')
      .in('transaction_id', txIds)

    const paidOmzet = (lines ?? []).reduce(
      (sum, l) => sum + ((l as { omzet: number }).omzet ?? 0),
      0
    )

    const { count: grantedCount } = await supabase
      .from('bonus_grants')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer.id)

    const available =
      Math.floor(paidOmzet / customer.bonus_threshold) -
      (grantedCount ?? 0)

    if (available > 0) {
      eligibleCustomers.push({ nama: customer.nama, available })
    }
  }

  return (
    <div className="p-6 space-y-6">
      {eligibleCustomers.length > 0 && (
        <div className="bg-bonus/10 border border-bonus/30 rounded-xl px-5 py-3.5">
          <p className="text-sm text-bonus font-medium">
            Bonus tersedia:{' '}
            {eligibleCustomers.map((c, i) => (
              <span key={i}>
                {i > 0 && ', '}
                {c.nama} ({c.available} bonus)
              </span>
            ))}
          </p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Omzet"
          value={formatRupiah(totalOmzet)}
          subtitle="Bulan Ini"
        />
        <StatCard
          title="Total Laba"
          value={formatRupiah(totalLaba)}
          subtitle="Bulan Ini"
        />
        <StatCard
          title="Piutang"
          value={formatRupiah(totalPiutang)}
          subtitle="Outstanding"
        />
        <StatCard
          title="Dibayar"
          value={formatRupiah(totalDibayar)}
          subtitle="Bulan Ini"
        />
      </div>

      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-base font-medium text-text mb-4">
          Transaksi Terbaru
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-text-muted uppercase tracking-wider font-mono">
                <th className="pb-3 pr-4 font-medium">Tanggal</th>
                <th className="pb-3 pr-4 font-medium">Nomor Bon</th>
                <th className="pb-3 pr-4 font-medium">Customer</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {recentTx.map((tx) => {
                const lineOmzet = tx.transaction_lines.reduce(
                  (s, l) => s + (l.omzet ?? 0),
                  0
                )
                const total = lineOmzet + (tx.ongkir ?? 0)

                let badge
                if (tx.is_bonus) {
                  badge = (
                    <span className="inline-block bg-bonus/20 text-bonus border border-bonus/30 px-2 py-0.5 rounded text-xs font-mono">
                      Bonus
                    </span>
                  )
                } else if (tx.status === 'Lunas') {
                  badge = (
                    <span className="inline-block bg-lunas/20 text-lunas border border-lunas/30 px-2 py-0.5 rounded text-xs font-mono">
                      Lunas
                    </span>
                  )
                } else {
                  badge = (
                    <span className="inline-block bg-piutang/20 text-piutang border border-piutang/30 px-2 py-0.5 rounded text-xs font-mono">
                      Piutang
                    </span>
                  )
                }

                return (
                  <tr
                    key={tx.id}
                    className="border-t border-border hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="py-3 pr-4 text-text-secondary whitespace-nowrap">
                      {formatDate(tx.tanggal)}
                    </td>
                    <td className="py-3 pr-4 font-mono text-text">
                      {tx.nomor_bon}
                    </td>
                    <td className="py-3 pr-4 text-text">
                      {tx.customers?.nama ?? '-'}
                    </td>
                    <td className="py-3 pr-4">{badge}</td>
                    <td className="py-3 text-right font-mono text-text whitespace-nowrap">
                      {formatRupiah(total)}
                    </td>
                  </tr>
                )
              })}
              {recentTx.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-text-muted text-sm"
                  >
                    Belum ada transaksi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
