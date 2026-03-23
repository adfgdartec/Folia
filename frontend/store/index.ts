import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FinancialMetadata, UserProfile, Alert, DashboardData } from '@/types'

interface FoliaStore {

  userId: string | null
  profile: UserProfile | null
  metadata: FinancialMetadata | null
  isOnboarded: boolean


  dashboard: DashboardData | null
  alertCount: number


  sidebarOpen: boolean
  activeSection: string


  setUserId: (id: string | null) => void
  setProfile: (profile: UserProfile | null) => void
  setMetadata: (metadata: FinancialMetadata | null) => void
  setDashboard: (data: DashboardData | null) => void
  setAlertCount: (n: number) => void
  setSidebarOpen: (open: boolean) => void
  setActiveSection: (section: string) => void
  reset: () => void
}

export const useFoliaStore = create<FoliaStore>()(
    persist(
        (set) => ({
            userId: null,
            profile: null,
            metadata: null,
            isOnboarded: false,
            dashboard: null,
            alertCount: 0,
            sidebarOpen: true,
            activeSection: 'dashboard',

            setUserId: (id) => set({ userId: id }),
            setProfile: (profile) => set({ profile, isOnboarded: profile?.onboarding_done ?? false }),
            setMetadata: (metadata) => set({ metadata }),
            setDashboard: (dashboard) => set({ dashboard }),
            setAlertCount: (alertCount) => set({ alertCount }),
            setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
            setActiveSection: (activeSection) => set({ activeSection }),
            reset: () => set({
                userId: null, profile: null, metadata: null,
                isOnboarded: false, dashboard: null,
                alertCount: 0, activeSection: 'dashboard',
            }),
        }),
        {
           name: 'folia-store',
            partialize: (state) => ({
                userId: state.userId,
                dna: state.dna,
                isOnboarded: state.isOnboarded,
            }), 
        }
    )
)
