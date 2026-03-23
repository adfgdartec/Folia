import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', flexDirection: 'column', gap: '1.25rem', textAlign: 'center',
    }}>
      <div style={{ fontSize: '4rem', fontWeight: 700, color: 'var(--b2)' }}>404</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--t1)' }}>Page not found</div>
      <div style={{ fontSize: '0.875rem', color: 'var(--t3)' }}>
        The page you're looking for doesn't exist.
      </div>
      <Link href="/dashboard" style={{ textDecoration: 'none' }}>
        <button className="btn btn-primary">Go to dashboard</button>
      </Link>
    </div>
  )
}