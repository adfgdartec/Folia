'use client'
import { useEffect, useState, useRef } from 'react'
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
  const setMetadata = useFoliaStore((s) => s.setMetadata)
  const [loading, setLoading] = useState(true)
  const hasRedirected = useRef(false)

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
        
        // Also load metadata if user has completed onboarding
        if (profile.onboarding_done) {
          try {
            const metadata = await usersApi.getMetadata(user.id)
            setMetadata(metadata)
          } catch {
            // Metadata might not exist yet
          }
        }
      } catch (error: any) {
        if (error?.status === 404) {
          // New user: create profile with onboarding not done
          try {
            const created = await usersApi.updateProfile(user.id, { onboarding_done: false })
            setProfile(created)
          } catch {
            // Profile creation failed, will retry
          }
        }
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [isLoaded, isSignedIn, user, userId, setProfile, setUserId, setMetadata, router])

  useEffect(() => {
    if (!isLoaded || loading || hasRedirected.current) return

    hasRedirected.current = true
    
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
