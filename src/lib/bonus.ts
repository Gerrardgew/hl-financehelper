import { createClient } from './supabase/client'

export async function getCustomerPaidOmzet(customerId: string): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase
    .from('transaction_lines')
    .select('omzet, transactions!inner(customer_id, status, is_bonus)')
    .eq('transactions.customer_id', customerId)
    .eq('transactions.status', 'Lunas')
    .eq('transactions.is_bonus', false)

  return (data ?? []).reduce((sum, line) => sum + ((line as { omzet: number }).omzet ?? 0), 0)
}

export async function getCustomerBonusGranted(customerId: string): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase
    .from('bonus_grants')
    .select('jumlah')
    .eq('customer_id', customerId)

  return (data ?? []).reduce((sum, g) => sum + ((g as { jumlah: number }).jumlah ?? 0), 0)
}

export function calculateBonusAvailable(
  paidOmzet: number,
  threshold: number,
  granted: number
): number {
  return Math.floor(paidOmzet / threshold) - granted
}
