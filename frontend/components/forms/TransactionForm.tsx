'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { transactionsApi } from '@/lib/api/client'
import { useToast } from '@/components/ui/Toast'
import { useFoliaStore } from '@/store'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const CATEGORIES = [
  'housing','utilities','groceries','dining','transport','fuel','insurance',
  'healthcare','subscriptions','entertainment','clothing','education',
  'childcare','pets','travel','gifts','savings','investments',
  'debt_payment','salary','freelance','side_hustle','other',
]

export function TransactionForm({ open, onClose, onSaved }: Props) {
  const userId = useFoliaStore((s) => s.userId)!
  const { success, error: toastError } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date:         new Date().toISOString().split('T')[0],
    description:  '',
    amount:       0,
    category:     'other',
    type:         'expense' as 'income' | 'expense',
    is_recurring: false,
    notes:        '',
  })
  const set = (k: keyof typeof form, v: unknown) => setForm((p) => ({ ...p, [k]: v }))

  const save = async () => {
    if (!form.description || form.amount <= 0) return
    setSaving(true)
    try {
      await transactionsApi.create({ ...form, user_id: userId })
      success('Transaction added')
      onSaved(); onClose()
    } catch (e: any) {
      toastError(e.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log transaction"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !form.description || form.amount <= 0}>{saving ? 'Saving...' : 'Add'}</button>
        </>
      }
    >
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button type="button" className={`btn ${form.type === 'expense' ? 'btn-primary' : 'btn-secondary'} btn-sm`} style={{ flex: 1 }} onClick={() => set('type', 'expense')}>Expense</button>
          <button type="button" className={`btn ${form.type === 'income' ? 'btn-primary' : 'btn-secondary'} btn-sm`} style={{ flex: 1 }} onClick={() => set('type', 'income')}>Income</button>
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input" placeholder="e.g. Whole Foods" value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="label">Amount</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }}>$</span>
              <input type="number" className="input" style={{ paddingLeft: '1.5rem' }} value={form.amount} min={0.01} step={0.01} onChange={(e) => set('amount', +e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Category</label>
          <select className="select" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
        </div>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--t2)' }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input type="checkbox" checked={form.is_recurring} onChange={(e) => set('is_recurring', e.target.checked)} />
          Recurring transaction
        </label>
      </div>
    </Modal>
  )
}