'use client'
import { useNetWorthHistory } from '@/frontend/hooks'
import { NetWorthChart } from '@/frontend/components/charts'
import { formatCurrency } from '@/lib/utils'
import { useFoliaStore } from '@/store'

export function NetWorthCard() {
  const dashboard = useFoliaStore((s) => s.dashboard)
  const { data: history, loading } = useNetWorthHistory(12)

  const nw = dashboard?.net_worth?.net_worth ?? 0
  const assets = dashboard?.net_worth?.total_assets ?? 0
  const debts  = dashboard?.net_worth?.total_debts  ?? 0
  const isPos  = nw >= 0

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <div className="section-title">Net worth</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--mono)', color: isPos ? 'var(--green)' : 'var(--red)', marginTop: 4, lineHeight: 1 }}>
            {formatCurrency(nw)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--t3)' }}>Assets</div>
            <div style={{ fontSize: '0.9rem', fontFamily: 'var(--mono)', color: 'var(--green)' }}>{formatCurrency(assets, true)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--t3)' }}>Debts</div>
            <div style={{ fontSize: '0.9rem', fontFamily: 'var(--mono)', color: 'var(--red)' }}>{formatCurrency(debts, true)}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 140 }} />
      ) : history?.snapshots && history.snapshots.length > 1 ? (
        <NetWorthChart data={history.snapshots} height={140} />
      ) : (
        <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontSize: '0.825rem' }}>
          Chart appears after your first month of data
        </div>
      )}
    </div>
  )
}
