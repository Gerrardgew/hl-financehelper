export type ProductType = 'LM' | 'BR'

export type TransactionStatus = 'Piutang' | 'Lunas'

export interface Customer {
  id: string
  nama: string
  bonus_threshold: number
  is_deleted: boolean
  created_at: string
}

export interface DiscountStep {
  id: string
  customer_id: string
  tipe: ProductType
  step_order: number
  percentage: number
}

export interface Product {
  id: string
  nama: string
  harga_modal: number
  harga_base: number
  tipe: ProductType
  is_deleted: boolean
  created_at: string
}

export interface Transaction {
  id: string
  nomor_bon: string
  tanggal: string
  customer_id: string
  ongkir: number
  deskripsi: string | null
  is_bonus: boolean
  status: TransactionStatus
  payment_date: string | null
  created_at: string
}

export interface TransactionLine {
  id: string
  transaction_id: string
  product_id: string
  quantity: number
  harga_base: number
  harga_modal: number
  discounted_price: number
  omzet: number
  laba: number
}

export interface BonusGrant {
  id: string
  customer_id: string
  transaction_id: string
  jumlah: number
  created_at: string
}
