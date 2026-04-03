'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { debtsApi } from '@/lib/api/client'
import { DEBT_TYPE_LABELS } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { useFoliaStore } from '@/store'
import type { Debt, DebtType } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  existing?: Debt
}

const DEBT_TYPES = Object.entries(DEBT_TYPE_LABELS) as [DebtType, string][]

export function DebtForm({ open, onClose, onSaved, existing }: Props) {
  const userId = useFoliaStore((s) => s.userId)!
  const { success, error: toastError } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name:            existing?.name            ?? '',
    balance:         existing?.balance         ?? 0,
    interest_rate:   existing?.interest_rate   ?? 0,
    minimum_payment: existing?.minimum_payment ?? 0,
    type:            (existing?.type           ?? 'credit_card') as DebtType,
    lender:          existing?.lender          ?? '',
    due_day:         existing?.due_day         ?? undefined as number | undefined,
  })

  useEffect(() => {
    setForm({
      name:            existing?.name            ?? '',
      balance:         existing?.balance         ?? 0,
      interest_rate:   existing?.interest_rate   ?? 0,
      minimum_payment: existing?.minimum_payment ?? 0,
      type:            (existing?.type           ?? 'credit_card') as DebtType,
      lender:          existing?.lender          ?? '',
      due_day:         existing?.due_day         ?? undefined,
    })
  }, [existing, open])

  const set = (k: keyof typeof form, v: unknown) => setForm((p) => ({ ...p, [k]: v }))

  const save = async () => {
    if (!form.name || form.balance < 0) return
    setSaving(true)
    try {
      if (existing) {
        await debtsApi.update(existing.id, form)
        success('Debt updated')
      } else {
        await debtsApi.create({ ...form, user_id: userId })
        success('Debt added')
      }
      onSaved(); onClose()
    } catch (e: any) {
      toastError(e.message || 'Failed to save debt')
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit debt' : 'Add debt'}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !form.name}>{saving ? 'Saving...' : 'Save'}</button>
        </>
      }
    >
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div>
          <label className="label">Debt name</label>
          <input className="input" placeholder="e.g. Chase Sapphire card" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="select" value={form.type} onChange={(e) => set('type', e.target.value as DebtType)}>
            {DEBT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="label">Current balance</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }}>$</span>
              <input type="number" className="input" style={{ paddingLeft: '1.5rem' }} value={form.balance} min={0} step={100} onChange={(e) => set('balance', +e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Interest rate (APR %)</label>
            <input type="number" className="input" value={form.interest_rate} min={0} max={100} step={0.1} onChange={(e) => set('interest_rate', +e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="label">Minimum payment</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }}>$</span>
              <input type="number" className="input" style={{ paddingLeft: '1.5rem' }} value={form.minimum_payment} min={0} onChange={(e) => set('minimum_payment', +e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Due day of month</label>
            <input type="number" className="input" value={form.due_day ?? ''} min={1} max={31} placeholder="e.g. 15" onChange={(e) => set('due_day', e.target.value ? +e.target.value : undefined)} />
          </div>
        </div>
        <div>
          <label className="label">Lender (optional)</label>
          <input className="input" placeholder="e.g. Sallie Mae" value={form.lender} onChange={(e) => set('lender', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}