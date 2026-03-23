'use client'
import { useState } from 'react'
import { Modal } from '@/frontend/components/ui/Modal'
import { goalsApi } from '@/lib/api/client'
import { useToast } from '@/frontend/components/ui/Toast'
import { useFoliaStore } from '@/store'
import type { Goal, GoalCategory } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  existing?: Goal
}

const CATEGORIES: [GoalCategory, string][] = [
  ['emergency_fund', 'Emergency fund'], ['home_purchase', 'Home purchase'],
  ['retirement', 'Retirement'], ['education', 'Education'],
  ['vacation', 'Vacation'], ['car', 'Car'],
  ['wedding', 'Wedding'], ['debt_payoff', 'Debt payoff'],
  ['investment', 'Investment'], ['business', 'Business'],
  ['giving', 'Charitable giving'], ['other', 'Other'],
]

export function GoalForm({ open, onClose, onSaved, existing }: Props) {
  const userId = useFoliaStore((s) => s.userId)!
  const { success, error: toastError } = useToast()
  const [saving, setSaving] = useState(false)

  const defaultDate = new Date()
  defaultDate.setFullYear(defaultDate.getFullYear() + 2)

  const [form, setForm] = useState({
    name:           existing?.name           ?? '',
    target_amount:  existing?.target_amount  ?? 10000,
    current_amount: existing?.current_amount ?? 0,
    target_date:    existing?.target_date    ?? defaultDate.toISOString().split('T')[0],
    category:       (existing?.category      ?? 'general') as GoalCategory,
    priority:       existing?.priority       ?? 3,
    notes:          existing?.notes          ?? '',
  })

  const set = (k: keyof typeof form, v: unknown) => setForm((p) => ({ ...p, [k]: v }))

  const save = async () => {
    if (!form.name || form.target_amount <= 0) return
    setSaving(true)
    try {
      if (existing) {
        await goalsApi.update(existing.id, form)
        success('Goal updated')
      } else {
        await goalsApi.create({ ...form, user_id: userId })
        success('Goal created')
      }
      onSaved(); onClose()
    } catch (e: any) {
      toastError(e.message || 'Failed to save goal')
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit goal' : 'New goal'}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !form.name}>{saving ? 'Saving...' : 'Save'}</button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label className="label">Goal name</label>
          <input className="input" placeholder="e.g. Emergency fund" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="select" value={form.category} onChange={(e) => set('category', e.target.value as GoalCategory)}>
            {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="label">Target amount</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }}>$</span>
              <input type="number" className="input" style={{ paddingLeft: '1.5rem' }} value={form.target_amount} min={1} step={500} onChange={(e) => set('target_amount', +e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Already saved</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }}>$</span>
              <input type="number" className="input" style={{ paddingLeft: '1.5rem' }} value={form.current_amount} min={0} onChange={(e) => set('current_amount', +e.target.value)} />
            </div>
          </div>
        </div>
        <div>
          <label className="label">Target date</label>
          <input type="date" className="input" value={form.target_date} onChange={(e) => set('target_date', e.target.value)} />
        </div>
        <div>
          <label className="label">Priority (1 = highest)</label>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {[1, 2, 3, 4, 5].map((p) => (
              <button key={p} className={`btn ${form.priority === p ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                style={{ flex: 1 }} onClick={() => set('priority', p)}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
