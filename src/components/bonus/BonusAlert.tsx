import Link from 'next/link'
import { formatRupiah } from '@/lib/utils'

interface Props {
  customerId: string
  customerName: string
  available: number
}

export default function BonusAlert({ customerId, customerName, available }: Props) {
  return (
    <div className="bg-bonus-bg border border-bonus/30 rounded-2xl px-6 py-5 flex items-center justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-4">
        <span className="text-[32px]">{'\uD83C\uDF81'}</span>
        <div>
          <p className="text-[17px] font-semibold text-bonus">
            {customerName} punya bonus!
          </p>
          <p className="text-[15px] text-text-secondary mt-0.5">
            Tersedia:{' '}
            <span className="font-mono font-semibold text-bonus">
              {available.toLocaleString('id-ID')}
            </span>
          </p>
        </div>
      </div>
      <Link
        href={`/transactions/new?bonus=true&customer=${customerId}`}
        className="bg-bonus hover:bg-[#7C3AED] text-white font-semibold rounded-xl px-6 py-3 text-[15px] transition-colors shrink-0"
        style={{ height: '48px', lineHeight: '1' }}
      >
        {'\uD83C\uDF81'} Buat Bon Bonus
      </Link>
    </div>
  )
}
