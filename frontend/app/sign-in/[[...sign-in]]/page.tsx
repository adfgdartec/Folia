'use client'
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
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
          <img src="/favicon.ico" alt="Folia" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em' }}>
            Folia
          </span>
        </div>
        <p style={{ fontSize: '0.825rem', color: 'var(--t3)' }}>Your financial life OS</p>
      </div>

      <SignIn forceRedirectUrl={"/dashboard"} />
    </div>
  )
}
