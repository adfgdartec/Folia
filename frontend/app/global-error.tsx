'use client'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body style={{ background: '#0a0c0f', color: '#f0f2f5', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.75rem' }}>Something went wrong</div>
          <div style={{ fontSize: '0.875rem', color: '#5d6470', marginBottom: '1.5rem', fontFamily: 'monospace' }}>
            {error.message}
          </div>
          <button
            onClick={reset}
            style={{ background: '#4ade80', color: '#051a0d', border: 'none', borderRadius: 8, padding: '0.625rem 1.25rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
