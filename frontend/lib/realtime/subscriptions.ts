'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useFoliaStore } from '@/store'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  || ''
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

let _client: ReturnType<typeof createClient> | null = null

function getClient() {
    if (!_client && supabaseUrl && supabaseKey) {
        _client = createClient(supabaseUrl, supabaseKey)
    }
    return _client
}

export function useRealtimeAlerts(onNewAlert: (alert: unknown ) => void) {
    const userId = useFoliaStore((s) => s.userId)
    const setAlertCount = useFoliaStore((s) => s.setAlertCount)
    const subRef = useRef<unknown>(null)

    useEffect(() => {
        const supabase = getClient()
        if (!supabase || !userId) return

        const channel = supabase
            .channel(`alerts:${userId}`)
            .on(
                'postgres_changes' as any,
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'alerts',
                    filter: `user_id=eq.${userId}`,
                },
                (payload: any) => {
                    onNewAlert(payload.new)
                    setAlertCount((prev: number) => prev + 1)
                }
            )
            .subscribe()
        
        subRef.current = channel
        return () => { supabase.removeChannel(channel)}
    }, [userId])
}

export function useRealtimeNetWorth(onUpdate: (snapshot: unknown ) => void) {
    const userId = useFoliaStore((s) => s.userId)

    useEffect(() => {
        const supabase = getClient()
        if (!supabase || !userId) return
        const channel = supabase
            .channel(`net_worth:${userId}`)
            .on(
                'postgres_changes' as any,
                {
                    event: '*',
                    schema: 'public',
                    table: 'net_worth_snapshots',
                    filter: `user_id=eq.${userId}`,
                },
                (payload: any) => { onUpdate(payload.new) } 
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [userId])
}

export function useRealtimeMessages(sessionId: string | undefined, onMessage: (msg: unknown) => void) {
    useEffect(() => {
        const supabase = getClient()
        if (!supabase || !sessionId) return

        const channel = supabase
            .channel(`messages:${sessionId}`)
            .on(
                'postgres_changes' as any,
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'advisor.messages',
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload: any) => { onMessage(payload.new) }
            )
            .subscribe()
        
        return () => { supabase.removeChannel(channel) }
    }, [sessionId])
}

export function useRealtimeGoals(onUpdate: (goal: unknown) => void) {
    const userId = useFoliaStore((s) => s.userId)

    useEffect(() => {
        const sb = getClient()
        if (!sb || !userId) return

        const channel = sb
            .channel(`goals:${userId}`)
            .on(
                'postgres_changes' as any,
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'goals',
                    filter: `user_id=eq.${userId}`,
                },
            (payload: any) => { onUpdate(payload.new) }
            )
            .subscribe()

        return () => { sb.removeChannel(channel) }
  }, [userId])
}

export function useRealtimeTrades(onTrade: (trade: unknown) => void) {
    const userId = useFoliaStore((s) => s.userId)

    useEffect(() => {
        const sb = getClient()
        if (!sb || !userId) return

        const channel = sb
            .channel(`trades:${userId}`)
            .on(
                'postgres_changes' as any,
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'paper_trades',
                    filter: `user_id=eq.${userId}`,
                },
                (payload: any) => { onTrade(payload.new) }
            )
            .subscribe()

        return () => { sb.removeChannel(channel) }
  }, [userId])
}