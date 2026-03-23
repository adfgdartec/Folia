'use client'
import { useHealthScore } from '@/frontend/hooks'
import { getHealthGrade } from '@/lib/utils'

export function HealthScoreCard({ compact = false }: { compact?: boolean }) {
  const { data: health, loading } = useHealthScore()

  if (loading) return <div className="skeleton" style={{ height: compact ? 80 : 160 }} />
  if (!health) return null

  const grade = getHealthGrade(health.total_score)
  const components = [
    { label: 'Emergency fund', score: health.emergency_fund_score, max: 25 },
    { label: 'Debt-to-income', score: health.debt_to_income_score, max: 25 },
    { label: 'Savings rate',   score: health.savings_rate_score,   max: 25 },
    { label: 'Trajectory',     score: health.trajectory_score,     max: 25 },
  ]

  if (compact) {
    return (
      <div className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ textAlign: 'center', minWidth: 60 }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: grade.color, lineHeight: 1 }}>
            {health.total_score}
          </div>
          <div style={{ fontSize: '0.7rem', color: grade.color, marginTop: 2 }}>{grade.label}</div>
        </div>
        <div style={{ flex: 1 }}>
          {components.map(({ label, score, max }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--t3)', width: 90, flexShrink: 0 }}>{label}</div>
              <div className="progress-track" style={{ flex: 1 }}>
                <div className="progress-fill" style={{ width: `${(score / max) * 100}%`, background: grade.color }} />
              </div>
              <div style={{ fontSize: '0.7rem', fontFamily: 'var(--mono)', color: 'var(--t2)', width: 28, textAlign: 'right' }}>
                {score}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <div className="section-title">Financial Health Score</div>
          <div className="section-sub">{health.summary.split('.')[0]}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: grade.color, lineHeight: 1 }}>
            {health.total_score}
          </div>
          <div style={{ fontSize: '0.8rem', color: grade.color }}>{grade.label}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {components.map(({ label, score, max }) => (
          <div key={label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.825rem', color: 'var(--t2)' }}>{label}</span>
              <span style={{ fontSize: '0.8rem', fontFamily: 'var(--mono)', color: 'var(--t1)' }}>
                {score}/{max}
              </span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${(score / max) * 100}%`, background: getHealthGrade((score / max) * 100).color }} />
            </div>
          </div>
        ))}
      </div>

      {health.improvements.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Top improvements
          </div>
          {health.improvements.map((imp, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.825rem', color: 'var(--t2)', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--green)', flexShrink: 0 }}>→</span>
              {imp}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
