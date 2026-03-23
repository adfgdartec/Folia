'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFoliaStore } from '@/store'

export default function RootPage() {
  const router      = useRouter()
  const isOnboarded = useFoliaStore((s) => s.isOnboarded)
  const userId      = useFoliaStore((s) => s.userId)

  useEffect(() => {
    if (!userId) {
      // For hackathon: assign a demo user ID
      const demoId = `demo-${Math.random().toString(36).slice(2, 10)}`
      useFoliaStore.getState().setUserId(demoId)
    }
    if (isOnboarded) {
      router.replace('/dashboard')
    } else {
      router.replace('/onboarding')
    }
  }, [isOnboarded, userId, router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--green)' }}>Folia</div>
    </div>
  )
}
