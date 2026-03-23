'use client'

export function Spinner({ size = 24, color = 'var(--green)' }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid var(--bg-4)`,
      borderTop: `2px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      flexShrink: 0,
    }} />
  )
}

export function PageSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem' }}>
      <Spinner size={28} />
      <span style={{ color: 'var(--t3)', fontSize: '0.875rem' }}>Loading...</span>
    </div>
  )
}

export function InlineSpinner() {
  return <Spinner size={14} />
}
