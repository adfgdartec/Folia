'use client'
import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: number
  footer?: React.ReactNode
}

export function Modal({ open, onClose, title, children, width = 480, footer }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(5, 8, 12, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.12s ease',
      }}
    >
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--b2)',
          borderRadius: 'var(--r-xl)',
          width: '100%', maxWidth: width,
          maxHeight: '90vh', overflow: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          animation: 'modalIn 0.18s cubic-bezier(0.16,1,0.3,1)',
        }}
        role="dialog" aria-modal="true" aria-labelledby="modal-title"
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 1.375rem',
          borderBottom: '1px solid var(--b1)',
        }}>
          <h2 id="modal-title" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-4)', border: '1px solid var(--b1)',
              borderRadius: 'var(--r-sm)', width: 26, height: 26,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--t3)', fontSize: '0.8rem',
              transition: 'all 0.12s', flexShrink: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--b1)' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '1.375rem' }}>{children}</div>
        {footer && (
          <div style={{
            padding: '1rem 1.375rem',
            borderTop: '1px solid var(--b1)',
            display: 'flex', gap: '0.625rem', justifyContent: 'flex-end',
          }}>
            {footer}
          </div>
        )}
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  )
}

interface ConfirmProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false, loading = false }: ConfirmProps) {
  return (
    <Modal
      open={open} onClose={onClose} title={title} width={400}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ fontSize: '0.875rem', color: 'var(--t2)', lineHeight: 1.65 }}>{message}</p>
    </Modal>
  )
}
