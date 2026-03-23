'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useFoliaStore } from '@/store'

export default function RootPage() {
  const router      = useRouter()
  const { user, isLoaded, isSignedIn } = useUser()
  const isOnboarded = useFoliaStore((s) => s.isOnboarded)
  const userId      = useFoliaStore((s) => s.userId)
  const setUserId   = useFoliaStore((s) => s.setUserId)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      router.replace('/sign-in')
      return
    }

    if (user?.id && user.id !== userId) {
      setUserId(user.id)
    }


    if (isOnboarded) {
      router.replace('/dashboard')
    } else {
      router.replace('/onboarding')
    }
  }, [isLoaded, isSignedIn, user, isOnboarded, userId, setUserId, router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: 28, height: 28,
        border: '2px solid var(--bg-5)',
        borderTop: '2px solid var(--green)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )
}
