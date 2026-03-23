'use client'
import { createContext, useContext, useState, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'
interface Toast { id: string; message: string; type: ToastType }
interface ToastCtx { toast: (m: string, t?: ToastType) => void; success: (m: string) => void; error: (m: string) => void; info: (m: string) => void; warning: (m: string) => void }

const Ctx = createContext<ToastCtx>({ toast: () => {}, success: () => {}, error: () => {}, info: () => {}, warning: () => {} })

const STYLES: Record<ToastType, { icon: string; color: string; bg: string; border: string }> = {
  success: { icon: '✓', color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  error:   { icon: '✕', color: 'var(--red)',    bg: 'var(--red-bg)',    border: 'var(--red-border)' },
  warning: { icon: '!', color: 'var(--amber)',  bg: 'var(--amber-bg)', border: 'var(--amber-border)' },
  info:    { icon: 'i', color: 'var(--blue)',   bg: 'var(--blue-bg)',  border: 'var(--blue-border)' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const remove = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t.slice(-4), { id, message, type }])
    setTimeout(() => remove(id), 4200)
  }, [remove])
  const success = useCallback((m: string) => toast(m, 'success'), [toast])
  const error   = useCallback((m: string) => toast(m, 'error'),   [toast])
  const info    = useCallback((m: string) => toast(m, 'info'),    [toast])
  const warning = useCallback((m: string) => toast(m, 'warning'), [toast])

  return (
    <Ctx.Provider value={{ toast, success, error, info, warning }}>
      {children}
      <div style={{ position: 'fixed', bottom: '1.25rem', right: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 300, maxWidth: 340, pointerEvents: 'none' }}>
        {toasts.map((t) => {
          const s = STYLES[t.type]
          return (
            <div key={t.id} onClick={() => remove(t.id)}
              style={{
                background: 'var(--bg-4)',
                border: `1px solid ${s.border}`,
                borderRadius: 'var(--r-lg)',
                padding: '0.75rem 0.875rem',
                display: 'flex', gap: '0.625rem', alignItems: 'flex-start',
                cursor: 'pointer', pointerEvents: 'all',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                animation: 'toastIn 0.2s cubic-bezier(0.16,1,0.3,1)',
              }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                background: s.bg, border: `1px solid ${s.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', fontWeight: 700, color: s.color, marginTop: 1,
              }}>{s.icon}</span>
              <span style={{ fontSize: '0.825rem', color: 'var(--t1)', lineHeight: 1.5 }}>{t.message}</span>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
