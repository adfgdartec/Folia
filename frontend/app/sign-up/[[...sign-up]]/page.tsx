'use client'
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      flexDirection: 'column',
      gap: '2rem',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #22d47e 0%, #0d9e57 100%)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M3 13C3 10 5 8 8 8C11 8 13 6 13 3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="8" cy="8" r="1.5" fill="white"/>
            </svg>
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em' }}>
            Folia
          </span>
        </div>
        <p style={{ fontSize: '0.825rem', color: 'var(--t3)' }}>
          Start your financial intelligence journey
        </p>
      </div>

      <SignUp />
    </div>
  )
}
