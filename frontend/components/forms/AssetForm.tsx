'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { assetsApi } from '@/lib/api/client'
import { ASSET_TYPE_LABELS } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { useFoliaStore } from '@/store'
import type { Asset, AssetType } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  existing?: Asset
}

const ASSET_TYPES = Object.entries(ASSET_TYPE_LABELS) as [AssetType, string][]

export function AssetForm({ open, onClose, onSaved, existing }: Props) {
  const userId = useFoliaStore((s) => s.userId)!
  const { success, error } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: existing?.name ?? '',
    value: existing?.value ?? 0,
    type: (existing?.type ?? 'checking') as AssetType,
    institution: existing?.institution ?? '',
    notes: existing?.notes ?? '',
  })

  useEffect(() => {
    setForm({
      name: existing?.name ?? '',
      value: existing?.value ?? 0,
      type: (existing?.type ?? 'checking') as AssetType,
      institution: existing?.institution ?? '',
      notes: existing?.notes ?? '',
    })
  }, [existing, open])

  const setField = (k: keyof typeof form, v: unknown) =>
    setForm((p) => ({ ...p, [k]: v }))

  const save = async () => {
    if (!form.name || form.value < 0) return
    setSaving(true)
    try {
      if (existing) {
        await assetsApi.update(existing.id, form)
        success('Asset updated')
      } else {
        await assetsApi.create({ ...form, user_id: userId })
        success('Asset added')
      }
      onSaved()
      onClose()
    } catch (e: any) {
      error(e.message || 'Failed to save asset')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit asset' : 'Add asset'}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !form.name}>
            {saving ? 'Saving...' : 'Save'}
          </button>
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
          <label className="label">Asset name</label>
          <input
            className="input"
            placeholder="e.g. Chase Checking"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
          />
        </div>

        <div>
          <label className="label">Type</label>
          <select
            className="select"
            value={form.type}
            onChange={(e) => setField('type', e.target.value as AssetType)}
          >
            {ASSET_TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Current value</label>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--t3)',
              }}
            >
              $
            </span>
            <input
              type="number"
              className="input"
              style={{ paddingLeft: '1.5rem' }}
              value={form.value}
              min={0}
              step={100}
              onChange={(e) => setField('value', +e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Institution (optional)</label>
          <input
            className="input"
            placeholder="e.g. Chase Bank"
            value={form.institution}
            onChange={(e) => setField('institution', e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}