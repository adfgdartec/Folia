'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useFoliaStore } from '@/store'
import { usersApi } from '@/lib/api/client'

export default function RootPage() {
  const router = useRouter()
  const { user, isLoaded, isSignedIn } = useUser()
  const isOnboarded = useFoliaStore((s) => s.isOnboarded)
  const userId = useFoliaStore((s) => s.userId)
  const setUserId = useFoliaStore((s) => s.setUserId)
  const setProfile = useFoliaStore((s) => s.setProfile)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      router.replace('/sign-in')
      return
    }

    if (user?.id && user.id !== userId) {
      setUserId(user.id)
    }

    const loadProfile = async () => {
      if (!user?.id) return
      try {
        const profile = await usersApi.getProfile(user.id)
        setProfile(profile)
      } catch (error: any) {
        if (error?.status === 404) {
          // New user: onboarding will be shown, but we also can create an empty profile now
          const created = await usersApi.updateProfile(user.id, { onboarding_done: false })
          setProfile(created)
        }
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [isLoaded, isSignedIn, user, userId, setProfile, setUserId, router])

  useEffect(() => {
    if (!isLoaded || loading) return

    if (isOnboarded) {
      router.replace('/dashboard')
    } else {
      router.replace('/onboarding')
    }
  }, [isLoaded, loading, isOnboarded, router])

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
