'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatRupiah, formatDate } from '@/lib/utils';

interface TransactionLine {
  omzet?: number;
}

interface RecentTransaction {
  id: string;
  nomor_bon: string;
  tanggal: string;
  status: string;
  is_bonus: boolean;
  ongkir: number;
  customers: { nama: string } | null;
  transaction_lines: TransactionLine[];
}

export default function DashboardRecentTable({ recentTx }: { recentTx: RecentTransaction[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = (e: Event) => {
      const target = e.currentTarget as HTMLElement;
      const shadowLeft = target.parentElement?.querySelector('#shadow-left-dash') as HTMLElement;
      const shadowRight = target.parentElement?.querySelector('#shadow-right-dash') as HTMLElement;
      if (shadowLeft) shadowLeft.style.opacity = target.scrollLeft > 0 ? '1' : '0';
      if (shadowRight) shadowRight.style.opacity = target.scrollLeft < target.scrollWidth - target.clientWidth ? '1' : '0';
    };
    el.addEventListener('scroll', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div className="relative">
      <div id="shadow-left-dash" className="pointer-events-none absolute left-0 top-0 h-full w-8 z-10 opacity-0 transition-opacity bg-gradient-to-r from-surface to-transparent" />
      <div id="shadow-right-dash" className="pointer-events-none absolute right-0 top-0 h-full w-8 z-10 transition-opacity bg-gradient-to-l from-surface to-transparent" />
      <div
        className="overflow-x-auto scroll-smooth table-scroll"
        ref={containerRef}
      >
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
              const lineOmzet = tx.transaction_lines.reduce((s, l) => s + (l.omzet ?? 0), 0);
              const total = lineOmzet + (tx.ongkir ?? 0);

              let badge;
              if (tx.is_bonus) {
                badge = (
                  <span className="inline-block bg-bonus-bg text-bonus border border-bonus/30 rounded-full px-3.5 py-1.5 text-[13px] font-semibold">Bonus</span>
                );
              } else if (tx.status === 'Lunas') {
                badge = (
                  <span className="inline-block bg-lunas-bg text-lunas border border-lunas/30 rounded-full px-3.5 py-1.5 text-[13px] font-semibold">Lunas</span>
                );
              } else {
                badge = (
                  <span className="inline-block bg-piutang-bg text-piutang border border-piutang/30 rounded-full px-3.5 py-1.5 text-[13px] font-semibold">Piutang</span>
                );
              }

              return (
                <tr key={tx.id} className="border-b border-border hover:bg-surface-2/50 transition-colors" style={{ height: '64px' }}>
                  <td className="pr-4 text-text-secondary whitespace-nowrap">{formatDate(tx.tanggal)}</td>
                  <td className="pr-4 font-mono tracking-normal text-text whitespace-nowrap">{tx.nomor_bon}</td>
                  <td className="pr-4 text-text">{tx.customers?.nama ?? '-'}
                  </td>
                  <td className="pr-4">{badge}</td>
                  <td className="text-right font-mono text-text font-medium whitespace-nowrap">
                    {tx.is_bonus ? (
                      <span className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300 px-3 py-1 rounded-full text-sm font-semibold">GRATIS</span>
                    ) : (
                      formatRupiah(total)
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
