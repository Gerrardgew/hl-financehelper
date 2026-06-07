'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cascadingDiscount } from '@/lib/calculations'
import { formatRupiah } from '@/lib/utils'

interface StepInput {
  raw: string
  percentage: number
  error: string | null
}

interface CustomerFormProps {
  customer?: { id: string; nama: string; bonus_threshold: number }
  stepsLM?: { percentage: number }[]
  stepsBR?: { percentage: number }[]
}

function toSteps(arr: { percentage: number }[] = []): StepInput[] {
  return arr.map((s) => ({ raw: String(s.percentage), percentage: s.percentage, error: null }))
}

export default function CustomerForm({
  customer,
  stepsLM: initialLM = [],
  stepsBR: initialBR = [],
}: CustomerFormProps) {
  const router = useRouter()
  const isEdit = !!customer

  const [nama, setNama] = useState(customer?.nama ?? '')
  const [bonusThreshold, setBonusThreshold] = useState(
    customer?.bonus_threshold != null ? String(customer.bonus_threshold) : '10000000'
  )
  const [stepsLM, setStepsLM] = useState<StepInput[]>(toSteps(initialLM))
  const [stepsBR, setStepsBR] = useState<StepInput[]>(toSteps(initialBR))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const numThreshold = parseInt(bonusThreshold) || 0
  const previewBase = 100000
  const lmPct = stepsLM.map((s) => s.percentage)
  const brPct = stepsBR.map((s) => s.percentage)
  const lmResult = cascadingDiscount(previewBase, lmPct)
  const brResult = cascadingDiscount(previewBase, brPct)
  const lmEff =
    previewBase > 0 ? Math.round((1 - lmResult / previewBase) * 100) : 0
  const brEff =
    previewBase > 0 ? Math.round((1 - brResult / previewBase) * 100) : 0

  const hasStepErrors = [...stepsLM, ...stepsBR].some((s) => s.error !== null)

  function addStep(type: 'LM' | 'BR') {
    if (type === 'LM')
      setStepsLM([...stepsLM, { raw: '0', percentage: 0, error: null }])
    else setStepsBR([...stepsBR, { raw: '0', percentage: 0, error: null }])
  }

  function removeStep(type: 'LM' | 'BR', index: number) {
    if (type === 'LM')
      setStepsLM(stepsLM.filter((_, i) => i !== index))
    else setStepsBR(stepsBR.filter((_, i) => i !== index))
  }

  function updateStep(type: 'LM' | 'BR', index: number, raw: string) {
    if (type === 'LM') {
      const next = [...stepsLM]
      next[index] = { ...next[index], raw }
      setStepsLM(next)
    } else {
      const next = [...stepsBR]
      next[index] = { ...next[index], raw }
      setStepsBR(next)
    }
  }

  function validateStep(type: 'LM' | 'BR', index: number) {
    const step = type === 'LM' ? stepsLM[index] : stepsBR[index]
    let err: string | null = null
    let parsed: number = 0

    const trimmed = step.raw.trim()

    if (trimmed === '') {
      parsed = 0
    } else {
      const num = Number(trimmed)
      if (isNaN(num)) {
        err = 'Masukkan angka yang valid'
        parsed = 0
      } else if (num < 0) {
        err = 'Diskon tidak boleh kurang dari 0%'
        parsed = num
      } else if (num > 100) {
        err = 'Diskon tidak boleh lebih dari 100%'
        parsed = num
      } else {
        parsed = num
      }
    }

    if (type === 'LM') {
      const next = [...stepsLM]
      next[index] = { ...next[index], percentage: parsed, error: err, raw: trimmed || '0' }
      setStepsLM(next)
    } else {
      const next = [...stepsBR]
      next[index] = { ...next[index], percentage: parsed, error: err, raw: trimmed || '0' }
      setStepsBR(next)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!nama.trim()) {
      setError('Nama customer wajib diisi')
      return
    }
    if (numThreshold <= 0) {
      setError('Bonus threshold harus lebih dari 0')
      return
    }

    const allInvalid = [...stepsLM, ...stepsBR].filter(
      (s) => s.percentage < 0 || s.percentage > 100
    )
    if (allInvalid.length > 0) {
      setError('Ada step diskon yang tidak valid (0-100%)')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      let customerId: string

      if (isEdit) {
        customerId = customer!.id

        const { error: ue } = await supabase
          .from('customers')
          .update({ nama: nama.trim(), bonus_threshold: numThreshold })
          .eq('id', customerId)
        if (ue) throw ue

        await supabase
          .from('discount_steps')
          .delete()
          .eq('customer_id', customerId)
      } else {
        const { data: inserted, error: ie } = await supabase
          .from('customers')
          .insert({ nama: nama.trim(), bonus_threshold: numThreshold })
          .select('id')
          .single()
        if (ie) throw ie
        customerId = inserted.id
      }

      const allSteps = [
        ...stepsLM.map((s, i) => ({
          customer_id: customerId,
          tipe: 'LM' as const,
          step_order: i,
          percentage: s.percentage,
        })),
        ...stepsBR.map((s, i) => ({
          customer_id: customerId,
          tipe: 'BR' as const,
          step_order: i,
          percentage: s.percentage,
        })),
      ]

      if (allSteps.length > 0) {
        const { error: se } = await supabase
          .from('discount_steps')
          .insert(allSteps)
        if (se) throw se
      }

      router.push('/customers')
      router.refresh()
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Gagal menyimpan customer'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      {error && (
        <div className="bg-red-950/50 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="nama"
          className="block text-sm font-medium text-text-secondary mb-1.5"
        >
          Nama Customer
        </label>
        <input
          id="nama"
          type="text"
          required
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder-text-muted outline-none focus:border-accent transition-colors"
          placeholder="Nama customer"
        />
      </div>

      <div>
        <label
          htmlFor="threshold"
          className="block text-sm font-medium text-text-secondary mb-1.5"
        >
          Bonus Threshold (Rp)
        </label>
        <input
          id="threshold"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          value={bonusThreshold}
          onChange={(e) =>
            setBonusThreshold(e.target.value.replace(/\D/g, ''))
          }
          onBlur={() => {
            if (bonusThreshold === '') setBonusThreshold('0')
          }}
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text font-mono placeholder-text-muted outline-none focus:border-accent transition-colors"
        />
      </div>

      <DiscountStepsEditor
        label="Diskon LM"
        steps={stepsLM}
        onAdd={() => addStep('LM')}
        onRemove={(i) => removeStep('LM', i)}
        onChange={(i, v) => updateStep('LM', i, v)}
        onBlur={(i) => validateStep('LM', i)}
      >
        {stepsLM.length > 0 && (
          <p className="text-xs text-text-secondary mt-2">
            Harga Rp 100.000 setelah diskon LM = {formatRupiah(lmResult)}{' '}
            (efektif {lmEff}%)
          </p>
        )}
      </DiscountStepsEditor>

      <DiscountStepsEditor
        label="Diskon BR"
        steps={stepsBR}
        onAdd={() => addStep('BR')}
        onRemove={(i) => removeStep('BR', i)}
        onChange={(i, v) => updateStep('BR', i, v)}
        onBlur={(i) => validateStep('BR', i)}
      >
        {stepsBR.length > 0 && (
          <p className="text-xs text-text-secondary mt-2">
            Harga Rp 100.000 setelah diskon BR = {formatRupiah(brResult)}{' '}
            (efektif {brEff}%)
          </p>
        )}
      </DiscountStepsEditor>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || hasStepErrors}
          className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving
            ? 'Menyimpan...'
            : isEdit
              ? 'Simpan Perubahan'
              : 'Buat Customer'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-text-secondary hover:text-text text-sm transition-colors"
        >
          Batal
        </button>
      </div>
    </form>
  )
}

function DiscountStepsEditor({
  label,
  steps,
  onAdd,
  onRemove,
  onChange,
  onBlur,
  children,
}: {
  label: string
  steps: StepInput[]
  onAdd: () => void
  onRemove: (index: number) => void
  onChange: (index: number, value: string) => void
  onBlur: (index: number) => void
  children?: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-2">
        {label}
      </label>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i}>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted font-mono w-5">
                {i + 1}.
              </span>
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={step.raw}
                  onChange={(e) => onChange(i, e.target.value)}
                  onBlur={() => onBlur(i)}
                  className="w-full bg-surface-2 border border-border rounded-lg pl-3 pr-8 py-2 text-sm text-text font-mono outline-none focus:border-accent transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                  %
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-text-muted hover:text-danger text-lg leading-none px-1 transition-colors"
              >
                ×
              </button>
            </div>
            {step.error && (
              <p className="text-xs text-red-400 mt-1 ml-7">{step.error}</p>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="mt-2 text-xs text-accent hover:text-emerald-400 transition-colors"
      >
        + Tambah Step
      </button>

      {children}
    </div>
  )
}
