'use client'
import { useEffect } from 'react'
import { useRealtimeAlerts, useRealtimeNetWorth } from '@/lib/realtime/subscriptions'
import { useToast } from '@/components/ui/Toast'
import { useFoliaStore } from '@/store'
import { ALERT_PRIORITY_COLORS } from '@/lib/utils'

export function RealtimeManager() {
  const { info, error: toastError } = useToast()
  const setDashboard = useFoliaStore((s) => s.setDashboard)
  const dashboard    = useFoliaStore((s) => s.dashboard)

  useRealtimeAlerts((alert: any) => {
    const color = ALERT_PRIORITY_COLORS[alert.priority] ?? 'var(--t2)'
    info(`${alert.title}: ${alert.message}`)
  })

  useRealtimeNetWorth((snapshot: any) => {
    if (dashboard) {
      setDashboard({ ...dashboard, net_worth: snapshot })
    }
  })

  return null
}
